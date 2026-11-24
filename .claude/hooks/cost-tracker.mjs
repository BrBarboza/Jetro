#!/usr/bin/env node
// SessionEnd: soma o uso de tokens da sessão (com subagentes) e grava o custo em custos.tsv.
// Também registra as chamadas `claude -p` do hook memoria, que rodam na pasta temporária e viram
// transcripts próprios: entram como origem "memoria" na sessão seguinte (os hooks rodam em paralelo).
// Custo = preço de API equivalente (o usuário usa assinatura): serve para comparar, não é cobrança.
// Resumo: node .claude/hooks/cost-tracker.mjs --resumo [dias]
// Origem: ecc @ 4adeee6 — scripts/hooks/cost-tracker.js (adaptado: lê o transcript, inclui cache e memoria).
// Qualquer falha aqui fica em silêncio: o hook nunca atrapalha por erro próprio.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { desligado } from './ligado.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ARQ = process.env.OS_CUSTOS_ARQ || path.join(AQUI, 'custos.tsv');
const TEMP = process.env.OS_CUSTOS_TEMP_DIR
  || path.join(os.homedir(), '.claude', 'projects', os.tmpdir().replace(/[^A-Za-z0-9]/g, '-'));
const CABECALHO = 'data\tsessao\torigem\tmodelos\tentrada\tsaida\tcache_escrita\tcache_leitura\tusd\n';
const MARCA_MEMORIA = 'Você atualiza a memória pessoal do usuário';

// US$ por 1M tokens: [regex do modelo, entrada, saída, leitura de cache]. Escrita de cache: 1,25x (5 min) ou 2x (1 h).
const PRECOS = [
  [/fable-5/, 8, 40, 0.2],
  [/opus-5-5/, 4, 20, 0.2],
  [/opus-(5|4-[5-9])/, 5, 25, 0.5],
  [/opus-4/, 15, 75, 1.5],
  [/sonnet-5-5/, 2, 10, 0.1],
  [/sonnet-5/, 2, 10, 0.2],
  [/sonnet/, 3, 15, 0.3],
  [/haiku-5-5/, 0.1, 0.5, 0.01], // até 100K de prompt; acima: 5x (tratado abaixo)
  [/haiku/, 1, 5, 0.1],
];

export function custoDe(model, u) {
  const p = PRECOS.find(([re]) => re.test(model || '')) || PRECOS[6];
  const c5 = u.cache_creation?.ephemeral_5m_input_tokens ?? (u.cache_creation_input_tokens || 0);
  const c1 = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  const prompt = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
  const k = /haiku-5-5/.test(model) && prompt > 100_000 ? 5 : 1;
  const [, ent, sai, lei] = p.map((v) => (typeof v === 'number' ? v * k : v));
  return ((u.input_tokens || 0) * ent + (u.output_tokens || 0) * sai + c5 * ent * 1.25 + c1 * ent * 2
    + (u.cache_read_input_tokens || 0) * lei) / 1e6;
}

// Soma por arquivo; mesma mensagem aparece em várias linhas (uma por bloco): conta uma vez.
export function somar(arquivos) {
  const vistas = new Map();
  for (const arq of arquivos) {
    for (const l of fs.readFileSync(arq, 'utf8').split('\n')) {
      if (!l.includes('"usage"')) continue;
      try {
        const j = JSON.parse(l);
        if (j.type === 'assistant' && j.message?.usage) vistas.set(j.message.id || `${arq}:${vistas.size}`, j.message);
      } catch {}
    }
  }
  const t = { modelos: new Set(), entrada: 0, saida: 0, escrita: 0, leitura: 0, usd: 0 };
  for (const m of vistas.values()) {
    const u = m.usage;
    if (m.model && m.model !== '<synthetic>') t.modelos.add(m.model.replace(/^claude-/, ''));
    t.entrada += u.input_tokens || 0;
    t.saida += u.output_tokens || 0;
    t.escrita += u.cache_creation_input_tokens || 0;
    t.leitura += u.cache_read_input_tokens || 0;
    t.usd += custoDe(m.model, u);
  }
  return t;
}

const linha = (sessao, origem, t) =>
  [new Date().toISOString().slice(0, 16).replace('T', ' '), sessao, origem, [...t.modelos].join(',') || '-',
    t.entrada, t.saida, t.escrita, t.leitura, t.usd.toFixed(4)].join('\t') + '\n';

function registrar({ session_id, transcript_path }) {
  const ja = fs.existsSync(ARQ) ? fs.readFileSync(ARQ, 'utf8') : CABECALHO;
  let saida = '';
  if (transcript_path && fs.existsSync(transcript_path)) {
    const sub = path.join(path.dirname(transcript_path), path.basename(transcript_path, '.jsonl'), 'subagents');
    const subs = fs.existsSync(sub) ? fs.readdirSync(sub).filter((f) => f.endsWith('.jsonl')).map((f) => path.join(sub, f)) : [];
    saida += linha(session_id || path.basename(transcript_path, '.jsonl'), 'sessao', somar([transcript_path, ...subs]));
  }
  if (fs.existsSync(TEMP)) {
    const semana = Date.now() - 7 * 864e5;
    for (const f of fs.readdirSync(TEMP)) {
      const id = path.basename(f, '.jsonl');
      const arq = path.join(TEMP, f);
      if (!f.endsWith('.jsonl') || ja.includes(`\t${id}\t`) || fs.statSync(arq).mtimeMs < semana) continue;
      if (!fs.readFileSync(arq, 'utf8').slice(0, 4000).includes(MARCA_MEMORIA)) continue;
      saida += linha(id, 'memoria', somar([arq]));
    }
  }
  fs.writeFileSync(ARQ, ja + saida);
}

function resumo(dias) {
  const desde = new Date(Date.now() - dias * 864e5).toISOString().slice(0, 10);
  const linhas = fs.existsSync(ARQ) ? fs.readFileSync(ARQ, 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t')) : [];
  const por = {};
  for (const c of linhas.filter((c) => c[0] >= desde)) por[c[2]] = (por[c[2]] || 0) + Number(c[8]);
  const total = Object.values(por).reduce((a, b) => a + b, 0);
  console.log(`Últimos ${dias} dias (preço de API): US$ ${total.toFixed(2)}`);
  for (const [o, v] of Object.entries(por)) console.log(`  ${o}: US$ ${v.toFixed(2)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--resumo') resumo(Number(process.argv[3]) || 7);
  else {
    try {
      if (!desligado('cost-tracker')) registrar(JSON.parse(fs.readFileSync(0, 'utf8') || '{}'));
    } catch {}
  }
}
