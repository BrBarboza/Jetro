#!/usr/bin/env node
// PreToolUse(Bash|PowerShell): barra git push de mudança grande até o revisor olhar.
// Grande = 150+ linhas somadas contra o upstream, sem lockfile nem arquivo gerado. Push pequeno passa direto.
// Libera quando o revisor terminou nesta sessão, depois do último commit, com o repo citado no prompt.
// Commit e push na mesma linha, se grande, nunca libera: o revisor não viu um commit que ainda não existe.
// Qualquer falha aqui libera o push: o hook nunca atrapalha por erro próprio.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { desligado } from './ligado.mjs';

const LIMITE = 150;
const FORA = [':(exclude,glob)**/*.lock', ':(exclude,glob)**/*-lock.*', ':(exclude,glob)**/*.gen.*'];
const CAMINHO = `("[^"]+"|'[^']+'|[^\\s;&|]+)`;
const OPCOES_GIT = `((?:\\s+-C\\s+${CAMINHO}|\\s+-c\\s+\\S+)*)`;
const SEM_ENVIO_DE_CODIGO = /\s(?:--delete|-d|--tags|--dry-run|-n)(?=\s|$)/;

const subcomando = (nome) => new RegExp(`\\bgit${OPCOES_GIT}\\s+${nome}\\b`);
const tirarAspas = (s) => s.replace(/^["']|["']$/g, '');
const paraWindows = (p) => tirarAspas(p).replace(/^\/([a-z])\//i, '$1:/');
const barrar = (msg) => {
  process.stderr.write(msg);
  process.exit(2);
};

try {
  if (desligado('revisor-push')) process.exit(0);
  const { tool_input: t = {}, cwd, transcript_path } = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  const comando = semTextoLivre(String(t.command));
  const push = comando.match(subcomando('push'));
  const argumentos = push && comando.slice(push.index + push[0].length).split(/[;&|]/)[0];
  if (push && !SEM_ENVIO_DE_CODIGO.test(argumentos)) {
    const repo = repoDoPush(comando.slice(0, push.index), push[1], cwd);
    const git = (...a) => execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const base = baseDoPush(git);
    const comCommit = subcomando('commit').test(comando);
    const linhas = contarLinhas(git, base, comCommit, repo);
    if (linhas >= LIMITE) {
      const pedido = `chame o subagente revisor citando no prompt o repo ${repo} e a base ${base.slice(0, 9)}`;
      if (comCommit) barrar(`push de ${linhas} linhas junto com commit: faça o commit sozinho, ${pedido}, e só então o push`);
      const ultimoCommit = Number(git('log', '-1', '--format=%ct')) * 1000;
      if (!revisado(transcript_path, repo, ultimoCommit)) barrar(`push de ${linhas} linhas: ${pedido}, e repita o push`);
    }
  }
} catch {}

// Mensagem de commit pode falar em "git push" sem ser um push.
function semTextoLivre(c) {
  return c
    .replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\s*\1\b/g, '')
    .replace(/@'[\s\S]*?'@|@"[\s\S]*?"@/g, '')
    .replace(/(?:-m|--message)[= ]\s*("(?:[^"\\]|\\.)*"|'[^']*')/g, '');
}

function repoDoPush(antes, opcoes, cwd) {
  const cds = [...antes.matchAll(new RegExp(`(?:^|[;&|]\\s*)(?:cd|Set-Location)\\s+${CAMINHO}`, 'g'))];
  const cd = cds.length ? paraWindows(cds.at(-1)[1]) : '.';
  const opcaoC = opcoes.match(new RegExp(`-C\\s+${CAMINHO}`));
  return path.resolve(cwd, cd, opcaoC ? paraWindows(opcaoC[1]) : '.');
}

function baseDoPush(git) {
  try {
    return git('merge-base', '@{u}', 'HEAD');
  } catch {
    return git('merge-base', 'origin/HEAD', 'HEAD');
  }
}

// Commit na mesma linha ainda não aconteceu: conta a árvore, inclusive arquivo novo.
function contarLinhas(git, base, comCommit, repo) {
  const alvo = comCommit ? [base] : [base, 'HEAD'];
  let soma = git('diff', '--numstat', ...alvo, '--', ...FORA)
    .split('\n')
    .reduce((total, l) => total + (parseInt(l, 10) || 0) + (parseInt(l.split('\t')[1], 10) || 0), 0);
  if (comCommit) {
    for (const arquivo of git('ls-files', '-z', '-o', '--exclude-standard', '--', ...FORA).split('\0').filter(Boolean)) {
      const conteudo = fs.readFileSync(path.join(repo, arquivo));
      if (!conteudo.includes(0)) soma += conteudo.toString().split('\n').length - 1;
    }
  }
  return soma;
}

// Em segundo plano o Agent devolve "async_launched" na hora: terminou só quando chega o aviso de conclusão.
function revisado(transcript, repo, desde) {
  const nome = path.basename(repo).toLowerCase();
  const chamadas = new Set();
  for (const linha of fs.readFileSync(transcript, 'utf8').split('\n')) {
    const daChamada = [...chamadas].some((id) => linha.includes(id));
    if (!daChamada && !linha.includes('"revisor"')) continue;
    let e;
    try {
      e = JSON.parse(linha);
    } catch {
      continue; // última linha ainda sendo escrita
    }
    if (daChamada && e.type !== 'assistant' && linha.includes('<status>completed</status>')) return true;
    for (const b of Array.isArray(e.message?.content) ? e.message.content : []) {
      const ehRevisor = b.type === 'tool_use' && b.input?.subagent_type === 'revisor';
      if (ehRevisor && Date.parse(e.timestamp) >= desde && String(b.input.prompt).toLowerCase().includes(nome)) chamadas.add(b.id);
      if (b.type === 'tool_result' && !b.is_error && chamadas.has(b.tool_use_id) && e.toolUseResult?.status !== 'async_launched') return true;
    }
  }
  return false;
}
