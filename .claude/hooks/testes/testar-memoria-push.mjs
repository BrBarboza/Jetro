// Testes do commit e push do hook de memória, com OS e remoto descartáveis. Sem chamar modelo.
// Uso: node .claude/hooks/testes/testar-memoria-push.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../memoria.mjs');
const barras = (p) => p.split(path.sep).join('/');
const raiz = barras(fs.mkdtempSync(path.join(os.tmpdir(), 'testar-memoria-')));
let falhas = 0;
const ok = (nome, cond, extra = '') => {
  if (!cond) falhas++;
  console.log(`${cond ? 'ok  ' : 'FALHA'} ${nome}${cond ? '' : ' ' + extra}`);
};
const git = (dir, ...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const bare = `${raiz}/remoto.git`;
const jetro = `${raiz}/os`;
execFileSync('git', ['init', '-q', '--bare', '-b', 'main', bare]);
execFileSync('git', ['clone', '-q', bare, jetro], { stdio: 'ignore' });
git(jetro, 'config', 'user.email', 't@t');
git(jetro, 'config', 'user.name', 't');
fs.mkdirSync(`${jetro}/.claude/hooks`, { recursive: true });
fs.writeFileSync(`${jetro}/.claude/hooks/auto-git`, '');
fs.writeFileSync(`${jetro}/.gitignore`, '/projects/*\n!/projects/semgit/\n/.claude/hooks/\n/transcript.jsonl\n');
git(jetro, 'add', '.');
git(jetro, 'commit', '-qm', 'inicio');
git(jetro, 'push', '-qu', 'origin', 'HEAD:main');

const transcript = `${jetro}/transcript.jsonl`;
fs.writeFileSync(transcript, '');
let n = 0;
const evento = () => {
  const job = `${raiz}/job-${++n}.json`;
  fs.writeFileSync(job, JSON.stringify({ session_id: 's', transcript_path: transcript, cwd: jetro }));
  return spawnSync(process.execPath, [HOOK, '--worker', job], { encoding: 'utf8', env: { ...process.env, OS_ROOT: jetro } });
};
const noRemoto = () => git(bare, 'ls-tree', '-r', '--name-only', 'main');
const logHook = () => fs.readFileSync(`${jetro}/.claude/hooks/memoria.log`, 'utf8');

// Manifest em projeto sem git e em projeto com git próprio; o código do projeto com git fica fora.
fs.mkdirSync(`${jetro}/projects/semgit`, { recursive: true });
fs.writeFileSync(`${jetro}/projects/semgit/manifest.md`, 'v1\n');
fs.writeFileSync(`${jetro}/projects/semgit/texto.md`, 'x\n');
fs.mkdirSync(`${jetro}/projects/comgit`);
execFileSync('git', ['init', '-q', `${jetro}/projects/comgit`]);
fs.writeFileSync(`${jetro}/projects/comgit/manifest.md`, 'v1\n');
fs.writeFileSync(`${jetro}/projects/comgit/codigo.ts`, 'x\n');
evento();
let lista = noRemoto();
ok('commit sobe para o remoto', git(jetro, 'status', '-sb').includes('main...origin/main') && git(jetro, 'rev-parse', 'HEAD') === git(bare, 'rev-parse', 'main'));
ok('manifest de projeto com git sobe', lista.includes('projects/comgit/manifest.md'), lista);
ok('código de projeto com git não sobe', !lista.includes('codigo.ts'), lista);
ok('projeto com git não vira gitlink', !git(jetro, 'ls-files', '-s').includes('160000'));
ok('projeto sem git sobe inteiro', lista.includes('projects/semgit/texto.md'), lista);
ok('repo do projeto não é tocado', spawnSync('git', ['-C', `${jetro}/projects/comgit`, 'log'], { encoding: 'utf8' }).status !== 0);

// Mudança no manifest de projeto com git é acompanhada.
fs.writeFileSync(`${jetro}/projects/comgit/manifest.md`, 'v2\n');
evento();
ok('mudança no manifest sobe', git(bare, 'show', 'main:projects/comgit/manifest.md') === 'v2');

// Sem mudança: nenhum commit novo.
const antes = git(jetro, 'rev-parse', 'HEAD');
evento();
ok('sem mudança não cria commit', git(jetro, 'rev-parse', 'HEAD') === antes);

// Remoto fora do ar: commit fica local, falha vai para o log, o próximo evento recupera.
const fora = `${bare}-fora`;
git(jetro, 'remote', 'set-url', 'origin', fora);
fs.writeFileSync(`${jetro}/projects/semgit/manifest.md`, 'v3\n');
const r = evento();
ok('push falho não quebra o hook', r.status === 0, r.stderr);
ok('push falho vai para o log', logHook().includes('git push falhou'), logHook());
ok('commit fica local', git(jetro, 'show', 'HEAD:projects/semgit/manifest.md') === 'v3' && git(bare, 'show', 'main:projects/semgit/manifest.md') === 'v1');
git(jetro, 'remote', 'set-url', 'origin', bare);
evento();
ok('evento seguinte sobe o que ficou para trás', git(bare, 'show', 'main:projects/semgit/manifest.md') === 'v3');

// Segredo: nada vira commit nem sobe, o aviso vai para o log, e sai sozinho quando o arquivo é limpo.
const falso = ['ghp_', 'a1B2'.repeat(10)].join('');
fs.writeFileSync(`${jetro}/projects/semgit/config.txt`, `ok\n${falso}\n`);
fs.writeFileSync(`${jetro}/projects/semgit/outro.txt`, 'texto limpo\n');
const base = git(jetro, 'rev-parse', 'HEAD');
evento();
ok('segredo não vira commit', git(jetro, 'rev-parse', 'HEAD') === base);
ok('segredo não sobe', !noRemoto().includes('config.txt') && !noRemoto().includes('outro.txt'), noRemoto());
ok('log avisa o arquivo e mascara o valor', logHook().includes('push travado') && logHook().includes('config.txt') && !logHook().includes(falso));
ok('índice volta ao normal', git(jetro, 'diff', '--cached', '--name-only') === '');
fs.writeFileSync(`${jetro}/projects/semgit/config.txt`, `${falso} # segredo-ok\n`);
evento();
ok('marca segredo-ok libera', noRemoto().includes('config.txt'));
// Commit manual com segredo, ainda não enviado, também trava.
fs.writeFileSync(`${jetro}/projects/semgit/manual.txt`, `${falso}\n`);
git(jetro, 'add', '-f', 'projects/semgit/manual.txt');
git(jetro, 'commit', '-qm', 'manual');
evento();
ok('commit manual com segredo não sobe', !noRemoto().includes('manual.txt'));
git(jetro, 'reset', '-q', '--hard', 'HEAD~1');
evento();
ok('depois de tirar, volta a subir', git(jetro, 'rev-parse', 'HEAD') === git(bare, 'rev-parse', 'main'));

// Detector: pega o que deve e deixa passar código comum.
const { acharSegredos } = await import(new URL('../segredos.mjs', import.meta.url));
const mais = (l) => acharSegredos(`+++ b/x.txt\n+${l}`).length;
for (const [nome, linha] of [
  ['chave privada', ['-----BEGIN RSA ', 'PRIVATE KEY-----'].join('')],
  ['URL com senha', ['postgres://u:s3nha', 'forte@host/db'].join('')],
  ['atribuição', ['SENHA', '=abc12345xyz'].join('')],
  ['bearer', ['Authorization: Bearer ', 'abc123def456ghi'].join('')],
  ['JWT', ['eyJhbGciOiJIUzI1NiJ9', '.eyJzdWIiOiIxMjM0NTY3ODkwIn0', '.abcdefghij12'].join('')],
]) ok(`detecta ${nome}`, mais(linha) === 1, linha.slice(0, 20));
for (const linha of [
  'const { error } = await supabase.auth.signInWithPassword({ email, password: senha })',
  "const token = req.headers.get('authorization')?.replace(/^Bearer\\s+/i, '')",
  'const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {})',
  'SUPABASE_URL: string; // projeto',
  'a1b2c3d4e5f6a7b8c9d0a1b2c3d4e5f6a7b8c9d0', // hash de commit
]) ok('código comum passa', mais(linha) === 0, linha.slice(0, 40));

fs.rmSync(raiz, { recursive: true, force: true, maxRetries: 5 });
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
