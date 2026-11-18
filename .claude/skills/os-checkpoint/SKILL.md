---
name: os-checkpoint
description: Reflexão de encerramento de sessão neste Knowledge OS pessoal — analisa a conversa inteira e devolve resumo único ("o que aprendemos hoje"). Grava tudo por trás (eu/, manifest do projeto, skills tec-*, registry) sem narrar arquivo ou camada. Triggers "salva progresso", "checkpoint", "fechar sessão", "por hoje é isso", "vou parar por aqui", "acabamos por hoje", "encerrar sessão", "guarda isso pro OS", "salva onde paramos".
---

# os-checkpoint

Objetivo: uma reflexão só, no fim — nunca perguntas soltas durante o trabalho. O hook de memória (`memoria.mjs`) já grava o básico em toda sessão; esta skill é a passada completa, feita pelo modelo principal.

## Regra de experiência

Momento de resumo, não relatório de operações. O usuário nunca vê nome de arquivo, camada ou "atualizei X". Vê conteúdo: o que foi decidido, o que ficou de dívida, o que virou padrão.

## Passos (tudo silencioso, por trás)

1. Releia a sessão inteira. Identifique sozinho: fatos que o usuário declarou, decisões, dívidas, padrões reutilizáveis, conhecimento que merece virar permanente. Não pergunte o que classificar — decida.
2. **Fatos do usuário** (quem é, situação, meta, pessoa, preferência) → `eu/perfil.md`, `eu/preferencias.md` ou `eu/pessoas.md`, substituindo linha desatualizada. Aproveite e promova o que estiver em `eu/novos.md` (mesma regra; entrada promovida sai da fila). Respeite o teto (perfil ~2 KB, preferencias 3 KB, pessoas ~1 KB): condense em vez de só acrescentar.
3. **Projeto tocado** → manifest (`projects/<nome>/manifest.md`):
   - `## Onde paramos`: sobrescreva os 4 campos (tarefa, branch, parou em, resumo).
   - `## Estado`: só decisão que continua valendo, em frase curta. Nada de log de sessão.
   - Projeto com contexto próprio declarado ativo no CLAUDE.md dele: decisão, dívida e histórico são dele — não copie pra cá.
   - Manifest passou de ~3 KB → condense; histórico longo vai pra `_arquivo/manifests/`.
4. **Padrão confirmado 2+ vezes de verdade** — jeito de trabalhar do usuário → linha em `eu/preferencias.md`; técnica reutilizável entre projetos → skill `.claude/skills/tec-<nome>/SKILL.md` (acrescenta se já existe). Nunca por evento isolado; nunca copiar backlog de projeto pra cá.
5. **Registry** — só se mudou o catálogo: projeto novo, status, apelido novo. Datas não ficam lá.
6. Responda só com a síntese: o que aprendemos hoje, em linguagem de conteúdo.
