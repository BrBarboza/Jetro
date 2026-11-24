// Lista branca do mecanismo do Jetro: o que vai para a versão pública. Nada fora dela sai.
// Usada por exportar-template.mjs (cópia) e pelo hook publico-atraso.mjs (detecção).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const PERMITIDO = [
  /^\.claude\/hooks\/(testes\/)?[\w-]+\.mjs$/,
  /^\.claude\/agents\/[\w-]+\.md$/,
  /^\.claude\/scripts\/[\w-]+\.mjs$/,
  /^\.claude\/skills\/(os-[\w-]+|kit-[\w-]+|digest-inbox)\/(?!.*(node_modules|package-lock\.json)).*[^/]$/,
  /^templates\/[^/]+$/,
  /^toolbox\/(README\.md|estoque\.mjs)$/,
];
// Viram versão pública por transformação (não cópia direta), mas também contam como mecanismo.
export const TRANSFORMADOS = ['CLAUDE.md', 'ARCHITECTURE.md', '.claude/settings.json'];
const RAIZES = ['.claude/hooks', '.claude/agents', '.claude/scripts', '.claude/skills', 'templates', 'toolbox'];
const PULAR = /^(node_modules|estoque|\.git)$/; // nunca descer (toolbox/estoque é enorme)

export function mecanismo(raiz) {
  const achados = [];
  const andar = (rel) => {
    const abs = path.join(raiz, rel);
    if (!fs.existsSync(abs)) return;
    if (fs.statSync(abs).isDirectory()) {
      for (const nome of fs.readdirSync(abs)) if (!PULAR.test(nome)) andar(`${rel}/${nome}`);
    } else if (PERMITIDO.some((r) => r.test(rel))) achados.push(rel);
  };
  RAIZES.forEach(andar);
  return achados.sort();
}

// { arquivo: hash } de tudo que é mecanismo; compara com a última sincronização.
export function assinatura(raiz) {
  const mapa = {};
  for (const rel of [...mecanismo(raiz), ...TRANSFORMADOS]) {
    const abs = path.join(raiz, rel);
    if (fs.existsSync(abs)) mapa[rel] = crypto.createHash('sha1').update(fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n')).digest('hex').slice(0, 12);
  }
  return mapa;
}

export const ESTADO = '.claude/hooks/.publico-sync.json';
