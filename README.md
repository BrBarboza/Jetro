# Jetro

**Memória persistente para o Claude Code, em arquivos de texto que você controla.** O Claude passa a saber quem você é, como gosta de trabalhar e onde cada projeto parou, sem você reexplicar a cada sessão.

## Para que serve

O Claude Code começa toda sessão sem lembrar de nada. Quem trabalha com vários projetos acaba:

- repetindo as mesmas instruções ("responda direto", "commit por item", "não mexa nisso");
- explicando de novo o que o projeto faz e onde cada coisa está;
- perdendo a decisão tomada na semana passada;
- deixando o Claude vasculhar o repositório inteiro só para se reorientar, gastando tempo e cota.

O Jetro resolve isso organizando o contexto em poucos arquivos pequenos. O Claude lê o que importa no início, trabalha, e **grava o que aprendeu ao final**, sozinho. Não é outro agente nem um app: é uma pasta com regras, hooks e skills do próprio Claude Code.

## Como funciona

```
  você abre a sessão na raiz do Jetro
              |
              v
  carrega sempre (pequeno, com teto de tamanho):
    CLAUDE.md          regras de como o Claude trabalha
    eu/perfil.md       quem você é
    eu/preferencias.md como você quer ser atendido
    eu/novos.md        fatos capturados na última sessão
              |
              v
  você cita um projeto ("vamos mexer no site da padaria")
    registry/projects.md       resolve apelido para o projeto
    projects/<nome>/manifest.md  missão, mapa, onde paramos
              |
              v
  o Claude executa a tarefa com todas as ferramentas de sempre
              |
              v
  ao fim da sessão, os hooks gravam sozinhos:
    o que você declarou sobre si          para eu/
    onde o projeto parou                  para o manifest
    ideias soltas                         para inbox/
    padrão que se repetiu 2 vezes         vira preferência ou skill
```

Cada fato mora em **um único lugar**, e cada arquivo tem teto de tamanho, para a memória não virar peso morto.

## Um exemplo

Segunda-feira você diz: *"vamos continuar o app de agenda"*. Sem mais nada, o Claude resolve o apelido pelo registro, lê "onde paramos" do manifest ("parou no cadastro de clientes, falta validar telefone") e já retoma dali, no seu estilo de resposta, sem varrer o código.

Na sexta você comenta de passagem que passou a estudar para um concurso. Isso entra em `eu/perfil.md` no mesmo turno, sem ninguém perguntar "quer salvar?".

## O que está incluído

| Peça | Para quê |
|---|---|
| `CLAUDE.md` | O mecanismo: roteiro, regras e quando chamar cada agente. |
| `ARCHITECTURE.md` | O contrato e o porquê de cada decisão. Leia só se for mudar o desenho. |
| `eu/`, `registry/`, `projects/`, `inbox/` | Seus dados. Vêm vazios. |
| Hook `memoria` | Ao fim da sessão (e ao compactar), resume e grava a memória. |
| Hook `manifest-atraso` | Avisa quando o manifest ficou para trás do último commit. |
| Hook `revisor-push` | Barra push grande (150+ linhas) até uma revisão rodar. |
| Hook `segredos` | Trava commit que contenha chave, token ou senha. |
| Hook `leitura-grande` | Bloqueia ler de uma vez arquivo enorme; manda buscar o trecho. |
| Hook `config-protection` | Barra afrouxar lint ou tsconfig para passar na verificação. |
| Hook `cost-tracker` | Grava o custo de cada sessão (inclusive o do hook de memória) em `.claude/hooks/custos.tsv`. |
| Hook `suggest-compact` | Avisa quando o contexto passa de 120 mil tokens. Qualquer hook, menos o de memória, desliga com a variável `JETRO_HOOKS_DESLIGADOS=nome1,nome2` (ou `*`). |
| Agentes `explorador`, `atualizador`, `revisor` | Trabalho mecânico e barato: buscar, sincronizar manifest, revisar. |
| Skills `kit-*` | Caixa de ferramentas por tipo de tarefa: `kit-landing-page` (método de conversão + script que tira print de celular e computador e aponta defeitos) e `kit-app-web` (feature ponta a ponta + regras de código TypeScript). |
| `toolbox/` | Almoxarifado: o README lista repositórios de onde tirar peças prontas; `node toolbox/estoque.mjs` clona em `toolbox/estoque/` (fora do git). Tarefa sem kit monta um a partir dali. |
| Skill `os-tradutor` | Pedido bagunçado (áudio, ideias misturadas, objetivo vago) vira pedido claro antes de executar: "Entendi assim", "Pronto quando", o que assumiu e o que ficou fora; no máximo 3 perguntas de clicar, numa rodada só. |
| Skills `os-*` | Importar projeto, retomar de onde parou, fechar sessão, processar a inbox, aplicar padrão de um projeto em outro, método para tarefas longas. |
| Skill `os-modo-solo` | Para quando você vai sair: digite `/os-modo-solo` e o Claude executa o plano inteiro sem pedir confirmação, anota as decisões que tomou e o que travou, e nunca apaga dados, faz deploy nem aplica migração. |
| `.claude/scripts/verificar.mjs` | Roda typecheck, lint, build e testes e devolve só as falhas. |
| Agente `publicador` e hook `publico-atraso` | Para quem mantém uma versão pública do próprio Jetro: o hook avisa no início da sessão quando o mecanismo mudou; o agente exporta só a lista branca, generaliza o que é pessoal, escreve o CHANGELOG e deixa o commit pronto, sem push. Termos pessoais ficam em `eu/publico.json`. |

Conhecimento técnico que você reaproveita entre projetos vira skill `.claude/skills/tec-<nome>/`, que o Claude carrega sozinho quando a tarefa casa com a descrição. Nenhuma vem pronta: nascem do seu uso. Kits (`kit-*`) podem vir prontos: são ferramenta, não lição vivida.

## O que o Jetro não é

- Não é gestor de tarefas: guarda contexto, não agenda nem cobra.
- Não documenta seus projetos por dentro: o manifest é um resumo com ponteiros.
- Não é multiusuário: é a memória de uma pessoa.
- Não muda como o Claude raciocina nem limita o que ele sabe: só informa o contexto.

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
