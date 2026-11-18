---
name: digest-inbox
description: Processa as filas do Knowledge OS — capturas soltas em inbox/ (ideias, lembretes, decisões, links, áudio, candidatos a padrão) e fatos em eu/novos.md — e distribui cada item pro destino certo (eu/, manifest de projeto, skill tec-* ou registry). Nunca roda sozinha; só sob comando explícito. Triggers "digere minha inbox", "processa inbox", "organiza o que capturei", "digest inbox", "processa a memória".
---

# digest-inbox

Objetivo: as filas são captura crua, sem classificação. Esta skill fecha o ciclo — lê o que foi capturado e decide onde cada item pertence, usando a árvore de Transformação (`CLAUDE.md`).

Nunca roda automaticamente. Só quando o usuário pedir por nome ou trigger equivalente.

## Regra de experiência

Processamento em lote, não conversa item a item. Decida sozinho; só pergunte no fim o que ficou genuinamente ambíguo. O usuário nunca vê nome de arquivo/camada — vê o resultado: o que foi distribuído, o que ficou pendente.

## Filas e formatos

- `eu/novos.md` — escrito pelo hook de memória: blocos `## data — sessão [Projeto]` com linhas `- fato:` e `- preferência:`; `(2x)`, `(3x)` no fim = capturado de novo em outro momento.
- `inbox/YYYY-MM-DD.md` — entradas `## HH:MM — Tipo [Projeto]`, digitadas ou vindas do hook (tipo `Padrão?`).
- Outro arquivo em `inbox/` (ex.: clip salvo) — o arquivo inteiro é uma entrada.

## Passos

1. Leia `eu/novos.md` e todos os `inbox/*.md`.
2. Para cada item, aplique a árvore de Transformação:
   - Fato ou preferência do usuário → `eu/perfil.md`, `eu/preferencias.md` ou `eu/pessoas.md`. Já existe igual → descarte. Contradiz linha existente → substitua. Respeite o teto (perfil ~2 KB, preferencias 3 KB, pessoas ~1 KB): condense. A contagem não vai para o destino, mas `(2x)` ou mais conta como 2+ ocorrências reais de padrão no passo seguinte.
   - Decisão/dívida/estado de projeto conhecido → manifest do projeto (`## Estado`, curto), ou nada se o CLAUDE.md do projeto declarar contexto próprio ativo (diga isso no resumo).
   - Padrão reutilizável — só com 2+ ocorrências reais (na fila ou somadas ao que já existe): jeito de trabalhar do usuário → linha em `eu/preferencias.md`; técnica/tecnologia → skill `.claude/skills/tec-<nome>/SKILL.md` (acrescenta se já existe; `description` diz quando carregar); de um projeto só → CLAUDE.md ou manifest dele. `Padrão?` com uma ocorrência só fica na inbox.
   - Projeto novo, status ou apelido → `registry/projects.md`.
   - Ideia solta sem destino claro ou lembrete avulso → fica na inbox, intocada.
   - Genuinamente ambíguo → lista pra perguntar no fim.
3. Item distribuído sai da fila (entrada removida do arquivo do dia, ou o clip inteiro, ou o bloco de `eu/novos.md`). Arquivo do dia sem entradas → apague. Nunca remova item pendente ou ambíguo. `eu/novos.md` mantém só o cabeçalho quando esvaziar.
4. Responda com síntese única: quantos itens processados, pra onde foram (em linguagem de conteúdo), o que ficou pendente e por quê, e as perguntas ambíguas.
