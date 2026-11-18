# Manifest — {{Nome do Projeto}}

Objetivo NÃO é modificar o projeto. É entendê-lo e preencher este arquivo. Não invente — o que não puder ser determinado vira "Não identificado".

**Teto: ~3 KB.** Manifest é ponto de entrada (o que é, onde está cada coisa, onde paramos), não diário de sessão. Passou do teto → condensar; histórico longo vai pro contexto próprio ativo do projeto ou pra `_arquivo/manifests/`.

Nome, aliases, tipo, status e tags vivem no registry (fonte única) — não repetir aqui. Serve pra qualquer domínio: software, conteúdo, igreja, estudo, casa. Projeto sem código pode ter só este arquivo na pasta.

**Antes de preencher**: verifique se o CLAUDE.md do projeto declara um sistema de contexto próprio (ledger, backlog, memória de decisões) como **ativo**. Só então ele é a fonte única do conhecimento dinâmico e este manifest só aponta (seção "Contexto do Projeto"). Senão (inexistente, pausado ou congelado), o manifest é a fonte.

## Missão

1–2 frases: o que é e pra quem.

## Mapa

Onde está cada coisa, em caminhos relativos à pasta do projeto (5–10 linhas). Só o que existe. Se o projeto tem índice próprio ativo, a primeira linha aponta pra ele. Ex.:

- código: `src/routes/` (telas), `src/lib/` (regras)
- banco: `supabase/migrations/`
- automação: `n8n/`
- doc própria: `docs/`
- git: `.git/` · grafo: `graphify-out/` (com data, se puder estar velho)

## Recursos

Ferramentas, tecnologias, materiais — o que o projeto usa pra existir.

## Relacionamentos

Projetos ou domínios conectados e a natureza da relação (ex: "replica modelo de permissões do ProjetoB").

## Estado

Forma e maturidade atual + decisões que continuam valendo, em frases curtas. Não é log de sessão.

## Onde paramos

- tarefa:
- branch:
- parou em: YYYY-MM-DD
- resumo:

(4 linhas, sobrescritas a cada sessão pelo hook de memória ou pelo `os-checkpoint`. Em projeto com contexto próprio ativo, é só a linha de retomada.)

## Contexto do Projeto

_(só quando o CLAUDE.md do projeto declarar sistema de contexto próprio ativo — e então omitir "Dívidas técnicas"/"Próximos passos")_

Este projeto utiliza {{sistema}} (`{{caminho}}`) como sistema de contexto persistente: fonte de verdade para decisões, backlog, dívidas e histórico. Este manifest não replica isso — descreve o projeto e serve de ponto de entrada.

## Dívidas técnicas

_(omitir quando houver "Contexto do Projeto")_

## Próximos passos

_(omitir quando houver "Contexto do Projeto")_

## Última revisão

`YYYY-MM-DD` — data em que este manifest foi checado contra a realidade do projeto.

## Glossário específico do projeto
