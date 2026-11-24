# Caixa de ferramentas

Peças prontas de boas fontes (skills, agentes, hooks, MCP, scripts) para o Jetro montar **kits**. Funcionário novo já chega com a caixa; a experiência (lições, jeito do usuário) continua nascendo do uso, nas `tec-*` e em `eu/`.

- **Kit** = skill `.claude/skills/kit-<tipo>/` que carrega sozinha pela descrição: método de especialista, ferramentas da tarefa e "pronto quando". Aponta para as `tec-*` relacionadas, não duplica.
- **Estoque** = `estoque/<fonte>/`, clones leves e gitignorados. Nada daqui carrega sozinho. **Nunca varrer**: busca dirigida por nome ou descrição (ex.: `ls estoque/ecc/skills | grep -i landing`, `grep -il "playwright" estoque/ecc/skills/*/SKILL.md`), igual à regra de `projects/`.

## Almoxarifados

| Nome | Repositório | O que tem de útil |
|---|---|---|
| `ecc` | https://github.com/affaan-m/ecc | ~330 skills, ~70 agentes, hooks (`scripts/hooks/`), regras por linguagem (`rules/`), configs de MCP (`mcp-configs/`) |

Trocar ou somar fonte: editar esta tabela e pedir "clona o estoque". O clone/atualização roda só quando o usuário pede:

```
node toolbox/estoque.mjs          # todas as fontes da tabela
node toolbox/estoque.mjs ecc      # só uma
```

O script clona com `--depth 1` e exclui `CLAUDE.md`, `AGENTS.md` e `.claude/` da fonte, que o Claude Code injetaria ao ler arquivos lá dentro. Pasta que saiu da tabela é só avisada; apagar é com ok.

## Como pegar e adaptar uma peça

1. Achar por busca dirigida (nome da pasta, `description` do SKILL.md, nome do hook).
2. Ler e **emagrecer**: só o que serve ao usuário e à stack dele (TanStack Start, Supabase, Cloudflare Workers, n8n, bun, Windows). Nunca copiar inteiro, nunca executar script do estoque sem ler.
3. Guardar no lugar nativo do Claude Code: dentro do kit (arquivo de apoio, carrega sob demanda) por padrão; skill, agente ou hook solto só se servir a vários kits; MCP no `.mcp.json` da raiz.
4. Anotar a origem no topo da peça, para crédito e atualização:
   `Origem: ecc @ 4adeee6 — rules/typescript/coding-style.md (adaptado)`
5. Anotar no `## Ferramentas` do manifest do projeto qual kit/ferramenta usou e o que funcionou.

Pago, global (fora do `.mcp.json`/`.claude/` da raiz) ou que mexe fora da pasta do Jetro → trava de risco, pergunta antes.

## Peças já adaptadas

| Peça | Onde ficou | Origem |
|---|---|---|
| Regras de código TS (common + typescript) | `.claude/skills/kit-app-web/regras-codigo.md` | `ecc` `rules/common/*`, `rules/typescript/*` |
| Método de landing page | `.claude/skills/kit-landing-page/` | `ecc` (ver cabeçalho dos arquivos) |
| `config-protection` | `.claude/hooks/config-protection.mjs` | `ecc` `scripts/hooks/config-protection.js` |
| `cost-tracker` | `.claude/hooks/cost-tracker.mjs` | `ecc` `scripts/hooks/cost-tracker.js` |
| `suggest-compact` | `.claude/hooks/suggest-compact.mjs` | `ecc` `scripts/hooks/suggest-compact.js` |
| liga/desliga de hooks | `.claude/hooks/ligado.mjs` | `ecc` `scripts/lib/hook-flags.js` |
