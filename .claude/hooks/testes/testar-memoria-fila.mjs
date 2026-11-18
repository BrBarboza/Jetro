// Testes da promoção da fila, da soma de "Padrão?" e da marca de teto do hook de memória.
// OS descartável e modelo falso (OS_MEMORIA_CMD): nada de rede, nada de Haiku.
// Uso: node .claude/hooks/testes/testar-memoria-fila.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../memoria.mjs');
const barras = (p) => p.split(path.sep).join('/');
const raiz = barras(fs.mkdtempSync(path.join(os.tmpdir(), 'testar-fila-')));
const jetro = `${raiz}/os`;
let falhas = 0;
const ok = (nome, cond, extra = '') => {
  if (!cond) falhas++;
  console.log(`${cond ? 'ok  ' : 'FALHA'} ${nome}${cond ? '' : ' ' + extra}`);
};
const ler = (rel) => fs.readFileSync(`${jetro}/${rel}`, 'utf8');
const escrever = (rel, txt) => {
  fs.mkdirSync(path.dirname(`${jetro}/${rel}`), { recursive: true });
  fs.writeFileSync(`${jetro}/${rel}`, txt);
};

const CABECALHO = '# Novos — fila\n\nTexto de apoio.\n\n';
escrever('.claude/hooks/.keep', '');
escrever('eu/perfil.md', '# Perfil\n\n- **Quem:** usuário.\n\nProjetos: registry.\n');
escrever('eu/preferencias.md', '# Preferências\n\n## Comunicação\n- Direto.\n\n## Trabalho\n- Plano curto.\n\n## Estudo\n- Perguntas juntas.\n');
escrever('eu/novos.md', `${CABECALHO}(fila vazia)\n`);
escrever('CLAUDE.md', '# kernel\n');
escrever('projects/ProjetoA/manifest.md', '# ProjetoA\n');
escrever('projects/Pequeno/manifest.md', '# Pequeno\n');

// Modelo falso: devolve o JSON de FAKE_RESP e guarda o prompt recebido em FAKE_IN.
const fake = `${raiz}/fake.mjs`;
fs.writeFileSync(fake, "import fs from 'node:fs'; fs.writeFileSync(process.env.FAKE_IN, fs.readFileSync(0, 'utf8')); process.stdout.write(fs.readFileSync(process.env.FAKE_RESP, 'utf8'));");

let n = 0;
function sessao(resposta) {
  const id = `sessao${++n}`;
  const transcript = `${raiz}/${id}.jsonl`;
  const falas = [1, 2, 3].map((i) => JSON.stringify({ type: 'user', message: { content: `fala ${i} da ${id}` } }));
  fs.writeFileSync(transcript, falas.join('\n') + '\n');
  const job = `${raiz}/job-${n}.json`;
  fs.writeFileSync(job, JSON.stringify({ session_id: id, transcript_path: transcript, cwd: jetro }));
  fs.writeFileSync(`${raiz}/resp.json`, JSON.stringify({ projeto: null, fatos: [], preferencias: [], onde_paramos: null, padroes: [], ...resposta }));
  const r = spawnSync(process.execPath, [HOOK, '--worker', job], {
    encoding: 'utf8',
    env: {
      ...process.env,
      OS_ROOT: jetro,
      OS_MEMORIA_CMD: `node "${fake}"`,
      FAKE_RESP: `${raiz}/resp.json`,
      FAKE_IN: `${raiz}/prompt-${n}.txt`,
    },
  });
  return { r, prompt: fs.existsSync(`${raiz}/prompt-${n}.txt`) ? fs.readFileSync(`${raiz}/prompt-${n}.txt`, 'utf8') : '' };
}
const logHook = () => fs.readFileSync(`${jetro}/.claude/hooks/memoria.log`, 'utf8');
const linhaDe = (txt, trecho) => txt.split('\n').filter((l) => l.includes(trecho));

// 1. Preferência repetida em duas sessões: sobe para eu/preferencias.md e sai da fila.
const PREF = 'Quer respostas curtas com exemplo';
let s = sessao({ preferencias: [PREF] });
ok('sessão 1: entra na fila', ler('eu/novos.md').includes(`- preferência: ${PREF}`) && !ler('eu/preferencias.md').includes(PREF), logHook());
ok('fila não mostra mais "(fila vazia)" com item dentro', !ler('eu/novos.md').includes('(fila vazia)'));
s = sessao({ preferencias: [PREF] });
ok('sessão 2: promovida para preferencias', ler('eu/preferencias.md').includes(`- ${PREF}`), logHook());
ok('promovida cai dentro de "## Trabalho"', /## Trabalho\n- Plano curto\.\n- Quer respostas curtas/.test(ler('eu/preferencias.md')));
ok('promovida sai da fila', !ler('eu/novos.md').includes(PREF));
ok('bloco vazio da fila some e volta "(fila vazia)"', !ler('eu/novos.md').includes('## 20') && ler('eu/novos.md').includes('(fila vazia)'), ler('eu/novos.md'));
ok('texto promovido sem prefixo nem contagem', !/- preferência:|\(2x\)/.test(ler('eu/preferencias.md')));

// 2. Fato repetido vai para o perfil.
const FATO = 'Mora no Cidade Exemplo';
sessao({ fatos: [FATO] });
sessao({ fatos: [FATO] });
ok('fato repetido vai para eu/perfil.md', ler('eu/perfil.md').includes(`- ${FATO}`) && !ler('eu/novos.md').includes(FATO), logHook());
ok('fato entra na lista, antes do rodapé', ler('eu/perfil.md').indexOf(FATO) < ler('eu/perfil.md').indexOf('Projetos: registry.'));

// 3. Preferência que cita projeto fica na fila, marcada, e nada é escrito no projeto.
const manifestAntes = ler('projects/ProjetoA/manifest.md');
const PROJ = 'No ProjetoA prefere botão azul';
sessao({ preferencias: [PROJ] });
sessao({ preferencias: [PROJ] });
ok('preferência de projeto fica na fila com (2x) e marca', ler('eu/novos.md').includes(`- preferência: ${PROJ} (2x) [→ projeto: ProjetoA]`), ler('eu/novos.md'));
ok('preferência de projeto não vai para eu/', !ler('eu/preferencias.md').includes('botão azul'));
ok('projeto não é tocado', ler('projects/ProjetoA/manifest.md') === manifestAntes);
sessao({ preferencias: [PROJ] });
ok('terceira vez só conta, mantém a marca', ler('eu/novos.md').includes(`${PROJ} (3x) [→ projeto: ProjetoA]`), ler('eu/novos.md'));

// 4. "Padrão?" soma entre sessões, em vez de abrir entrada nova.
const PADRAO = 'Sempre pedir print antes de mexer em tela';
const hoje = () => fs.readdirSync(`${jetro}/inbox`).filter((f) => f.endsWith('.md'));
sessao({ padroes: [PADRAO] });
ok('padrão novo cria entrada', hoje().length === 1 && ler(`inbox/${hoje()[0]}`).includes(PADRAO));
s = sessao({ padroes: [] });
ok('prompt do Haiku leva os padrões pendentes', s.prompt.includes('PADRÕES PENDENTES') && s.prompt.includes(`- ${PADRAO}`), s.prompt.slice(-400));
ok('prompt manda repetir o texto exato do padrão', s.prompt.includes('PADRÕES PENDENTES, inclua em "padroes" com o texto EXATO'));
sessao({ padroes: [PADRAO] });
let inbox = ler(`inbox/${hoje()[0]}`);
ok('mesma frase em outra sessão ganha (2x) na entrada existente', inbox.includes(`${PADRAO} (2x)`), inbox);
ok('não abre entrada nova', linhaDe(inbox, 'Padrão?').length === 1, inbox);
sessao({ padroes: [`${PADRAO} (2x)`] });
inbox = ler(`inbox/${hoje()[0]}`);
ok('terceira soma 3x, ainda uma entrada só', inbox.includes(`${PADRAO} (3x)`) && linhaDe(inbox, 'Padrão?').length === 1, inbox);

// 5. Teto: manifest acima do limite marca o topo da fila; some quando condensado.
const marca = (l) => l.startsWith('condensar antes de começar: ');
escrever('projects/Pequeno/manifest.md', '# Pequeno\n' + 'x'.repeat(4000));
sessao({});
let topo = ler('eu/novos.md').split('\n');
ok('manifest acima do teto marca o topo da fila', topo[0].startsWith('# ') && marca(topo[1]) && topo[1].includes('projects/Pequeno/manifest.md 4010/3584 B'), topo.slice(0, 3).join(' | '));
ok('manifest dentro do teto não é marcado', !ler('eu/novos.md').includes('projects/ProjetoA/manifest.md'));
sessao({});
ok('marca não duplica a cada evento', ler('eu/novos.md').split('\n').filter(marca).length === 1);
escrever('projects/Pequeno/manifest.md', '# Pequeno\n');
sessao({});
ok('marca some quando o arquivo é condensado', !ler('eu/novos.md').includes('condensar antes de começar'));

escrever('eu/preferencias.md', '# Preferências\n\n## Trabalho\n' + `- ${'y'.repeat(3300)}\n`);
sessao({});
ok('preferencias acima de 3 KB é marcada', ler('eu/novos.md').includes('condensar antes de começar: eu/preferencias.md'), ler('eu/novos.md').slice(0, 200));
escrever('eu/preferencias.md', '# Preferências\n\n## Trabalho\n- ok\n');
escrever('CLAUDE.md', '# kernel\n' + 'z'.repeat(14000));
sessao({});
ok('carga fixa acima de 13 KB é marcada', ler('eu/novos.md').includes('condensar antes de começar: carga-fixa'), ler('eu/novos.md').slice(0, 200));
ok('sem erro no log do hook', !logHook().includes('erro') && !logHook().includes('tetos:'), logHook().slice(-300));

fs.rmSync(raiz, { recursive: true, force: true, maxRetries: 5 });
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
