#!/usr/bin/env node
// PreToolUse(Read): bloqueia leitura inteira de arquivo grande, para forçar delegação ou leitura de trecho.
// Fora da regra: imagem e PDF (não têm offset/limit) e o próprio explorador, que existe para isso.
// Qualquer falha aqui libera a leitura: o hook nunca atrapalha por erro próprio.

import fs from 'node:fs';
import { desligado } from './ligado.mjs';

const LIMITE = 25 * 1024;
const VISUAL = /\.(png|jpe?g|gif|webp|bmp|pdf)$/i;

try {
  if (desligado('leitura-grande')) process.exit(0);
  const { tool_input: t = {}, agent_type } = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  const inteira = t.offset == null && t.limit == null;
  if (
    inteira &&
    agent_type !== 'explorador' &&
    !VISUAL.test(t.file_path) &&
    fs.statSync(t.file_path).size > LIMITE
  ) {
    process.stderr.write('arquivo grande: delegue ao explorador ou leia só o trecho necessário');
    process.exit(2);
  }
} catch {}
