---
name: os-import-project
description: Importa um projeto pra dentro deste Knowledge OS — de código ou não (conteúdo, igreja, estudo, casa). Gera o manifest lendo o projeto (read-only), sem tocar nos arquivos do projeto original, e registra no registry com aliases e tipo. Use quando o usuário trouxer um projeto sem manifest, pedir "importar projeto X", "traz o projeto X pro OS", "adiciona X ao OS", "cria manifest de X", ou citar um projeto que não está no registry.
---

# os-import-project

Objetivo: trazer projeto pra dentro do OS sem bagunçar o projeto original — muitos já têm repo Git, CLAUDE.md e skills próprias.

## Regra de fronteira (inegociável)

O projeto é fonte de leitura, nunca de escrita. NUNCA criar, editar ou apagar arquivo dentro da pasta do projeto — nem `.git`, nem `CLAUDE.md`, nem `.claude/`, nem nada — exceto o próprio `manifest.md`. Identidade própria detectada (repo, CLAUDE.md, skills, contexto próprio) vira metadado, não motivo pra alterar nada lá.

## Passos

1. Sem nome do projeto: pergunte. Projeto sem código (canal, estudo, evento): a pasta `projects/<slug>/` pode ter só o manifest.
2. Detecte identidade própria sem modificar nada: `.git`? `CLAUDE.md` ou `.claude/skills/`? README? Sistema de contexto próprio (ledger/backlog/memória)? Só vale se o CLAUDE.md do projeto disser que está ativo; então é a fonte única do conhecimento dinâmico e o manifest só aponta (seção "Contexto do Projeto"). Senão o manifest é a fonte.
3. `projects/<slug>/manifest.md` já existe? Mostre o estado e pergunte se quer refresh. Não sobrescreva sem confirmar.
4. Não existe: leia só o necessário (README, config, estrutura de primeiro nível — nunca varredura recursiva) e preencha `templates/manifest.template.md`. Respeite o teto (~3 KB). `## Mapa` com caminhos relativos de onde está cada coisa; `## Onde paramos` com o que se sabe. Campo sem certeza vira "Não identificado".
5. Registre em `registry/projects.md`: Nome, Aliases (como o usuário chama — pergunte se não souber), Tipo, Status (`ativo` por padrão), "O que é" em uma frase, Tags, Identidade própria. Sem datas.
6. Relação com outro projeto já registrado: descreva em `## Relacionamentos` (proponha se for incerta).
7. Reporte curto, em linguagem de conteúdo: "ProjetoB agora faz parte do sistema — sei missão, estado e próximos passos dele". Se detectou identidade própria, avise que o OS não vai interferir nela.
