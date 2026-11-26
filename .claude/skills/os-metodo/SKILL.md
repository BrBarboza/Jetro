---
name: os-metodo
description: Método de execução do Jetro para tarefa de várias etapas (código, automação, pesquisa, documento) — fixa o "pronto quando", separa pedido de suposição, prova o risco antes e confere a entrega com evidência. Carregar ao entrar em plan mode, quando o usuário pedir plano, ou quando a tarefa tiver 3+ etapas com verificação própria. Não carregar em pergunta, ajuste pontual ou tarefa de um passo. Triggers "usa o método", "planeja isso", "pronto quando".
---

# os-metodo

Só o que o Jetro não diz em outro lugar. O resto está na última seção, por ponteiro: vale igual e não é repetido aqui.

Duas fases. Com `opusplan`, a primeira roda no Opus (plan mode) e a segunda no Sonnet. Sem plan mode, as duas rodam no mesmo modelo, nesta ordem.

## Planejamento (Opus)

Quem executa pode ser outro modelo: o plano leva tudo que ele precisa, sem depender de raciocínio que ficou só na conversa.

1. **Pedido em uma frase.** Reescreva o pedido em uma frase. Não coube: são duas tarefas, diga.
2. **Pronto quando.** 3 a 6 condições observáveis: algo que se roda, abre ou mede e responde sim ou não. "Funciona bem" não é condição. Condição que o usuário já deu entra literal, sem reescrever.
3. **Pedido × suposição.** Duas listas: o que ele pediu e o que você está supondo. Suposição barata de desfazer: segue e vai declarada na entrega. Suposição cara ou sem volta: vira pergunta antes de continuar.
4. **Risco provado antes.** Ache a etapa que, se falhar, derruba o plano. Prove-a com o menor teste possível (uma chamada, uma consulta de leitura, um rascunho) antes de fechar o plano. Se a prova exigir escrita, ela entra no plano marcada como prova pendente.
5. **Tarefas do tamanho certo.** Cada tarefa entrega algo testável sozinho; preparo e configuração entram na tarefa que precisa deles. Separar só onde um revisor poderia recusar uma e aprovar a vizinha. (Origem: `superpowers` @ 22f0b46 — `skills/writing-plans`, adaptado.)
6. **Plano para o executor.** Além das etapas, o plano carrega a frase, o "pronto quando", as suposições e o resultado da prova de risco.

## Execução (Sonnet)

1. **Uma etapa por vez.** A seguinte só começa com a anterior verificada.
2. **Revisão por tarefa** (projeto, não ajuste pequeno): ao fechar cada tarefa, um subagente novo recebe a tarefa, as regras do plano e o diff, e responde duas coisas: fez o que a tarefa pede? o código está bom? Qualquer "não" volta para correção antes da próxima. (Origem: `superpowers` — `skills/subagent-driven-development`, adaptado.)
3. **Plano furou** (premissa falsa, etapa impossível, "pronto quando" inalcançável): não redesenhe aqui. Pare, diga o que furou e volte ao planejamento.
4. **Falha.** Leia o erro inteiro, não só a última linha. Escreva uma hipótese e teste só ela. Volta sem progresso não repete a tentativa: troca a hipótese ou a abordagem.
5. **Conferência final.** Cada item do "pronto quando" com evidência (saída de comando, print, linha de arquivo); sem evidência, o item sai como "não verificado". Teste o caminho feliz e pelo menos dois casos ruins que façam sentido (vazio, inválido, sem permissão, duplicado). Releia o pedido original e compare com a entrega: o que faltou, o que sobrou.
6. **Entrega.** Depois do resultado, uma linha para cada: o que não foi feito, o que não foi testado, o que foi suposto. Lista vazia não aparece.

## Já coberto (vale igual, não repetir aqui)

| Assunto | Onde |
|---|---|
| Critério testável antes de começar; plano com verificação por passo | `CLAUDE.md` § ENGENHARIA MÍNIMA, item 4 |
| Mudança mínima e cirúrgica; fora do escopo só se menciona | `CLAUDE.md` § ENGENHARIA MÍNIMA, itens 1 a 3 |
| Ler o que existe antes de criar | `CLAUDE.md` § ROTEIRO, passos 1 a 3 |
| Parar e perguntar em ação destrutiva, sem volta ou que chega a outros | `CLAUDE.md` § ROTEIRO, passo 7 |
| Como rodar a verificação e o limite de voltas do loop | `CLAUDE.md` § AGENTES E HOOKS |
| Quantas perguntas e em que linguagem; formato e ordem do plano; lista de teste para o usuário; resposta sem narrar processo | `eu/preferencias.md` |
