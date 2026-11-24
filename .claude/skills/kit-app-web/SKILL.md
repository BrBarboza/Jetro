---
name: kit-app-web
description: Kit para construir ou mudar funcionalidade em app web TypeScript da stack do usuário (TanStack Start + React, Supabase, Cloudflare Workers, bun). Método de feature ponta a ponta, regras de código e "pronto quando". Carregar ao implementar tela, rota, migration, Worker ou integração nesses apps.
---

# kit-app-web

Regra do CLAUDE.md do projeto vence. Este kit diz a ordem; o projeto diz os comandos e as exceções.

## Método (uma feature)

1. **Ler o que existe.** Manifest (`## Mapa`, `## Ferramentas`) e a tela/rota irmã mais parecida. Reusar componente, hook e padrão dela (listagem, card, permissão por cargo).
2. **Contrato antes do código.** Tipos do dado, quem pode (cargo/RLS), estados da tela (carregando, vazio, erro, sem permissão, sucesso). Escrever o critério testável.
3. **Banco primeiro.** Migration nova em `supabase/migrations/` (nunca editar a já aplicada; prefixo do app nas tabelas; RLS junto). Banco compartilhado: SQL de escrita e migration só com ok do usuário, um por migration.
4. **Servidor.** Server function / Worker valida entrada na borda (schema), trata erro com mensagem útil, nunca vaza segredo nem stack. Segredo só em env/secret.
5. **Tela.** Seguir `regras-codigo.md`. Mobile primeiro; olhar no celular quando mexer em layout (`kit-landing-page/olhos.mjs` serve para qualquer URL local).
6. **Verificar.** `node .claude/scripts/verificar.mjs <pasta>`; e2e/teste com banco pelo nome quando a mudança tocar fluxo. Hook `config-protection` barra afrouxar lint/tsconfig: corrija o código.
7. **Fechar.** Commit e push por item; lista de teste para o usuário por aparelho; manifest (`## Estado`, `## Ferramentas` se algo novo funcionou).

## Pronto quando

- Verificação verde (typecheck, lint, build, testes que existirem); nada afrouxado em config.
- Estados da tela tratados; permissão testada com cargo sem acesso.
- Migration nova revisada e aplicada só com ok; tipos regenerados.
- Segredo fora do código (buscar antes do push e mostrar).
- Lista de teste para o usuário (celular e computador separados).

## Ferramentas e relacionados

- Regras de código destiladas: `regras-codigo.md` (nesta pasta, ler ao escrever código).
- Segurança de entrada, sessão, terceiros: skill `security-and-hardening`.
- Testar como usuário real: `tec-teste-persona`; por tipo de cliente: `tec-teste-cenarios`; auditoria do projeto inteiro: `tec-auditoria-squad`.
- Workflow n8n como backend: `tec-n8n`. Painel redimensionável: `tec-react-resizable-panels`.
- Interface: `interfaces:better-interface` (revisão), `mobile-native`.
