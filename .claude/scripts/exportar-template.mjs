// Gera a versão pública e reproduzível do Jetro (repo "Jetro") a partir de um Jetro pessoal.
// Uso: node .claude/scripts/exportar-template.mjs <pasta-destino>
// Copia só a lista branca (publico-lista.mjs). Na pasta destino, só mexe no que gerencia: CHANGELOG,
// manifest e qualquer outro arquivo do repo público ficam intactos. Termos pessoais e trocas vêm de
// eu/publico.json (dado do dono, nunca exportado); uma varredura final aborta se sobrar algo pessoal
// ou segredo. Destino com .git: grava a assinatura (.claude/hooks/.publico-sync.json) para o hook publico-atraso.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { acharSegredos } from '../hooks/segredos.mjs';
import { ESTADO, assinatura, mecanismo } from './publico-lista.mjs';

const ORIGEM = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const destino = process.argv[2] && path.resolve(process.argv[2]);
const dentroDeProjects = destino?.startsWith(path.join(ORIGEM, 'projects') + path.sep);
if (!destino || destino === ORIGEM || (destino.startsWith(ORIGEM + path.sep) && !dentroDeProjects)) {
  console.error('uso: node .claude/scripts/exportar-template.mjs <pasta-destino fora do OS ou em projects/>');
  process.exit(1);
}

// ── Termos pessoais: eu/publico.json (nunca exportado) ─────────────────────────────────────────
const TERMOS = path.join(ORIGEM, 'eu', 'publico.json');
const temGit = fs.existsSync(path.join(destino, '.git'));
if (temGit && !fs.existsSync(TERMOS)) {
  console.error('BLOQUEADO: destino é um repo e eu/publico.json não existe; sem ele a varredura não acha termo pessoal.');
  process.exit(2);
}
const termos = fs.existsSync(TERMOS) ? JSON.parse(fs.readFileSync(TERMOS, 'utf8')) : {};
const PROIBIDOS = (termos.proibidos || []).map((p) => new RegExp(p, 'i'));
const TROCAS = (termos.trocas || []).map(([de, para]) => [new RegExp(de, 'g'), para]);
const BARRA = ORIGEM.split(path.sep).join('/');
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const norm = (p) => p.split(path.sep).join('/');
const lerTexto = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');

// Troca o que é do dono por neutro: caminho do OS vira relativo, depois as trocas de eu/publico.json, em ordem.
function neutralizar(s) {
  s = s
    .replace(new RegExp(`node ${escapar(BARRA)}/\\.claude`, 'gi'), 'node .claude')
    .replace(new RegExp(`${escapar(BARRA)}/projects/`, 'gi'), 'projects/')
    .replace(new RegExp(`${escapar(ORIGEM)}\\\\projects\\\\`, 'gi'), 'projects/')
    .replace(new RegExp(`fora de \`(${escapar(BARRA)}|${escapar(ORIGEM)})\``, 'gi'), 'fora da pasta do Jetro')
    .replace(new RegExp(`${escapar(BARRA)}|${escapar(ORIGEM)}`, 'gi'), '.');
  return TROCAS.reduce((acc, [de, para]) => acc.replace(de, para), s);
}

const escritos = new Set();
function escrever(rel, conteudo) {
  const f = path.join(destino, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, conteudo);
  escritos.add(rel);
}

function copiar(rel) {
  const texto = /\.(mjs|md|json|js)$/.test(rel);
  escrever(rel, texto ? neutralizar(lerTexto(path.join(ORIGEM, rel))) : fs.readFileSync(path.join(ORIGEM, rel)));
}

fs.mkdirSync(destino, { recursive: true });
mecanismo(ORIGEM).forEach(copiar);

// ── CLAUDE.md: gerado do real, então muda junto com ele ───────────────────────────────────────
escrever('CLAUDE.md', neutralizar(lerTexto(path.join(ORIGEM, 'CLAUDE.md'))));

// ── ARCHITECTURE.md: só o contrato (problemas, não-problemas, axiomas), sem o diário de revisões ─
{
  const partes = lerTexto(path.join(ORIGEM, 'ARCHITECTURE.md')).split(/^(?=## )/m);
  const manter = partes.filter((p, i) => i === 0 || /^## (Nome|Problemas|Axiomas)/.test(p));
  escrever('ARCHITECTURE.md', neutralizar(manter.join('')));
}

// ── settings.json: só os hooks, com caminho relativo à pasta do projeto ───────────────────────
{
  const real = JSON.parse(lerTexto(path.join(ORIGEM, '.claude', 'settings.json')));
  const settings = { hooks: real.hooks };
  const texto = JSON.stringify(settings, null, 2).replace(new RegExp(escapar(BARRA), 'gi'), '$CLAUDE_PROJECT_DIR');
  escrever('.claude/settings.json', texto + '\n');
}

// ── .gitignore genérico ───────────────────────────────────────────────────────────────────────
escrever(
  '.gitignore',
  `# Projeto com git próprio fica fora; só o manifest dele entra (o hook de memória faz git add -f).
/projects/*
!/projects/.gitkeep

node_modules/
dist/
build/
.cache/
.env*
.dev.vars*
*.key
*.pem
.claude/settings.local.json
/manifest.md
.claude/hooks/memoria.log
.claude/hooks/.memoria-state.json
.claude/hooks/.memoria-marcas.json
.claude/hooks/.memoria.lock
.claude/hooks/auto-git
.claude/hooks/custos.tsv
.claude/hooks/.publico-sync.json
/toolbox/estoque/
`,
);

// ── Estrutura de dados vazia: modelos, nunca o conteúdo do dono ───────────────────────────────
escrever('projects/.gitkeep', '');
escrever('inbox/.gitkeep', '');
escrever(
  'registry/projects.md',
  `# Registry — projetos

Catálogo do que existe e como você chama. Uma entrada por projeto; detalhe fica no manifest (\`projects/<nome>/manifest.md\`).

| Nome | Aliases | Tipo | Status | O que é | Identidade própria |
|---|---|---|---|---|---|
`,
);
escrever(
  'eu/perfil.md',
  `# Perfil

Fatos que você declarou sobre si. Carregado em toda sessão. Mudou algo: substitua a linha. Teto: ~2 KB.

- **Quem:** (nome, cidade)
- **Situação:** (trabalho, momento)
- **Foco agora:** (o que mais importa nos próximos meses)
- **Domínios:** (áreas em que trabalha)
- **Stack habitual:** (ferramentas e linguagens)
- **Estação:** (sistema operacional, onde abre a sessão)
- **Metas em andamento:** (…)

Projetos e status: registry. Pessoas próximas: \`eu/pessoas.md\`.
`,
);
escrever(
  'eu/preferencias.md',
  `# Preferências — como você quer ser atendido

Regra do projeto vence dentro dele. Teto: 3 KB.

## Comunicação
- (idioma, tom, tamanho das respostas)

## Trabalho
- (como quer planos, commits, testes, confirmações)

## Código
- (convenções que a IA deve seguir)
`,
);
escrever('eu/publico.json', JSON.stringify({ _leia: 'Só para quem mantém uma versão pública do próprio Jetro: proibidos = regex que abortam o export; trocas = [regex, troca] aplicadas no texto. Nunca é exportado.', proibidos: [], trocas: [] }, null, 2) + '\n');
escrever('eu/pessoas.md', '# Pessoas próximas\n\nAbrir só quando a tarefa envolver alguém. Teto: ~1 KB.\n\n(vazio)\n');
escrever(
  'eu/novos.md',
  `# Novos — fila de fatos capturados

Escrito pelo hook de memória no fim das sessões e carregado em toda sessão: vale como perfil e preferência. \`(2x)\` = repetido em outra captura. \`digest-inbox\` consolida e remove daqui. Teto ~1,5 KB: passou, rode \`digest-inbox\`.


(fila vazia)
`,
);

// ── README e licença ──────────────────────────────────────────────────────────────────────────
escrever(
  'README.md',
  `# Jetro

**Memória persistente para o Claude Code, em arquivos de texto que você controla.** O Claude passa a saber quem você é, como gosta de trabalhar e onde cada projeto parou, sem você reexplicar a cada sessão.

## Para que serve

O Claude Code começa toda sessão sem lembrar de nada. Quem trabalha com vários projetos acaba:

- repetindo as mesmas instruções ("responda direto", "commit por item", "não mexa nisso");
- explicando de novo o que o projeto faz e onde cada coisa está;
- perdendo a decisão tomada na semana passada;
- deixando o Claude vasculhar o repositório inteiro só para se reorientar, gastando tempo e cota.

O Jetro resolve isso organizando o contexto em poucos arquivos pequenos. O Claude lê o que importa no início, trabalha, e **grava o que aprendeu ao final**, sozinho. Não é outro agente nem um app: é uma pasta com regras, hooks e skills do próprio Claude Code.

## Como funciona

\`\`\`
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
\`\`\`

Cada fato mora em **um único lugar**, e cada arquivo tem teto de tamanho, para a memória não virar peso morto.

## Um exemplo

Segunda-feira você diz: *"vamos continuar o app de agenda"*. Sem mais nada, o Claude resolve o apelido pelo registro, lê "onde paramos" do manifest ("parou no cadastro de clientes, falta validar telefone") e já retoma dali, no seu estilo de resposta, sem varrer o código.

Na sexta você comenta de passagem que passou a estudar para um concurso. Isso entra em \`eu/perfil.md\` no mesmo turno, sem ninguém perguntar "quer salvar?".

## O que está incluído

| Peça | Para quê |
|---|---|
| \`CLAUDE.md\` | O mecanismo: roteiro, regras e quando chamar cada agente. |
| \`ARCHITECTURE.md\` | O contrato e o porquê de cada decisão. Leia só se for mudar o desenho. |
| \`eu/\`, \`registry/\`, \`projects/\`, \`inbox/\` | Seus dados. Vêm vazios. |
| Hook \`memoria\` | Ao fim da sessão (e ao compactar), resume e grava a memória. |
| Hook \`manifest-atraso\` | Avisa quando o manifest ficou para trás do último commit. |
| Hook \`revisor-push\` | Barra push grande (150+ linhas) até uma revisão rodar. |
| Hook \`segredos\` | Trava commit que contenha chave, token ou senha. |
| Hook \`leitura-grande\` | Bloqueia ler de uma vez arquivo enorme; manda buscar o trecho. |
| Hook \`config-protection\` | Barra afrouxar lint ou tsconfig para passar na verificação. |
| Hook \`cost-tracker\` | Grava o custo de cada sessão (inclusive o do hook de memória) em \`.claude/hooks/custos.tsv\`. |
| Hook \`suggest-compact\` | Avisa quando o contexto passa de 120 mil tokens. Qualquer hook, menos o de memória, desliga com a variável \`JETRO_HOOKS_DESLIGADOS=nome1,nome2\` (ou \`*\`). |
| Agentes \`explorador\`, \`atualizador\`, \`revisor\` | Trabalho mecânico e barato: buscar, sincronizar manifest, revisar. |
| Skills \`kit-*\` | Caixa de ferramentas por tipo de tarefa: \`kit-landing-page\` (método de conversão + script que tira print de celular e computador e aponta defeitos) e \`kit-app-web\` (feature ponta a ponta + regras de código TypeScript). |
| \`toolbox/\` | Almoxarifado: o README lista repositórios de onde tirar peças prontas; \`node toolbox/estoque.mjs\` clona em \`toolbox/estoque/\` (fora do git). Tarefa sem kit monta um a partir dali. |
| Skill \`os-tradutor\` | Pedido bagunçado (áudio, ideias misturadas, objetivo vago) vira pedido claro antes de executar: "Entendi assim", "Pronto quando", o que assumiu e o que ficou fora; no máximo 3 perguntas de clicar, numa rodada só. |
| Skills \`os-*\` | Importar projeto, retomar de onde parou, fechar sessão, processar a inbox, aplicar padrão de um projeto em outro, método para tarefas longas. |
| \`.claude/scripts/verificar.mjs\` | Roda typecheck, lint, build e testes e devolve só as falhas. |
| Agente \`publicador\` e hook \`publico-atraso\` | Para quem mantém uma versão pública do próprio Jetro: o hook avisa no início da sessão quando o mecanismo mudou; o agente exporta só a lista branca, generaliza o que é pessoal, escreve o CHANGELOG e deixa o commit pronto, sem push. Termos pessoais ficam em \`eu/publico.json\`. |

Conhecimento técnico que você reaproveita entre projetos vira skill \`.claude/skills/tec-<nome>/\`, que o Claude carrega sozinho quando a tarefa casa com a descrição. Nenhuma vem pronta: nascem do seu uso. Kits (\`kit-*\`) podem vir prontos: são ferramenta, não lição vivida.

## O que o Jetro não é

- Não é gestor de tarefas: guarda contexto, não agenda nem cobra.
- Não documenta seus projetos por dentro: o manifest é um resumo com ponteiros.
- Não é multiusuário: é a memória de uma pessoa.
- Não muda como o Claude raciocina nem limita o que ele sabe: só informa o contexto.

## Como começar

1. Use este repositório como template (botão *Use this template*) e deixe-o **privado**: ele vai guardar dados pessoais.
2. Instale o [Claude Code](https://claude.com/claude-code) e o Node 20+.
3. Abra a sessão sempre na raiz desta pasta.
4. Preencha \`eu/perfil.md\` e \`eu/preferencias.md\` (ou peça ao Claude para entrevistar você).
5. Opcional: para o hook de memória fazer commit e push sozinho no fim da sessão, crie o arquivo vazio \`.claude/hooks/auto-git\`.

## Aviso

O hook de memória chama \`claude -p\` em segundo plano para resumir sessões. Isso consome sua cota. Os hooks foram desenvolvidos e testados no Windows.

## Licença

MIT.
`,
);
escrever(
  'LICENSE',
  `MIT License

Copyright (c) ${new Date().getFullYear()} Jetro contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`,
);

// Arquivo gerenciado (lista branca) que não veio desta vez saiu do mecanismo: sai do público também.
// Destino com git: só o que o git rastreia (arquivo local não rastreado fica).
const rastreados = temGit && new Set(execFileSync('git', ['-C', destino, 'ls-files'], { encoding: 'utf8' }).split('\n'));
(function limpar(dir) {
  for (const nome of fs.readdirSync(dir)) {
    if (nome === '.git' || nome === 'node_modules') continue;
    const f = path.join(dir, nome);
    const rel = norm(path.relative(destino, f));
    if (fs.statSync(f).isDirectory()) { limpar(f); if (!fs.readdirSync(f).length) fs.rmdirSync(f); continue; }
    if (/^(\.claude\/(hooks|agents|scripts|skills)|templates)\//.test(rel) && !escritos.has(rel) && (!rastreados || rastreados.has(rel))) fs.rmSync(f);
  }
})(destino);

// ── Varredura final: aborta se sobrou algo pessoal ────────────────────────────────────────────
const achados = [];
(function varrer(dir) {
  for (const nome of fs.readdirSync(dir)) {
    if (nome === '.git') continue;
    const f = path.join(dir, nome);
    if (fs.statSync(f).isDirectory()) { varrer(f); continue; }
    if (!/\.(mjs|md|json|js|gitignore)$|^\.gitignore$/.test(nome)) continue;
    const rel = norm(path.relative(destino, f));
    if (rel === 'manifest.md') continue; // manifest do dono, nunca vai pro repo (.gitignore)
    const linhas = lerTexto(f).split('\n');
    linhas.forEach((l, i) => {
      if (rel !== 'LICENSE' && PROIBIDOS.some((r) => r.test(l))) achados.push(`${rel}:${i + 1}: ${l.trim().slice(0, 110)}`);
    });
    for (const s of acharSegredos(linhas.map((l) => '+' + l).join('\n'))) achados.push(`${rel}: segredo? ${s}`);
  }
})(destino);

if (achados.length) {
  console.error(`BLOQUEADO: ${achados.length} ocorrência(s) pessoal(is) no template:\n` + achados.join('\n'));
  process.exit(2);
}
if (temGit) {
  fs.writeFileSync(path.join(ORIGEM, ESTADO), JSON.stringify({ destino: norm(path.relative(ORIGEM, destino)), arquivos: assinatura(ORIGEM) }, null, 1) + '\n');
}
console.log(`template gerado em ${destino}`);
