#!/usr/bin/env node
// SessionStart: quem mantém uma versão pública do Jetro é avisado quando o mecanismo mudou desde a
// última exportação (assinatura em .publico-sync.json, gravada pelo exportar-template) ou quando o
// repo público tem commit esperando push. Sem estado gravado (não mantém versão pública): silêncio.
// Qualquer falha aqui fica em silêncio: o hook nunca atrapalha por erro próprio.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESTADO, assinatura } from '../scripts/publico-lista.mjs';
import { desligado } from './ligado.mjs';

const RAIZ = process.env.JETRO_RAIZ || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

try {
  if (desligado('publico-atraso')) process.exit(0);
  const estado = JSON.parse(fs.readFileSync(path.join(RAIZ, ESTADO), 'utf8'));
  const agora = assinatura(RAIZ);
  const mudou = [...new Set([...Object.keys(agora), ...Object.keys(estado.arquivos || {})])].filter((f) => agora[f] !== estado.arquivos?.[f]);
  const avisos = [];
  if (mudou.length) {
    avisos.push(`Público atrasado: ${mudou.length} arquivo(s) de mecanismo mudaram desde a última exportação (${mudou.slice(0, 8).join(', ')}${mudou.length > 8 ? ', …' : ''}). Chame o publicador.`);
  }
  const gitDestino = (...a) => {
    try {
      return execFileSync('git', ['-C', path.resolve(RAIZ, estado.destino), ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      return '';
    }
  };
  // Exportou mas o publicador parou antes do commit (teste vermelho, vazamento): a assinatura já está em dia.
  if (!mudou.length && gitDestino('status', '--porcelain', '--untracked-files=no')) {
    avisos.push(`Público com mudança sem commit em ${estado.destino}: o publicador parou no meio. Chame o publicador de novo.`);
  }
  const aFrente = Number(gitDestino('rev-list', '--count', '@{u}..HEAD')) || 0;
  if (aFrente > 0) {
    avisos.push(`Público pronto e aguardando push: ${aFrente} commit(s) em ${estado.destino}. Mostre em 3 a 5 linhas o que sobe e peça OK antes do push.`);
  }
  if (avisos.length) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: avisos.join('\n') } }));
} catch {}
