---
name: os-modo-solo
description: Modo solo — o usuário vai ficar fora e não responde; executar o plano inteiro, todas as fases, sem parar para confirmação. Carregar só quando ele digitar /os-modo-solo ou disser "modo solo".
---

# Modo solo

O usuário vai ficar fora e não vai responder. Execute o plano inteiro, todas as fases, sem parar para pedir confirmação entre elas.

## Regras

- **Fase terminou:** valide (build/testes), faça commit e siga direto para a próxima. Não pergunte "posso continuar?".
- **Dúvida de decisão:** escolha a opção mais simples e segura, anote em `DECISOES.md` (raiz do projeto) e siga.
- **Travou** (erro que não resolve em 3 tentativas, falta credencial/acesso): anote em `BLOQUEIOS.md` (raiz do projeto) e pule para o próximo item que não dependa dele. Se tudo depender, pare.
- **Nunca:** apagar dados, fazer deploy (em projeto onde push = deploy, não dá push), rodar migração em banco real (migration fica escrita, não aplicada; SQL só leitura), instalar coisa fora do plano ou mudar o escopo.
- Este modo vence autorizações anteriores da sessão (ex.: "libera tudo") enquanto durar.

## Pronto quando

- Todas as fases estão concluídas ou com o bloqueio documentado.
- O build e os testes passam.
- Relatório final curto: o que foi feito em cada fase, as decisões tomadas sozinho, os bloqueios e o que o usuário precisa conferir quando voltar (com teste por aparelho).
