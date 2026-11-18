# Jetro

Um Knowledge OS pessoal para trabalhar com IA no Claude Code. Em vez de reexplicar quem você é, como trabalha e onde cada projeto parou a cada sessão, o Jetro guarda isso em arquivos de texto e carrega o que importa sozinho.

Não é outro agente: é a forma como o Claude organiza o próprio contexto antes, durante e depois de executar.

## O que vem aqui

- `CLAUDE.md`: o mecanismo (roteiro, regras, agentes).
- `ARCHITECTURE.md`: o contrato e o porquê de cada decisão.
- `.claude/`: hooks (memória automática, revisão de push, trava de segredo), agentes e skills.
- `eu/`, `registry/`, `projects/`, `mental-palace/`: seus dados. Vêm vazios.

## Como começar

1. Use este repositório como template (botão *Use this template*) e deixe-o **privado**: ele vai guardar dados pessoais.
2. Instale o [Claude Code](https://claude.com/claude-code) e o Node 20+.
3. Abra a sessão sempre na raiz desta pasta.
4. Preencha `eu/perfil.md` e `eu/preferencias.md` (ou peça ao Claude para entrevistar você).
5. Opcional: para o hook de memória fazer commit e push sozinho no fim da sessão, crie o arquivo vazio `.claude/hooks/auto-git`.

## Aviso

O hook de memória chama `claude -p` em segundo plano para resumir sessões. Isso consome sua cota. Os hooks foram desenvolvidos e testados no Windows.

## Licença

MIT.
