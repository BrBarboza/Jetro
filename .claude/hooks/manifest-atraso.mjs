#!/usr/bin/env node
// PostToolUse(Read): ao ler o manifest de um projeto, compara o "parou em" com o git dele.
// Atrasado: avisa o modelo com os commits novos. Em dia: silêncio, sem gastar modelo nenhum.
// Compara por dia: commit no mesmo dia do "parou em" não conta como atraso.
// Qualquer falha aqui fica em silêncio: o hook nunca atrapalha por erro próprio.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { desligado } from './ligado.mjs';

const MAX = 15;

try {
  if (desligado('manifest-atraso')) process.exit(0);
  const { tool_input: t = {} } = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  const pasta = String(t.file_path).replace(/\\/g, '/').match(/^(.*\/projects\/[^/]+)\/manifest\.md$/i)?.[1];
  const data = pasta && fs.readFileSync(t.file_path, 'utf8').match(/parou em:\s*(\d{4}-\d{2}-\d{2})/i)?.[1];
  if (data) {
    // "-- ." evita cair no git do OS quando o projeto não tem repo próprio.
    const commits = execFileSync(
      'git',
      ['-C', pasta, 'log', `--after=${data} 23:59:59`, '--pretty=%h %ad %s', '--date=short', '-n', String(MAX), '--', '.'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    if (commits) {
      const aviso = `Manifest atrasado: "parou em" ${data}, mas o git tem commits depois (até ${MAX}):\n${commits}\nChame o atualizador antes de resumir ou retomar este projeto.`;
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: aviso } }));
    }
  }
} catch {}
