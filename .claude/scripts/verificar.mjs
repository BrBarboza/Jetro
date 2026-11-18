#!/usr/bin/env node
// Roda as verificações de um projeto e devolve só as falhas, sem modelo resumindo erro.
// Uso: node verificar.mjs <pasta> [script...]
// Sem script: typecheck, lint, build e test que existirem no package.json. E2E só pedindo pelo nome.
// typecheck sem script próprio, em projeto com tsconfig.json, vira tsc.
// Exit: 0 tudo verde, 1 alguma falha, 2 nada para verificar.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PADRAO = ['typecheck', 'lint', 'build', 'test'];
const TRAVAS = [['bun.lock', 'bun'], ['bun.lockb', 'bun'], ['pnpm-lock.yaml', 'pnpm'], ['yarn.lock', 'yarn']];
const EXECUTOR = { bun: 'bunx', npm: 'npx', pnpm: 'pnpm exec', yarn: 'yarn' };
const LINHA_DE_ERRO = /error|fail|✗|✕|×|expected|received|exception|cannot find|not found/i;
const CAMINHO_SOZINHO = /^\s*(?:[A-Za-z]:)?[\w\\/.@-]+\.\w{1,5}\s*$/; // cabeçalho de arquivo do eslint
const MAX_LINHAS = 40;
const LIMITE_MS = 10 * 60000;

const [pasta = '.', ...pedidos] = process.argv.slice(2);
const manifesto = path.join(pasta, 'package.json');
if (!fs.existsSync(manifesto)) sair(`⚠️ sem package.json em ${pasta}: nada verificado`);

const existentes = JSON.parse(fs.readFileSync(manifesto, 'utf8')).scripts || {};
const tsconfig = path.join(pasta, 'tsconfig.json');
const tscProprio = !existentes.typecheck && fs.existsSync(tsconfig);
const scripts = pedidos.length ? pedidos : PADRAO.filter((s) => existentes[s] || (s === 'typecheck' && tscProprio));
if (!scripts.length) sair(`⚠️ nenhum de ${PADRAO.join(', ')} no package.json de ${pasta}: nada verificado`);

const pm = TRAVAS.find(([arquivo]) => fs.existsSync(path.join(pasta, arquivo)))?.[1] ?? 'npm';
let falhou = false;
for (const s of scripts) {
  const inicio = Date.now();
  const r = spawnSync(s === 'typecheck' && tscProprio ? comandoTsc() : `${pm} run ${s}`, {
    cwd: pasta,
    shell: true,
    encoding: 'utf8',
    timeout: LIMITE_MS,
    maxBuffer: 100 * 1024 * 1024,
    windowsHide: true,
    env: { ...process.env, CI: '1', NO_COLOR: '1', FORCE_COLOR: '0' }, // CI: teste não fica em modo watch
  });
  const tempo = `${Math.round((Date.now() - inicio) / 1000)}s`;
  if (r.status === 0) {
    console.log(`✅ ${s} (${tempo})`);
    continue;
  }
  falhou = true;
  console.log(`❌ ${s} (${tempo})${r.error?.code === 'ETIMEDOUT' ? ': estourou o limite de 10 min' : ''}`);
  const saida = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
  const log = path.join(os.tmpdir(), `verificar-${path.basename(path.resolve(pasta))}-${s.replace(/\W/g, '-')}.log`);
  fs.writeFileSync(log, saida);
  const trecho = erros(saida);
  for (const l of trecho.linhas) console.log(`  ${l.trim().slice(0, 300)}`);
  if (trecho.cortadas) console.log(`  (+${trecho.cortadas} linhas de erro)`);
  console.log(`  log completo: ${log}`);
}
process.exit(falhou ? 1 : 0);

function erros(saida) {
  const linhas = saida.split(/\r?\n/).filter((l) => l.trim() && !/^\s*[>$] /.test(l)); // sem o eco do gerenciador
  const achadas = linhas.filter((l) => LINHA_DE_ERRO.test(l) || CAMINHO_SOZINHO.test(l));
  const base = achadas.length >= 3 ? achadas : [...new Set([...achadas, ...linhas.slice(-20)])];
  return { linhas: base.slice(0, MAX_LINHAS), cortadas: Math.max(0, base.length - MAX_LINHAS) };
}

// Com "references" (modelo do Vite), tsc --noEmit na raiz não checa nada e sai verde.
function comandoTsc() {
  const comReferencias = /"references"\s*:/.test(fs.readFileSync(tsconfig, 'utf8'));
  return `${EXECUTOR[pm]} tsc ${comReferencias ? '-b ' : ''}--noEmit`;
}

function sair(msg) {
  console.log(msg);
  process.exit(2);
}
