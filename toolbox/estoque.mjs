#!/usr/bin/env node
// Clona ou atualiza as fontes listadas na tabela "Almoxarifados" do toolbox/README.md.
// Uso: node toolbox/estoque.mjs [nome...]   (sem nome: todas)
// Clone leve (depth 1) e sem os arquivos que o Claude Code carregaria sozinho
// (CLAUDE.md, AGENTS.md, .claude/) — o estoque nunca entra no contexto por acidente.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ESTOQUE = path.join(DIR, 'estoque');
const EXCLUIR = ['/*', '!/CLAUDE.md', '!/AGENTS.md', '!/.claude/', '!**/CLAUDE.md', '!**/AGENTS.md'];

export function lerFontes(readme) {
  const sec = readme.split(/^## /m).find((s) => s.startsWith('Almoxarifados')) || '';
  return sec.split('\n')
    .map((l) => l.split('|').map((c) => c.trim()))
    .filter((c) => c.length > 3 && /^https?:\/\//.test(c[2]))
    .map((c) => ({ nome: c[1].replace(/`/g, ''), url: c[2] }));
}

function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${(r.stderr || '').trim()}`);
  return r.stdout.trim();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const fontes = lerFontes(fs.readFileSync(path.join(DIR, 'README.md'), 'utf8'));
  const pedidas = process.argv.slice(2);
  fs.mkdirSync(ESTOQUE, { recursive: true });
  for (const f of fontes.filter((f) => !pedidas.length || pedidas.includes(f.nome))) {
    const alvo = path.join(ESTOQUE, f.nome);
    try {
      if (!fs.existsSync(alvo)) {
        git(['clone', '--depth', '1', '--single-branch', '--no-checkout', f.url, alvo], ESTOQUE);
        git(['sparse-checkout', 'init', '--no-cone'], alvo);
      } else {
        git(['fetch', '--depth', '1', 'origin'], alvo);
      }
      fs.writeFileSync(path.join(alvo, '.git', 'info', 'sparse-checkout'), EXCLUIR.join('\n') + '\n');
      git(['checkout', '-B', 'estoque', fs.existsSync(path.join(alvo, '.git', 'FETCH_HEAD')) ? 'FETCH_HEAD' : 'HEAD'], alvo);
      git(['sparse-checkout', 'reapply'], alvo);
      console.log(`${f.nome}: ${git(['log', '-1', '--format=%h %cs'], alvo)}`);
    } catch (e) {
      console.log(`${f.nome}: FALHOU — ${e.message}`);
    }
  }
  const nomes = new Set(fontes.map((f) => f.nome));
  for (const d of fs.readdirSync(ESTOQUE)) if (!nomes.has(d)) console.log(`${d}: fora do README (apagar a pasta só com ok do usuário)`);
}
