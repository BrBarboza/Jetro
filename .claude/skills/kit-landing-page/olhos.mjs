#!/usr/bin/env node
// Olhos do kit: abre a página no navegador, tira print de celular e computador e aponta defeitos
// que dá para medir (rolagem lateral, elemento vazando, erro no console, imagem quebrada, alvo de toque pequeno).
// Uso: node .claude/skills/kit-landing-page/olhos.mjs <url ou arquivo.html> [pasta-dos-prints]
// Prints: <pasta>/{celular,computador}-{dobra,inteira}.png (padrão: ./prints). Depois, Read nos PNGs.
// Navegador: o Chromium já baixado pelo Playwright (%LOCALAPPDATA%/ms-playwright) ou o Chrome instalado.
// Origem: ecc @ 4adeee6 — skills/browser-qa (fases smoke + visual, adaptado para script sem MCP).

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (!fs.existsSync(path.join(AQUI, 'node_modules', 'playwright-core'))) {
  console.error(`Falta playwright-core: rode "npm install" em ${AQUI}`);
  process.exit(2);
}
const { chromium } = await import('playwright-core');

const [alvo, saida = 'prints'] = process.argv.slice(2);
if (!alvo) {
  console.error('Uso: olhos.mjs <url ou arquivo.html> [pasta-dos-prints]');
  process.exit(2);
}
const url = /^https?:|^file:/.test(alvo) ? alvo : pathToFileURL(path.resolve(alvo)).href;
fs.mkdirSync(saida, { recursive: true });

function navegador() {
  const base = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  const achados = fs.existsSync(base)
    ? fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => b.split('-')[1] - a.split('-')[1])
      .flatMap((d) => ['chrome-win64', 'chrome-win'].map((w) => path.join(base, d, w, 'chrome.exe')))
      .filter((p) => fs.existsSync(p))
    : [];
  return achados[0] ? { executablePath: achados[0] } : { channel: 'chrome' };
}

const TELAS = {
  celular: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  computador: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};

const browser = await chromium.launch(navegador());
let problemas = 0;
for (const [nome, opcoes] of Object.entries(TELAS)) {
  const pagina = await (await browser.newContext(opcoes)).newPage();
  const erros = [];
  pagina.on('console', (m) => m.type() === 'error' && erros.push(`console: ${m.text().slice(0, 160)}`));
  pagina.on('pageerror', (e) => erros.push(`js: ${e.message.slice(0, 160)}`));
  pagina.on('requestfailed', (r) => erros.push(`falhou: ${r.url().slice(0, 120)}`));
  pagina.on('response', (r) => r.status() >= 400 && erros.push(`${r.status()}: ${r.url().slice(0, 120)}`));
  await pagina.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await pagina.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
    // Espera animações finitas (entrada de elementos) terminarem, com teto de 8 s.
    const finitas = document.getAnimations().filter((a) => a.effect?.getComputedTiming().endTime !== Infinity);
    await Promise.race([Promise.all(finitas.map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 8000))]);
  });
  await pagina.waitForTimeout(300);
  await pagina.screenshot({ path: path.join(saida, `${nome}-dobra.png`) });
  await pagina.screenshot({ path: path.join(saida, `${nome}-inteira.png`), fullPage: true });

  const m = await pagina.evaluate((celular) => {
    const larg = document.documentElement.clientWidth;
    const vazando = [...document.querySelectorAll('body *')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.right > larg + 1 || r.left < -1) && getComputedStyle(el).position !== 'fixed';
    }).slice(0, 5).map((el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''}`);
    const toque = celular ? [...document.querySelectorAll('a, button, input, select, textarea, [role=button]')]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); })
      .slice(0, 5).map((el) => (el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30)) : [];
    return {
      rolagemLateral: document.documentElement.scrollWidth > larg,
      vazando,
      toquePequeno: toque,
      imagemQuebrada: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src.slice(-60)),
      semAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
      h1: document.querySelectorAll('h1').length,
      titulo: document.title,
      descricao: document.querySelector('meta[name=description]')?.content || '',
      altura: document.body.scrollHeight,
    };
  }, !!opcoes.isMobile);

  const avisos = [
    ...erros,
    m.rolagemLateral && 'rolagem lateral (algo mais largo que a tela)',
    m.vazando.length && `vazando da tela: ${m.vazando.join(', ')}`,
    m.toquePequeno.length && `alvo de toque < 44px: ${m.toquePequeno.join(' | ')}`,
    m.imagemQuebrada.length && `imagem quebrada: ${m.imagemQuebrada.join(', ')}`,
    m.semAlt && `${m.semAlt} imagem(ns) sem alt`,
    m.h1 !== 1 && `${m.h1} h1 (o ideal é 1)`,
    !m.titulo && 'sem <title>',
    !m.descricao && 'sem meta description',
  ].filter(Boolean);
  problemas += avisos.length;
  console.log(`\n${nome} ${opcoes.viewport.width}x${opcoes.viewport.height} — altura ${m.altura}px — prints em ${path.resolve(saida)}`);
  console.log(avisos.length ? avisos.map((a) => `  - ${a}`).join('\n') : '  sem defeito medido');
}
await browser.close();
console.log(problemas ? `\n${problemas} aviso(s): corrigir e rodar de novo; depois olhar os prints.` : '\nNada medido de errado: agora olhar os prints.');
