---
name: os-tradutor
description: Traduz pedido bagunçado do usuário (áudio transcrito, várias ideias misturadas, objetivo vago tipo "melhora isso", "deixa bonito", "arruma lá") num pedido claro antes de executar — onde estamos, aonde chegar, por quê, referência, limites, pronto quando; ideia solta vai pra inbox. Carregar também em projeto ou tipo de tarefa novo, pedido que conflita com decisão gravada ou tarefa cara de refazer. Não carregar em retomada ("onde paramos"), ajuste pontual, pergunta simples ou tarefa de um passo.
---

# os-tradutor

Roda aqui, no modelo principal. Interpretar o que o usuário quis dizer é decisão: nunca vai para subagente nem modelo barato.

O texto original dele continua valendo; a tradução trabalha junto. Dúvida durante a execução: volta ao original.

## 1. Montar (por dentro)

- **A, onde estamos:** memória, manifest, código. Não se pergunta.
- **B, aonde chegar:** resultado concreto, que se abre ou mede.
- **Por quê:** inferir. Perguntar só se mudar a solução.
- **Referência:** tarefa visual ou de texto sem referência dada → perguntar se ele tem.
- **Limites:** o que não mexer, prazo, custo.
- **Pronto quando:** 2 a 5 condições verificáveis. É proposta; ele aprova ou corrige.
- **Fora do escopo:** ideia solta, de outro projeto ou "pra depois" → `inbox/YYYY-MM-DD.md` (append, `## HH:MM — Ideia [projeto]`) e não entra na tarefa.
- **Conflito** com decisão gravada (preferências, `## Estado` ou `## Descartado` do manifest) → sempre vira pergunta, citando a decisão.

## 2. Perguntar (uma vez)

- Antes, ler `## Glossário` de `eu/preferencias.md`: termo que está lá não se pergunta.
- Só o que memória, manifest e código não respondem e muda o resultado. Óbvio → assume e lista em "Assumi".
- Uma rodada, até 3 perguntas, numa só chamada de AskUserQuestion: 2 a 4 opções, a recomendada primeiro com "(Recomendado)", português simples, sem termo técnico. Nada a perguntar → não pergunta.
- Nunca perguntar em texto solto. Sem a caixa (ferramenta indisponível ou recusada) ou sem resposta → não espera: segue com as recomendadas e põe cada uma em "Assumi".
- Depois disso não para mais por dúvida de tradução. A trava de risco continua valendo à parte.

## 3. Mostrar e seguir

Sempre, como primeira mensagem de texto: antes de carregar kit, tocar arquivo ou perguntar, com ou sem perguntas, mesmo sem ninguém olhando. Curto, sem nome de arquivo nem camada (linha vazia não aparece):

> **Entendi assim:** objetivo em 1 a 2 linhas
> **Pronto quando:** critérios
> **Assumi:** o que decidiu sozinho
> **Fora do escopo:** o que foi anotado para depois

Executou sem resposta dele: a entrega final abre com o mesmo bloco, para ele ver o que foi assumido.

Respondido (ou sem resposta), executa até o fim no mesmo turno, sem pedir confirmação do resumo: `os-metodo` se for multi-etapa; o `kit-*` que casar (sem kit: roteiro, passo 4).

## 4. Aprender (as perguntas diminuem)

- Correção de entendimento ("quando falo X, quero dizer Y"), 2ª vez (na sessão ou já na fila/inbox) → linha `- "X" = Y` em `## Glossário` de `eu/preferencias.md` (cria a seção na primeira); 1ª vez → `Padrão?` na inbox, para a próxima somar.
- Pergunta com a mesma resposta em 2 projetos → preferência em `eu/preferencias.md`; não se pergunta mais. Resposta que vale só para um projeto → manifest (`## Estado`) ou CLAUDE.md dele.
- Preferências passou do teto → condensa.

## Exemplos

**1.** "então, queria uma página pra minha empresa mostrando o atendimento no zap, ah e lembra de ver o domínio do ProjetoA depois, bota uns depoimentos também, sei lá, deixa bonito"
> **Entendi assim:** landing da empresa com uma ação só (chamar no WhatsApp), mostrando o atendimento funcionando.
> **Pronto quando:** abre sem defeito no celular e no computador; botão de WhatsApp visível na primeira tela; prints mostrados.
> **Assumi:** público = comércio pequeno da cidade; tom de balcão.
> **Fora do escopo:** domínio do ProjetoA (anotado para depois).
> Perguntas: depoimentos (não há cliente ainda: demonstração no lugar / esperar o primeiro / outro); tem referência de site que você gosta?

**2.** "arruma lá a tela do ponto que tá feia, e vê se dá pra exportar também"
> **Entendi assim:** refazer o visual da tela de registro de ponto e incluir exportação.
> **Pronto quando:** tela nova no padrão das telas irmãs; exportação baixa o período filtrado; verificação verde.
> **Assumi:** exportar em planilha (CSV), mesmo filtro da listagem.
> Pergunta: tem referência visual ou segue as outras telas do app?

**3.** "corrige o texto do botão pra Agendar" → não traduz: executa direto.
