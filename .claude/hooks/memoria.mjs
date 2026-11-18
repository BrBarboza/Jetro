#!/usr/bin/env node
// Hook de memória do Knowledge OS — eventos SessionEnd e PreCompact do Claude Code.
//
// Modo hook (padrão): lê o JSON do stdin, dispara um worker desacoplado e sai na hora
//   (o Claude Code pode encerrar o processo antes de um hook lento terminar).
// Modo worker (--worker <job>): filtra o transcript, pergunta ao Haiku o que gravar e grava em
//   eu/novos.md, "## Onde paramos" do manifest do projeto e inbox/.
//   Depois faz commit e push do OS, se a raiz tiver git.
// Nunca escreve em skill nem em código de projeto (do projeto, só o "## Onde paramos").
// O que se repete 2x na fila (eu/novos.md) é promovido sozinho para eu/perfil.md ou eu/preferencias.md,
// sem modelo decidindo o texto. Preferência que cita um projeto fica na fila, marcada, para o modelo
// principal mover. "Padrão?" repetido soma (Nx) na entrada existente da inbox.
// Depois de gravar, mede a carga fixa e os manifests e marca no topo de eu/novos.md o que passou do teto.

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { acharSegredos } from './segredos.mjs';

const ROOT = process.env.OS_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HOOKS = path.join(ROOT, '.claude', 'hooks');
const STATE = path.join(HOOKS, '.memoria-state.json');
const LOCK = path.join(HOOKS, '.memoria.lock');
const LOG = path.join(HOOKS, 'memoria.log');
const CLAUDE_CMD =
  process.env.OS_MEMORIA_CMD || 'claude -p --model haiku "Siga as instruções do texto recebido."';
const MAX_CHARS = 60000; // teto do texto da sessão enviado ao Haiku
const MIN_FALAS = 3; // sessão nova com menos falas do usuário que isso não vale a chamada

const INSTRUCOES = `Você atualiza a memória pessoal do usuário a partir de uma sessão de trabalho dele com uma IA.
Responda SOMENTE com um objeto JSON válido, sem texto antes ou depois e sem usar ferramentas:
{
  "projeto": "nome exato de um projeto existente, ou null",
  "fatos": ["fato que o usuário declarou sobre si, a vida, a situação, metas ou pessoas próximas"],
  "preferencias": ["como o usuário disse que quer ser atendido ou que a IA trabalhe com ele"],
  "onde_paramos": {"tarefa": "...", "branch": "... ou não registrado", "resumo": "próximo passo em uma frase"},
  "padroes": ["correção ou preferência de trabalho que o usuário repetiu 2+ vezes nesta sessão, ou que já está em PADRÕES PENDENTES e ele repetiu agora"]
}
Regras:
- Só o que o USUARIO disse. Nada que a IA sugeriu, nada deduzido.
- Detalhe técnico de projeto (código, bug, decisão de arquitetura) não é fato nem preferência: fica fora.
- Ignore o que já está no perfil ou nas preferências.
- Se o usuário voltou a dizer algo que já está na fila, inclua com o texto EXATO da linha da fila, sem o prefixo, sem "(Nx)" e sem "[→ projeto: …]".
- Se o usuário voltou a dizer algo que já está em PADRÕES PENDENTES, inclua em "padroes" com o texto EXATO da linha pendente, sem "(Nx)".
- Nunca inclua senha, chave, token, número de documento ou de conta, nem dado de saúde.
- "onde_paramos" = null se a sessão não trabalhou em projeto. Listas vazias quando não houver nada.
- Frases curtas, em português.`;

if (process.env.OS_MEMORIA_CHILD) process.exit(0); // a sessão do próprio Haiku não reentra

const norm = (p) => path.resolve(p).replace(/\\/g, '/').toLowerCase();
const dentroDe = (p, base) => norm(p) === norm(base) || norm(p).startsWith(norm(base) + '/');
const agora = () => new Date().toLocaleString('sv-SE').slice(0, 16); // "2026-10-28 17:40", fuso local
const ler = (p, padrao = '') => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : padrao);
const log = (msg) => fs.appendFileSync(LOG, `${agora()} ${msg}\n`);
const dormir = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function hook() {
  const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  if (!input.transcript_path || !input.cwd || !dentroDe(input.cwd, ROOT)) return;
  log(`${input.hook_event_name}${input.trigger ? `:${input.trigger}` : ''} sessão ${String(input.session_id).slice(0, 8)}`);
  const job = path.join(os.tmpdir(), `os-memoria-${process.pid}-${Date.now()}.json`);
  fs.writeFileSync(job, JSON.stringify(input));
  spawn(process.execPath, [fileURLToPath(import.meta.url), '--worker', job], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  }).unref();
}

function worker(job) {
  if (!travar()) {
    log('lock ocupado por mais de 3 min; evento ignorado');
    fs.rmSync(job, { force: true });
    return;
  }
  try {
    executar(JSON.parse(fs.readFileSync(job, 'utf8')));
  } catch (e) {
    log(`erro: ${e.stack || e}`);
  } finally {
    fs.rmSync(LOCK, { force: true });
    fs.rmSync(job, { force: true });
  }
}

// PreCompact e SessionEnd podem chegar quase juntos: um espera o outro.
function travar() {
  for (let i = 0; i < 180; i++) {
    try {
      fs.writeFileSync(LOCK, String(process.pid), { flag: 'wx' });
      return true;
    } catch {
      try {
        if (Date.now() - fs.statSync(LOCK).mtimeMs > 10 * 60000) fs.rmSync(LOCK, { force: true });
      } catch {}
      dormir(1000);
    }
  }
  return false;
}

function executar({ session_id, transcript_path, cwd }) {
  const estado = JSON.parse(ler(STATE, '{}'));
  const linhas = ler(transcript_path).split('\n').filter(Boolean);
  const inicio = estado[session_id] || 0;
  const falas = linhas.slice(inicio).map(fala).filter(Boolean);
  const doUsuario = falas.filter((f) => f.startsWith('USUARIO:')).length;

  if (doUsuario >= (inicio ? 1 : MIN_FALAS)) {
    const projetos = listarProjetos();
    const pelaPasta = projetoDaPasta(cwd, projetos);
    const r = perguntar(falas, projetos, pelaPasta);
    if (!r) return; // falhou: não avança o estado, tenta de novo no próximo evento
    const projeto = pelaPasta || (projetos.includes(r.projeto) ? r.projeto : null);
    gravar(r, projeto, session_id);
  }
  estado[session_id] = linhas.length;
  fs.writeFileSync(STATE, JSON.stringify(Object.fromEntries(Object.entries(estado).slice(-50))));
  try {
    marcarTetos();
  } catch (e) {
    log(`tetos: ${e.stack || e}`);
  }
  versionar();
}

// Só o texto da conversa: sem resultado de ferramenta, lembrete de sistema ou subagente.
function fala(linha) {
  let e;
  try {
    e = JSON.parse(linha);
  } catch {
    return null;
  }
  if (e.isMeta || e.isSidechain || e.isCompactSummary || (e.type !== 'user' && e.type !== 'assistant')) return null;
  const c = e.message?.content;
  const partes =
    typeof c === 'string' ? [c] : (c || []).filter((p) => p.type === 'text').map((p) => p.text);
  const texto = partes.join('\n').trim();
  if (!texto || texto.startsWith('<')) return null;
  return e.type === 'user' ? `USUARIO: ${texto.slice(0, 4000)}` : `IA: ${texto.slice(0, 1500)}`;
}

function listarProjetos() {
  const base = path.join(ROOT, 'projects');
  return fs.readdirSync(base).filter((d) => fs.existsSync(path.join(base, d, 'manifest.md')));
}

function projetoDaPasta(cwd, projetos) {
  const base = path.join(ROOT, 'projects');
  if (!dentroDe(cwd, base)) return null;
  const primeiro = norm(cwd).slice(norm(base).length + 1).split('/')[0];
  return projetos.find((p) => p.toLowerCase() === primeiro) || null;
}

function perguntar(falas, projetos, pelaPasta) {
  let sessao = falas.join('\n\n');
  if (sessao.length > MAX_CHARS) sessao = '[início cortado]\n' + sessao.slice(-MAX_CHARS);
  const prompt = `${INSTRUCOES}

Projetos existentes: ${projetos.join(', ')}
Projeto pela pasta da sessão: ${pelaPasta || 'nenhum — deduza pela conversa ou use null'}

=== PERFIL ATUAL ===
${ler(path.join(ROOT, 'eu', 'perfil.md'))}
=== PREFERÊNCIAS ATUAIS ===
${ler(path.join(ROOT, 'eu', 'preferencias.md'))}
=== FILA AINDA NÃO PROMOVIDA ===
${ler(path.join(ROOT, 'eu', 'novos.md'))}
=== PADRÕES PENDENTES (inbox) ===
${padroesPendentes().join('\n') || '(nenhum)'}
=== SESSÃO ===
${sessao}`;
  const r = spawnSync(CLAUDE_CMD, {
    shell: true,
    input: prompt,
    encoding: 'utf8',
    timeout: 180000,
    maxBuffer: 10 * 1024 * 1024,
    cwd: os.tmpdir(),
    windowsHide: true,
    env: { ...process.env, OS_MEMORIA_CHILD: '1' },
  });
  if (r.status !== 0) {
    log(`claude falhou (${r.status}): ${String(r.stderr || r.error || '').slice(0, 500).replace(/\s+/g, ' ')}`);
    return null;
  }
  try {
    return JSON.parse(r.stdout.match(/\{[\s\S]*\}/)[0]);
  } catch {
    log(`resposta não é JSON: ${r.stdout.slice(0, 300).replace(/\s+/g, ' ')}`);
    return null;
  }
}

function gravar(r, projeto, sessao) {
  const quando = agora();
  const etiqueta = `${quando} — sessão ${String(sessao).slice(0, 8)}${projeto ? ` [${projeto}]` : ''}`;
  const itens = [
    ...(r.fatos || []).map((f) => `- fato: ${f}`),
    ...(r.preferencias || []).map((p) => `- preferência: ${p}`),
  ];
  const novos = atualizarFila(itens);
  if (novos.length) {
    fs.appendFileSync(path.join(ROOT, 'eu', 'novos.md'), `\n## ${etiqueta}\n${novos.join('\n')}\n`);
  }

  const o = r.onde_paramos;
  if (projeto && o?.tarefa) {
    escreverOndeParamos(
      path.join(ROOT, 'projects', projeto, 'manifest.md'),
      `## Onde paramos\n\n- tarefa: ${o.tarefa}\n- branch: ${o.branch || 'não registrado'}\n` +
        `- parou em: ${quando.slice(0, 10)}\n- resumo: ${o.resumo || '—'}\n`,
    );
  }

  if (r.padroes?.length) somarPadroes(r.padroes, quando, projeto);
  log(`ok ${etiqueta}: ${itens.length} fato(s)/preferência(s), ${r.padroes?.length || 0} padrão(ões)`);
}

// ---- Fila (eu/novos.md): contagem e promoção automática ----
const LINHA_FILA = /^- (fato|preferência): (.*?)(?: \((\d+)x\))?(?: \[→ projeto: ([^\]]*)\])?\s*$/;
const chave = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const formatar = (tipo, texto, n, marca) =>
  `- ${tipo}: ${texto}${n > 1 ? ` (${n}x)` : ''}${marca ? ` [→ projeto: ${marca}]` : ''}`;
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');

// Projeto citado pelo nome no texto (palavra inteira), ou null.
function citaProjeto(texto) {
  return (
    listarProjetos().find((p) =>
      new RegExp(`(^|[^\\p{L}\\p{N}])${escapar(p)}($|[^\\p{L}\\p{N}])`, 'iu').test(texto),
    ) || null
  );
}

// Item que já está na fila não vira linha nova: a linha existente ganha contagem (2x, 3x).
// Quem chega a 2x sai da fila: fato vai para eu/perfil.md, preferência para eu/preferencias.md, com o texto como está.
// Preferência que cita um projeto fica na fila, marcada, para o modelo principal mover.
// Devolve só os itens que ainda não estavam lá.
function atualizarFila(itens) {
  const arquivo = path.join(ROOT, 'eu', 'novos.md');
  let linhas = ler(arquivo).split('\n');
  const novos = [];
  for (const item of itens) {
    const n = item.replace(/\s+/g, ' ').match(LINHA_FILA);
    if (!n) continue;
    if (novos.some((x) => chave(x) === chave(formatar(n[1], n[2], 1)))) continue;
    const i = linhas.findIndex((l) => {
      const m = l.match(LINHA_FILA);
      return m && chave(m[2]) === chave(n[2]);
    });
    if (i < 0) {
      novos.push(formatar(n[1], n[2], 1));
      continue;
    }
    const m = linhas[i].match(LINHA_FILA);
    linhas[i] = formatar(m[1], m[2], Number(m[3] || 1) + 1, m[4]);
  }
  linhas = linhas.filter((l) => {
    const m = l.match(LINHA_FILA);
    if (!m || Number(m[3] || 1) < 2) return true;
    if (m[1] === 'preferência' && citaProjeto(m[2])) return true; // fica marcada
    promover(m[1], m[2]);
    return false;
  });
  linhas = linhas.map((l) => {
    const m = l.match(LINHA_FILA);
    if (!m || Number(m[3] || 1) < 2) return l;
    return formatar(m[1], m[2], Number(m[3]), citaProjeto(m[2]));
  });
  linhas = tirarBlocosVazios(linhas);
  const temItem = linhas.some((l) => LINHA_FILA.test(l)) || novos.length;
  linhas = linhas.filter((l) => l.trim() !== '(fila vazia)');
  if (!temItem) linhas.push('(fila vazia)', '');
  fs.writeFileSync(arquivo, linhas.join('\n'));
  return novos;
}

function tirarBlocosVazios(linhas) {
  const saida = [];
  for (let i = 0; i < linhas.length; i++) {
    if (linhas[i].startsWith('## ')) {
      let j = i + 1;
      while (j < linhas.length && !linhas[j].startsWith('## ')) j++;
      if (!linhas.slice(i + 1, j).some((l) => l.startsWith('- '))) {
        i = j - 1;
        continue;
      }
    }
    saida.push(linhas[i]);
  }
  return saida.join('\n').replace(/\n{3,}/g, '\n\n').split('\n');
}

function promover(tipo, texto) {
  const arquivo = path.join(ROOT, 'eu', tipo === 'fato' ? 'perfil.md' : 'preferencias.md');
  const linhas = ler(arquivo).split('\n');
  const linha = `- ${texto}`;
  if (linhas.some((l) => chave(l) === chave(linha))) return;
  let pos;
  if (tipo === 'fato') {
    pos = linhas.map((l) => l.startsWith('- ')).lastIndexOf(true) + 1;
  } else {
    const ini = linhas.findIndex((l) => l.startsWith('## Trabalho'));
    if (ini < 0) pos = linhas.length;
    else {
      let j = ini + 1;
      while (j < linhas.length && !linhas[j].startsWith('## ')) j++;
      while (j > ini + 1 && !linhas[j - 1].trim()) j--;
      pos = j;
    }
  }
  if (!pos) pos = linhas.length;
  linhas.splice(pos, 0, linha);
  fs.writeFileSync(arquivo, linhas.join('\n'));
  log(`promovido para ${tipo === 'fato' ? 'perfil' : 'preferencias'}: ${texto.slice(0, 80)}`);
}

// ---- Padrões na inbox: a mesma frase em outra sessão soma (Nx) na entrada existente ----
const ENTRADA_PADRAO = /^## \d\d:\d\d — Padrão\?/;
const TEXTO_PADRAO = /^(.*?)(?: \((\d+)x\))?\s*$/;

function arquivosInbox() {
  const dir = path.join(ROOT, 'inbox');
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => n.endsWith('.md')).map((n) => path.join(dir, n)) : [];
}

function textoDaEntrada(linhas, i) {
  let j = i + 1;
  while (j < linhas.length && !linhas[j].trim()) j++;
  return j < linhas.length && !linhas[j].startsWith('## ') ? j : -1;
}

function padroesPendentes() {
  const saida = [];
  for (const arq of arquivosInbox()) {
    const ls = ler(arq).split('\n');
    ls.forEach((l, i) => {
      if (!ENTRADA_PADRAO.test(l)) return;
      const j = textoDaEntrada(ls, i);
      if (j >= 0) saida.push(`- ${ls[j].match(TEXTO_PADRAO)[1]}`);
    });
  }
  return saida;
}

function somarPadroes(padroes, quando, projeto) {
  const vistos = new Set();
  const novos = [];
  for (const p of padroes) {
    const base = String(p).replace(/\s+/g, ' ').trim().match(TEXTO_PADRAO)[1];
    if (!base || vistos.has(chave(base))) continue;
    vistos.add(chave(base));
    let achou = false;
    for (const arq of arquivosInbox()) {
      const ls = ler(arq).split('\n');
      for (let i = 0; i < ls.length && !achou; i++) {
        if (!ENTRADA_PADRAO.test(ls[i])) continue;
        const j = textoDaEntrada(ls, i);
        if (j < 0) continue;
        const m = ls[j].match(TEXTO_PADRAO);
        if (chave(m[1]) !== chave(base)) continue;
        ls[j] = `${m[1]} (${Number(m[2] || 1) + 1}x)`;
        fs.writeFileSync(arq, ls.join('\n'));
        achou = true;
      }
      if (achou) break;
    }
    if (!achou) novos.push(base);
  }
  if (!novos.length) return;
  const inbox = path.join(ROOT, 'inbox', `${quando.slice(0, 10)}.md`);
  fs.mkdirSync(path.dirname(inbox), { recursive: true });
  fs.appendFileSync(inbox, novos.map((p) => `\n## ${quando.slice(11)} — Padrão? [${projeto || 'geral'}]\n${p}\n`).join(''));
}

// ---- Tetos: o hook só mede e marca; condensar é do modelo principal ----
const KB = 1024;
const TETOS = { preferencias: 3 * KB, perfil: 2 * KB, manifest: 3.5 * KB, carga: 13 * KB };
const MARCA_TETO = 'condensar antes de começar: ';

function marcarTetos() {
  const arquivo = path.join(ROOT, 'eu', 'novos.md');
  const todas = ler(arquivo).split('\n');
  const limpas = todas.filter((l) => !l.startsWith(MARCA_TETO));
  const bytes = (p) => (fs.existsSync(p) ? fs.statSync(p).size : 0);
  const pref = bytes(path.join(ROOT, 'eu', 'preferencias.md'));
  const perfil = bytes(path.join(ROOT, 'eu', 'perfil.md'));
  const carga = bytes(path.join(ROOT, 'CLAUDE.md')) + perfil + pref + Buffer.byteLength(limpas.join('\n'));
  const medidas = [
    ['carga-fixa', carga, TETOS.carga],
    ['eu/preferencias.md', pref, TETOS.preferencias],
    ['eu/perfil.md', perfil, TETOS.perfil],
    ...listarProjetos().map((p) => [`projects/${p}/manifest.md`, bytes(path.join(ROOT, 'projects', p, 'manifest.md')), TETOS.manifest]),
  ];
  const marcas = medidas
    .filter(([, tam, teto]) => tam > teto)
    .map(([nome, tam, teto]) => `${MARCA_TETO}${nome} ${tam}/${Math.round(teto)} B`);
  const topo = limpas.findIndex((l) => l.startsWith('# '));
  const saida = [...limpas];
  saida.splice(topo + 1, 0, ...marcas);
  if (saida.join('\n') !== todas.join('\n')) fs.writeFileSync(arquivo, saida.join('\n'));
}

function escreverOndeParamos(manifest, bloco) {
  const original = ler(manifest);
  if (!original) return;
  const crlf = original.includes('\r\n');
  let s = original.replace(/\r\n/g, '\n');
  const secao = /## Onde paramos\n[\s\S]*?(?=\n## |$)/;
  if (secao.test(s)) s = s.replace(secao, () => bloco);
  else if (s.includes('\n## Última revisão')) s = s.replace('\n## Última revisão', () => `\n${bloco}\n## Última revisão`);
  else s = `${s.trimEnd()}\n\n${bloco}`;
  fs.writeFileSync(manifest, crlf ? s.replace(/\n/g, '\r\n') : s);
}

function versionar() {
  if (!fs.existsSync(path.join(ROOT, '.git'))) return;
  if (!fs.existsSync(path.join(HOOKS, 'auto-git'))) return; // commit/push automático é opt-in
  // Sem terminal: login vencido falha e vai para o log, em vez de ficar esperando senha.
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' };
  const git = (...args) =>
    spawnSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', windowsHide: true, env, timeout: 5 * 60000, maxBuffer: 256 * 1024 * 1024 });
  git('add', '-A');
  incluirManifests(git);
  // O que vai subir = índice contra o upstream: pega o staged e também commit manual ainda não enviado.
  const upstream = git('rev-parse', '--verify', '-q', '@{u}').status === 0 ? '@{u}' : 'HEAD';
  const diff = git('-c', 'core.quotepath=off', 'diff', '--cached', '--no-color', '--no-ext-diff', '-U0', upstream, '--');
  const achados = acharSegredos(diff.stdout ?? '');
  if (achados.length) {
    git('reset', '-q'); // nada novo vira commit; o aviso se repete a cada evento até sair do arquivo
    log(`push travado, possível segredo (linha com "segredo-ok" é ignorada): ${achados.slice(0, 10).join(' | ')}`);
    return;
  }
  if (git('diff', '--cached', '--quiet').status === 1) {
    const c = git('commit', '-m', `auto: fim de sessão ${agora()}`);
    if (c.status) log(`git commit falhou: ${c.stderr.slice(0, 300)}`);
  }
  const p = git('push'); // também sobe o commit que ficou para trás numa queda de internet
  if (p.status !== 0) log(`git push falhou: ${String(p.stderr || p.error).slice(0, 300)}`);
}

// Manifest de projeto com .git próprio não entra por git add: só por update-index, e dali em diante o add -A acompanha.
function incluirManifests(git) {
  for (const nome of listarProjetos()) {
    const arquivo = `projects/${nome}/manifest.md`;
    const h = git('hash-object', '-w', `--path=${arquivo}`, arquivo).stdout.trim();
    if (h) git('update-index', '--add', '--cacheinfo', `100644,${h},${arquivo}`);
  }
}

// Despacho no fim: as constantes do módulo precisam existir antes de rodar.
if (process.argv[2] === '--worker') worker(process.argv[3]);
else hook();
