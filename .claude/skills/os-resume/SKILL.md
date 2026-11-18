---
name: os-resume
description: Recupera onde o trabalho parou neste Knowledge OS pessoal. Acha o projeto mais recente pelo manifest modificado por último (ou pelo apelido citado, via registry), lê "Onde paramos" e responde com contexto sintetizado (não despeja arquivo cru). Triggers "onde paramos", "o que estávamos fazendo", "resume a sessão", "status do OS", "bora continuar", "cadê a gente".
---

# os-resume

Objetivo: responder "onde paramos?" sem o usuário precisar reabrir nada manualmente.

## Passos

1. O nome do dono já está carregado (`eu/perfil.md`, importado pelo kernel) — use direto.
2. Qual projeto:
   - Se o usuário citou nome ou apelido ("aquele do atendimento"), resolva pelas colunas Aliases e "O que é" de `registry/projects.md`.
   - Senão, o mais recente é o manifest modificado por último: `ls -t projects/*/manifest.md | head -3` (profundidade 1, nunca recursivo).
3. Leia `## Onde paramos` e `## Estado` desse manifest. Não leia ledger nem contexto próprio por padrão; só se o CLAUDE.md do projeto o declarar ativo, e então só a parte "Em andamento".
4. Responda curto:
   - projeto e quando parou
   - 1–3 bullets do que estava em aberto
   - próxima pendência sugerida
5. Nunca despeje conteúdo bruto, nunca cite nome de arquivo/camada na resposta. Sintetize.
6. Se nada tiver atividade recente, diga isso direto e pergunte o que retomar — não finja que há histórico.

## Ativação por menção

Também dispara implicitamente quando o usuário nomeia um projeto como alvo de trabalho ("vamos trabalhar no ProjetoB") — ver `CLAUDE.md` § ROTEIRO passo 2.
