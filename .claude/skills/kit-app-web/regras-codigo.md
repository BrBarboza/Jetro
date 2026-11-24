# Regras de código — app web TypeScript

Origem: `ecc @ 4adeee6` — `rules/common/{coding-style,security,testing,code-review,patterns}.md` e `rules/typescript/{coding-style,patterns,security,testing}.md`. Emagrecido para a stack do usuário; o que contradiz o Jetro saiu (ex.: TDD obrigatório e cobertura de 80% viraram "teste do que pode quebrar"; repository pattern só quando houver segundo armazenamento real). ENGENHARIA MÍNIMA do CLAUDE.md vence em conflito.

## Tipos
- Tipar parâmetros e retorno de função exportada e utilitário compartilhado; deixar inferir variável local óbvia.
- `any` proibido em código do app; dado externo (request, resposta de API, JSON do n8n, linha do Supabase sem tipo) entra como `unknown` e é estreitado por schema.
- `interface` para forma de objeto extensível; `type` para união, interseção, utilitário. União de literais em vez de `enum`.
- Props de componente com tipo nomeado; callback tipado; sem `React.FC`.
- Tipos do banco gerados (`supabase gen types`), nunca escritos à mão.

## Forma
- Imutável: criar objeto novo, não mutar o recebido (estado React, payload, cache).
- Retorno cedo em vez de aninhar (>4 níveis é sinal). Função focada (~50 linhas), arquivo coeso (~400; 800 é teto mole).
- Nome diz o que guarda/faz; booleano lê como afirmação (`podeEditar`, `estaAtivo`). Número com significado vira constante nomeada.
- Organizar por funcionalidade/domínio, não por tipo de arquivo.
- Sem abstração antes do segundo uso real.

## Erros e entrada
- Validar na borda (server function, Worker, webhook) com schema; falhar cedo com mensagem clara.
- Nunca engolir erro: tratar ou propagar. Na tela, mensagem útil e caminho de saída; no servidor, log com contexto.
- Erro para o usuário não vaza segredo, SQL nem stack.
- Sem `console.log` esquecido em produção.

## Segurança (antes de cada commit)
- Nenhum segredo no código; tudo em env/secret do Worker/Supabase; checar presença na inicialização.
- Consulta parametrizada (nunca SQL montado com texto do usuário). HTML do usuário nunca vira `dangerouslySetInnerHTML` sem sanitizar.
- Autorização no servidor (RLS + checagem de cargo), não só esconder botão.
- Limite de taxa em endpoint público (login, webhook, formulário).
- Segredo exposto: girar.

## Testes
- Testar o que pode quebrar e custa caro: regra de negócio, permissão, cálculo de dinheiro, integração. Nome do teste diz o comportamento ("recusa desconto acima do teto").
- Estrutura Arrange-Act-Assert. Falhou: corrigir a implementação, não o teste (salvo teste errado).
- Fluxo crítico de usuário em e2e (Playwright) quando existir no projeto.

## Revisão antes de dar pronto
Legível e bem nomeado · sem aninhamento fundo · erros tratados · sem segredo · sem `console.log` · teste do que mudou · verificar.mjs verde. Severidade: CRÍTICO (segurança, perda de dado) bloqueia; ALTO (bug) corrige antes de subir; resto anota.
