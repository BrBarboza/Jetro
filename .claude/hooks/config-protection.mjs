#!/usr/bin/env node
// PreToolUse(Edit|Write|MultiEdit): barra afrouxar a régua para passar no verificar.mjs.
// Config de lint/formatador existente: qualquer edição barra (criar arquivo novo passa).
// tsconfig: barra só quando a mudança afrouxa (flag de rigor virando false ou "strict": true sumindo).
// Origem: ecc @ 4adeee6 — scripts/hooks/config-protection.js (adaptado: tsconfig incluído, mensagem em pt-BR).
// Qualquer falha aqui libera a edição: o hook nunca atrapalha por erro próprio.

import fs from 'node:fs';
import path from 'node:path';
import { desligado } from './ligado.mjs';

const LINT = [
  /^\.(eslint|prettier|stylelint|markdownlint)rc(\.[\w-]+)*$/i,
  /^(eslint|prettier|stylelint|commitlint|oxlint)\.config(\.[\w-]+)*\.(js|mjs|cjs|ts|mts|cts)$/i,
  /^\.?biome\.jsonc?$/i,
  /^\.?ruff\.toml$/i,
  /^\.shellcheckrc$/i,
  /^\.markdownlint(-cli2)?\.(json|jsonc|ya?ml|cjs|mjs)$/i,
  /^\.(eslint|prettier|stylelint|markdownlint)ignore$/i,
];
const TSCONFIG = /^tsconfig(\.[\w-]+)*\.json$/i;
const RIGOR = 'strict|noImplicitAny|strictNullChecks|strictFunctionTypes|strictBindCallApply|strictPropertyInitialization|noImplicitThis|alwaysStrict|noUnusedLocals|noUnusedParameters|noImplicitReturns|noFallthroughCasesInSwitch|noUncheckedIndexedAccess|exactOptionalPropertyTypes|noImplicitOverride';
const DESLIGA = new RegExp(`"(${RIGOR})"\\s*:\\s*false`, 'g');
const STRICT = /"strict"\s*:\s*true/;

const afrouxa = (antes, depois) => {
  const novas = (depois.match(DESLIGA) || []).filter((m) => !antes.includes(m));
  return novas.length > 0 || (STRICT.test(antes) && !STRICT.test(depois));
};

const barrar = (msg) => {
  process.stderr.write(msg);
  process.exit(2);
};

try {
  if (desligado('config-protection')) process.exit(0);
  const { tool_name, tool_input: t = {} } = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  const arq = String(t.file_path || '');
  const nome = path.basename(arq);
  if (!arq || !fs.existsSync(arq)) process.exit(0);

  if (LINT.some((re) => re.test(nome))) {
    barrar(`${nome} é config de lint/formatador. Não afrouxe a régua para passar no verificar: corrija o código. Se o usuário pediu esta mudança, diga a ele que o hook config-protection barrou e que ele pode aplicar ou desligar com JETRO_HOOKS_DESLIGADOS=config-protection.`);
  }
  if (TSCONFIG.test(nome)) {
    const pares = tool_name === 'Write'
      ? [[fs.readFileSync(arq, 'utf8'), String(t.content || '')]]
      : (t.edits || [t]).map((e) => [String(e.old_string || ''), String(e.new_string || '')]);
    if (pares.some(([a, d]) => afrouxa(a, d))) {
      barrar(`${nome}: a mudança afrouxa o rigor do TypeScript (flag de checagem para false ou "strict" removido). Corrija os erros de tipo em vez de desligar a checagem.`);
    }
  }
} catch {}
