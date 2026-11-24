#!/usr/bin/env node
// PostToolUse(Edit|Write|MultiEdit|Bash|PowerShell): com o contexto passando de ~120k tokens, sugere
// /compact no fim da etapa atual, antes de o auto-compact (180k) cortar no meio de um passo.
// Avisa de novo a cada +30k; depois de compactar (contexto caiu), volta a valer do zero.
// Contexto = entrada + cache da última resposta do modelo principal, lida do fim do transcript.
// Origem: ecc @ 4adeee6 — scripts/hooks/suggest-compact.js (adaptado: só o sinal de tokens, sem contagem de chamadas).
// Qualquer falha aqui fica em silêncio: o hook nunca atrapalha por erro próprio.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { desligado } from './ligado.mjs';

const LIMIAR = Number(process.env.JETRO_COMPACT_LIMIAR) || 120_000;
const PASSO = 30_000;
const CAUDA = 512 * 1024;

export function contextoAtual(transcript) {
  const fd = fs.openSync(transcript, 'r');
  const tam = fs.fstatSync(fd).size;
  const buf = Buffer.alloc(Math.min(CAUDA, tam));
  fs.readSync(fd, buf, 0, buf.length, tam - buf.length);
  fs.closeSync(fd);
  const linhas = buf.toString('utf8').split('\n').reverse();
  for (const l of linhas) {
    if (!l.includes('"usage"')) continue;
    try {
      const j = JSON.parse(l);
      if (j.type !== 'assistant' || j.isSidechain || !j.message?.usage) continue;
      const u = j.message.usage;
      return (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
    } catch {}
  }
  return 0;
}

try {
  if (desligado('suggest-compact')) process.exit(0);
  const { session_id = 'x', transcript_path, hook_event_name = 'PostToolUse' } = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  const ctx = transcript_path ? contextoAtual(transcript_path) : 0;
  const estado = path.join(os.tmpdir(), `jetro-compact-${String(session_id).replace(/\W/g, '')}.json`);
  let ultimo = fs.existsSync(estado) ? JSON.parse(fs.readFileSync(estado, 'utf8')).ultimo || 0 : 0;
  if (ctx < ultimo - PASSO) ultimo = 0; // compactou
  if (ctx >= LIMIAR && (!ultimo || ctx >= ultimo + PASSO)) {
    ultimo = ctx;
    const k = Math.round(ctx / 1000);
    process.stdout.write(JSON.stringify({
      systemMessage: `Contexto em ~${k}k tokens: bom momento para /compact quando esta etapa terminar.`,
      hookSpecificOutput: {
        hookEventName: hook_event_name,
        additionalContext: `Contexto em ~${k}k tokens (auto-compact em ~180k). Não pare no meio: ao terminar a etapa atual, sugira ao usuário rodar /compact, em uma linha, dizendo o que deve ser preservado.`,
      },
    }));
  }
  fs.writeFileSync(estado, JSON.stringify({ ultimo }));
} catch {}
