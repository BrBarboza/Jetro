---
name: kit-landing-page
description: Kit para montar ou refazer landing page / página de vendas que converte — método de conversão, direção visual e "olhos" que abrem a página no navegador e tiram print de celular e computador antes de mostrar. Carregar quando o pedido for landing page, página de vendas, página de captura ou site de uma página.
---

# kit-landing-page

Ordem de especialista. Cada etapa tem saída concreta; só segue com a anterior pronta.

## 1. Briefing de conversão (antes de qualquer pixel)

Escreva em 6 linhas, no arquivo de trabalho do projeto (não na conversa só):
- **Quem chega** (público, de onde vem: Instagram, WhatsApp, indicação) e **a dor** em palavras dele.
- **Uma ação** que a página pede (WhatsApp, formulário, compra). Uma só; o resto apoia.
- **Promessa** em uma frase: resultado + prazo/esforço. Sem jargão.
- **Prova** disponível de verdade (cliente, número, print, demonstração). Não inventar depoimento nem número.
- **Objeções** (preço, "não é pra mim", confiança, trabalho de implantar) e a resposta de cada.
- **Tom** da marca (ver `## Estado`/identidade do projeto).

## 2. Estrutura (ordem que converte)

1. Dobra: título = promessa, subtítulo = como, CTA visível sem rolar no celular, imagem do produto real.
2. Dor/situação atual → 3. Como funciona (3 passos) → 4. Prova → 5. Oferta (o que leva, preço ou "a partir de") → 6. Objeções/FAQ → 7. CTA final repetido.
CTA fixo no rodapé do celular só se não cobrir conteúdo nem ação. Texto de botão diz o que acontece ("Falar no WhatsApp"), não "Saiba mais".

## 3. Direção visual

- Carregar a skill `frontend-design` (direção estética) e, ao revisar, `interfaces:better-layout`, `interfaces:better-typography` e `mobile-native`.
- Antes de codar, fixe: propósito, público, tom, **um detalhe memorável**, restrições. Contrato verificável, não só paleta.
- Evitar o genérico: gradiente roxo, blobs, card dentro de card, hero vago, foto de banco. Usar o produto real (print do app, foto do lugar).
- Stack: a do projeto. Página nova sem projeto: HTML + CSS num arquivo, sem build, fácil de publicar no Cloudflare Pages.

## 4. Olhos (obrigatório antes de mostrar ao usuário)

```
node .claude/skills/kit-landing-page/olhos.mjs <url ou arquivo.html> <pasta-do-projeto>/prints
```
1. Corrigir todo aviso medido (rolagem lateral, vazamento, erro de console, toque < 44px, imagem quebrada, h1, meta).
2. Read em `celular-dobra.png`, `celular-inteira.png`, `computador-dobra.png`, `computador-inteira.png` e julgar como cliente: a promessa e o CTA aparecem na dobra do celular? Algo encavalado, apertado, ilegível, desalinhado?
3. Corrigir e rodar de novo. Máx. 3 voltas; depois mostrar com o que ficou faltando.
Primeira vez na máquina: `npm install` na pasta do kit (só `playwright-core`; usa o Chromium já baixado ou o Chrome).

## Pronto quando

- Briefing de 6 linhas escrito e a página segue ele (uma ação, promessa na dobra).
- `olhos.mjs` sem aviso, ou aviso restante explicado.
- Prints de celular e computador vistos e mostrados ao usuário (caminho dos PNGs).
- Nenhum depoimento, número ou logo inventado; textos em pt-BR revisados.
- Manifest do projeto com a linha em `## Ferramentas`.

## Relacionados

Lição vivida de landing: nenhuma `tec-*` ainda; nasce quando algo se repetir. Publicar e testar app: `kit-app-web`.
Origem: método adaptado de `ecc @ 4adeee6` — `skills/frontend-design-direction` (contrato de direção, anti-padrões) e `skills/browser-qa` (smoke + visual em 2 telas); estrutura de conversão escrita para o Jetro.
