---
name: os-apply-pattern
description: Aplica um padrão, feature ou trecho de código já validado num projeto deste Knowledge OS dentro de outro projeto. Cenário recorrente — "vai no projeto X e pega Y, aplica aqui" — resolvido lendo de verdade o projeto-fonte (subagente explorador) em vez de aplicar de memória. Use quando o usuário pedir para replicar algo de um projeto em outro ("faz igual o ProjetoB", "usa o mesmo esquema do ProjetoA", "pega o padrão de X e aplica em Y", "copia como fizemos no projeto Z").
---

# os-apply-pattern

Objetivo: replicar um padrão concreto (componente, fluxo, config, convenção) de um projeto-fonte para um projeto-alvo, sem depender de memória sobre como o fonte funciona — ele é investigado de verdade a cada vez.

## Por que isso existe

Pedir "vai no projeto X e faz igual" sem investigação dedicada leva a aplicar a interpretação própria do padrão em vez de ler o código do fonte. A correção é forçar a leitura como etapa separada, feita por um agente que só lê.

## Passos

1. Identifique projeto-fonte, projeto-alvo e o padrão específico (nome do componente/fluxo/convenção, não "o projeto inteiro"). Pedido vago ("faz igual o ProjetoB" sem dizer o quê): pergunte o que replicar, não adivinhe.
2. Resolva os caminhos pelo `registry/projects.md` (nunca varra `projects/`). Projeto fora do registry: `os-import-project` antes.
3. **Mapear fonte** — subagente `explorador`: "No projeto em <caminho-fonte>, localize exatamente <padrão>. Leia os arquivos reais. Devolva quais arquivos implementam, o trecho relevante com `caminho:linha`, e por que foi feito assim se der pra descobrir." Nunca pule esta etapa por achar que já sabe: o projeto pode ter mudado.
4. **Extrair** (você, modelo principal): abra só os trechos que o explorador apontou e sintetize o padrão em forma reaplicável: o código na íntegra e o princípio que o faz funcionar. Sem adaptar ainda.
5. **Mapear alvo** — subagente `explorador`: "No projeto em <caminho-alvo>, onde esse padrão entra? Devolva arquivos/pastas concretos, convenções locais (nomes, stack, estilo) e o que já existe parecido, para não duplicar."
6. **Aplicar** (você): implemente no alvo respeitando as convenções locais, não o estilo do fonte. Rode `node .claude/scripts/verificar.mjs <pasta-alvo>`.
7. **Verificar** (você): compare comportamento com o padrão extraído, não só a forma. Veredito: fiel / parcialmente fiel / infiel, com o que diverge. Parcial ou infiel: não dê como concluído; mostre a divergência e pergunte se aceita ou corrige.
8. Reporte em linguagem de conteúdo: o que havia na fonte, o que foi aplicado, o resultado da verificação. Sem narrar as etapas.
