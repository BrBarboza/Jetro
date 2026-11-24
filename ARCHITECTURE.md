# ARCHITECTURE.md

Contrato arquitetural do Jetro, um Knowledge OS pessoal para trabalhar com IA. Muda pouco — sobrevive a troca de modelo/prompt.

**Corte entre os dois arquivos:** este aqui é decisão e justificativa, sem mecanismo. `CLAUDE.md` é mecanismo, sem justificativa. Axioma que precisa citar nome de arquivo, campo ou passo pra ser entendido está no arquivo errado.

## Problemas que este OS resolve

- Redescoberta: não reprocessar um projeto inteiro toda sessão pra lembrar decisão/padrão já validado.
- Conhecimento reutilizável perdido entre projetos: um padrão, tecnologia ou lição de um projeto não beneficia os outros automaticamente — sem um lugar central por conceito, cada projeto reaprende a mesma coisa do zero.
- Repetição de instrução sobre como o operador trabalha: padrão de trabalho que só existe na cabeça do usuário precisa ser reensinado toda vez que reaparece.
- Perda de contexto entre sessões: "onde paramos" sem abrir tudo manualmente.
- Onboarding de projeto novo: gerar entendimento estruturado de um projeto existente sem invadir a identidade dele.
- Captura crua sem custo de decisão: ideia/link/áudio no meio do dia entra sem exigir classificação na hora.
- Contexto sobre o dono: quem ele é, situação, metas e pessoas próximas disponíveis em qualquer domínio, sem reexplicar.
- Referência por apelido: "aquele projeto do atendimento" chega no projeto certo sem abrir pasta por pasta.

## Problemas que este OS explicitamente NÃO tenta resolver

- Não é gestor de tarefas/projeto (não substitui Linear, Jira, etc — só referencia).
- Não documenta o projeto por dentro — cada projeto mantém sua própria doc; o manifest é resumo/pointer, não a fonte.
- Não decide por múltiplos usuários/times — é OS pessoal de um dono.
- Não projeta estrutura pra escala que ainda não existe.
- Não orquestra enxame nem execução autônoma multi-tarefa. Subagente só existe com papel, modelo e gatilho fixos, chamado por regra explícita.
- Não muda como a IA raciocina nem limita o que ela sabe — ver "Contexto, não comportamento".

## Axiomas

**Contexto, não comportamento.** O OS informa quem é o dono, onde está cada coisa e o que já foi decidido; nunca reduz a capacidade da IA. Memória define o quê (objetivo, gosto, decisão); o como técnico é da IA, com o melhor conhecimento disponível. Padrão gravado não vence prática melhor em silêncio. O contexto carregado sempre tem teto, porque cada token do OS tira espaço da tarefa.

**Fonte única por fato.** Todo dado mora em exatamente um arquivo. Duplicação é bug arquitetural, não redundância inofensiva. Sem exceção — inclusive a que existia antes: `Root path` deixou de ser dado duplicado quando localização virou convenção (ver abaixo), e data de acesso/revisão saiu do registry porque o próprio manifest já a carrega.

**Uso real comprovado é a condição de existência.** Vale pra nascer e pra continuar existindo: camada só nasce quando um problema real de duplicação/confusão aparece no uso, nunca por antecipação; e ausência de uso real (não hipotético, não "pode ser útil um dia") é motivo suficiente pra remover. Todo arquivo/camada carrega o ônus de justificar por que o comportamento que ele entrega não caberia no `CLAUDE.md` ou no manifest do projeto. Adicionar camada nova é tratado como fracasso de simplificação, a menos que prove comportamento real imediatamente. Ferramenta é a exceção: conhecimento nasce do uso, mas ferramenta pode chegar pronta, porque funcionário novo já chega com a caixa (Revisão de 24/11/2026).

**Kernel sem estado.** `CLAUDE.md` descreve forma e fluxo — nunca conteúdo de instância de projeto (nome, contagem, lista, decisão específica). Quem é o dono mora em `eu/`, importado pelo kernel (carga incondicional, sem gatilho).

**Menor escopo vence.** Informação mora na camada mais específica que ainda a serve.

**A workspace é o OS; a autoria é do projeto.** Os projetos moram fisicamente dentro de `projects/` — é ali que o usuário constrói. "Projeto é independente do SO" nunca foi sobre localização física: é sobre autoria. O OS não escreve arquivo de OS dentro de projeto com identidade própria (repo/CLAUDE.md/skills próprios), não reorganiza a estrutura dele e não reescreve a doc dele. Conviver na mesma árvore de diretório não afeta isso.

**Localização é convenção, não descoberta nem registro.** Todo projeto vive em `projects/<nome>/`. Não há nada a resolver, gravar ou procurar — o nome do projeto já é o caminho. Registrar path explicitamente só faz sentido pra exceção real (projeto que, por motivo concreto, mora fora dessa convenção). Ausência de exceção registrada significa convenção, nunca "desconhecido". O dono não fala por nome de pasta: apelidos e descrição de uma frase vivem no registry, que é o único lugar consultado pra resolver "qual projeto é esse".

**Dentro do projeto, também é mapa, não busca.** Manifest é ponto de entrada com teto (~3 KB): missão, mapa de onde está cada coisa, estado e onde paramos. Diário de sessão não cabe ali — histórico longo é do sistema de contexto do projeto ou de `_arquivo/`.

**Custo de leitura é limite arquitetural.** `projects/` contém código real, com árvore de dependências (`node_modules`, build, cache) — uma varredura ingênua ali passou de 175 mil arquivos e estourou timeout na prática. Nenhuma operação deste OS pode ter custo proporcional ao número de arquivos dentro de `projects/`. Leitura de estrutura para na camada de manifest; entrar num projeto é ato dirigido a caminho conhecido, nunca exploração.

**Coordena, não absorve.** Se um projeto já tem sistema de contexto persistente próprio (ex: Context-OS `.ctxos/`), o SO nunca duplica esse conhecimento nem escreve dentro dele — detecta, ativa e aponta pra ele. Presença ou ausência é transparente pro fluxo.

**Conhecimento fica onde carrega sozinho.** Técnica reutilizável entre projetos vira skill `tec-*`, que o Claude Code carrega pela descrição quando a tarefa casa; como executar um tipo de tarefa (método, ferramentas, "pronto quando") vira skill `kit-*`, que aponta para as `tec-*` sem repetir; jeito de trabalhar do dono vira linha em `eu/preferencias.md`, que carrega sempre; padrão de um projeto só fica no projeto. Conhecimento que depende de alguém abrir um índice não é lido (Revisão de 17/11/2026).

**Fato declarado entra na hora; padrão inferido exige repetição.** O que o dono diz sobre si (quem é, situação, meta, pessoa, preferência) entra em `eu/` na primeira vez — esperar repetição para fato declarado é perder memória. Padrão de trabalho e técnica, que são inferência, só viram regra ou skill permanente depois de 2+ ocorrências reais — nunca por evento isolado, nunca por achismo. Gatilho condicional pra dado de identidade já falhou uma vez aqui (`identity/`, jul/2026): por isso `eu/` é importado pelo kernel, não lido por gatilho.

**Captura crua não é classificação.** Entrada bruta pode ficar não classificada por tempo indeterminado sem que isso seja dívida — o custo de decidir no momento da captura é maior que o custo de decidir em lote depois. Distribuir é ato deliberado, não reflexo de sessão — vale só para captura crua sem repetição; o que se repete 2x é promovido sozinho (Revisão de 15/11/2026).

**Não reimplementa o que o Claude Code já é.** Skill, Plugin/MCP, subagent e hook nativos são usados diretamente — nunca reescritos como pasta markdown paralela que desatualiza sozinha. Vocabulário formal: **Skill** = procedimento reutilizável, não conhece ferramenta específica. **Plugin/MCP** = acesso a integração externa, sem lógica própria; ligado por projeto, não global. **Subagent** = mecanismo nativo pra isolar contexto ou baratear trabalho mecânico, com papel e modelo fixos. **Hook** = o que tem que acontecer sempre, sem depender de alguém lembrar (ex.: gravar memória no fim da sessão). Nenhum deles ganha catálogo/contrato próprio deste OS em volta. Mas comportamento entregue por skill, agente ou hook é sempre declarado com o **nome literal** — descrever só a função deixa o kernel impossível de auditar por leitura.

**Inteligência fica no modelo principal.** Trabalho mecânico vai primeiro para código, que não erra por interpretar. Modelo barato (subagente ou hook) só entra quando o mecânico exige ler texto: buscar, gravar o que foi dito. Decisão, arquitetura e código são do modelo principal. Loop só existe com critério de saída verificável e limite de voltas.

**SO organiza, não documenta.** Manifest é resumo perecível, não substitui a doc real do projeto. Resumo perecível exige regra de revalidação — data de revisão sem consequência é decoração.

**Domínio é a vida do dono; software é o mais frequente.** Projeto de qualquer domínio (conteúdo, igreja, estudo, casa) vive em `projects/<nome>/`, nem que seja só com um manifest, e entra no registry com tipo. Isso não transforma o OS em gestor de tarefas: ele guarda contexto, não agenda nem cobra execução.

**Camadas internas são invisíveis.** Registry e Manifest são mecanismo, não vocabulário de conversa. Nunca aparecem numa resposta ao usuário.

**Ativação por intenção, não por comando.** Mencionar um projeto pelo nome já basta pra carregar contexto — nunca exigir "abra o manifest".

**Silêncio é sobre perguntar, não sobre agir.** Gravar automaticamente não quebra o silêncio; interromper o trabalho pra pedir classificação quebra. Nenhuma pergunta item a item durante a execução. Marcação explícita do usuário grava na hora, sem perguntar. A única exceção que **pergunta** é ação destrutiva, difícil de reverter ou que chega a outras pessoas (sempre para, mesmo em meio a tarefa longa). Push e deploy do próprio projeto não entram aí desde 28/10/2026: o dono dispara a sessão e sai, e liberou subir desde que não quebre o projeto — por isso a condição é verificação verde, não confirmação. Resto vira resumo único no encerramento.

**SO decide sozinho onde salvar.** Classificação de conhecimento produzido em sessão nunca é trabalho do usuário.

## Nome

**Jetro** (04/11/2026). Em Êxodo 18, Jetro vê Moisés julgando tudo sozinho e o ensina a delegar o pequeno a outros e ficar só com o que exige ele — o mesmo desenho deste OS: modelo principal decide, subagentes baratos fazem o mecânico.
