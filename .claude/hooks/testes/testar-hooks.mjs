// Testes de revisor-push, manifest-atraso, verificar, config-protection, cost-tracker, suggest-compact, publico-atraso e liga/desliga. Uso: node .claude/hooks/testes/testar-hooks.mjs
// Repositórios descartáveis ficam na pasta temporária do sistema e saem no fim. Precisa de bun e internet (instala typescript).
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const barras = (p) => p.split(path.sep).join('/');
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const H = barras(path.resolve(AQUI, '..'));
const raiz = barras(fs.mkdtempSync(path.join(os.tmpdir(), 'testar-hooks-')));
let falhas = 0;
const ok = (nome, cond, extra = '') => {
  if (!cond) falhas++;
  console.log(`${cond ? 'ok  ' : 'FALHA'} ${nome}${cond ? '' : ' ' + extra}`);
};
const git = (dir, ...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const hook = (arq, entrada, env = {}) => {
  const r = spawnSync('node', [`${H}/${arq}`], { input: JSON.stringify(entrada), encoding: 'utf8', env: { ...process.env, JETRO_HOOKS_DESLIGADOS: '', ...env } });
  return { code: r.status, out: r.stdout, err: r.stderr };
};
const linhas = (n, p = 'x') => Array.from({ length: n }, (_, i) => `${p}${i}`).join('\n') + '\n';

// ---------- revisor-push
const bare = `${raiz}/remoto.git`;
const repo = `${raiz}/projeto-teste`;
execFileSync('git', ['init', '-q', '--bare', '-b', 'main', bare]);
execFileSync('git', ['clone', '-q', bare, repo], { stdio: 'ignore' });
git(repo, 'config', 'user.email', 't@t');
git(repo, 'config', 'user.name', 't');
fs.writeFileSync(`${repo}/a.txt`, 'a\n');
git(repo, 'add', '.');
git(repo, 'commit', '-qm', 'inicio');
git(repo, 'push', '-qu', 'origin', 'HEAD:main');
const tr = `${raiz}/transcript.jsonl`;
fs.writeFileSync(tr, '');
const entrada = (command, cwd = repo) => ({ tool_input: { command }, cwd, transcript_path: tr });

fs.writeFileSync(`${repo}/pequeno.txt`, linhas(20));
git(repo, 'add', '.');
git(repo, 'commit', '-qm', 'pequeno');
ok('push pequeno passa', hook('revisor-push.mjs', entrada('git push')).code === 0);

fs.writeFileSync(`${repo}/grande.txt`, linhas(200));
git(repo, 'add', '.');
git(repo, 'commit', '-qm', 'grande');
let r = hook('revisor-push.mjs', entrada('git push'));
ok('push grande barra', r.code === 2 && r.err.includes('revisor'), JSON.stringify(r));
console.log('     msg:', r.err.slice(0, 160));
ok('commit citando push não barra', hook('revisor-push.mjs', entrada('git commit -m "feat(push): como usar git push"')).code === 0);
ok('heredoc citando push não barra', hook('revisor-push.mjs', entrada(`git commit -m "$(cat <<'EOF'\ndocs: git push aqui\nEOF\n)"`)).code === 0);
ok('here-string citando push não barra', hook('revisor-push.mjs', entrada(`git commit -m @'\ngit push\n'@`)).code === 0);
ok('git log não barra', hook('revisor-push.mjs', entrada('git log --grep push')).code === 0);
ok('outro comando não barra', hook('revisor-push.mjs', entrada('echo oi')).code === 0);
ok('git -C barra', hook('revisor-push.mjs', entrada(`git -C ${repo} push`, '.')).code === 2);
ok('git -C com aspas barra', hook('revisor-push.mjs', entrada(`git -C "${repo}" push origin main`, '.')).code === 2);
ok('cd && git push barra', hook('revisor-push.mjs', entrada(`cd ${repo} && git push`, '.')).code === 2);
ok('cd caminho posix barra', hook('revisor-push.mjs', entrada(`cd /${repo[0].toLowerCase()}/${repo.slice(3)} && git push`, '.')).code === 2);
ok('rtk git push barra', hook('revisor-push.mjs', entrada('rtk git push')).code === 2);

ok('cd; git push barra', hook('revisor-push.mjs', entrada(`cd ${repo}; git push`, '.')).code === 2);
ok('--delete não barra', hook('revisor-push.mjs', entrada('git push origin --delete foo')).code === 0);
ok('-d não barra', hook('revisor-push.mjs', entrada('git push origin -d foo')).code === 0);
ok('--tags não barra', hook('revisor-push.mjs', entrada('git push --tags')).code === 0);
ok('--dry-run não barra', hook('revisor-push.mjs', entrada('git push --dry-run')).code === 0);
ok('-n não barra', hook('revisor-push.mjs', entrada('git push -n')).code === 0);
ok('flag de outro comando não libera', hook('revisor-push.mjs', entrada('git push && git branch -d velho')).code === 2);
ok('git -C commit && push é tratado como commit', hook('revisor-push.mjs', entrada(`git -C ${repo} commit -am x && git -C ${repo} push`, '.')).err.includes('commit sozinho'));

// lockfile e gerado não contam
const repo2 = `${raiz}/lock-teste`;
execFileSync('git', ['clone', '-q', bare, repo2], { stdio: 'ignore' });
git(repo2, 'config', 'user.email', 't@t');
git(repo2, 'config', 'user.name', 't');
fs.writeFileSync(`${repo2}/bun.lock`, linhas(500));
fs.writeFileSync(`${repo2}/package-lock.json`, linhas(500));
fs.mkdirSync(`${repo2}/src`);
fs.writeFileSync(`${repo2}/src/routeTree.gen.ts`, linhas(500));
git(repo2, 'add', '.');
git(repo2, 'commit', '-qm', 'dep');
r = hook('revisor-push.mjs', entrada('git push', repo2));
ok('lockfile e gerado não contam', r.code === 0, JSON.stringify(r));

// commit na mesma linha do push conta a árvore
fs.writeFileSync(`${repo2}/novo.txt`, linhas(10));
git(repo2, 'add', '.');
git(repo2, 'commit', '-qm', 'base da árvore');
fs.writeFileSync(`${repo2}/novo.txt`, linhas(200));
r = hook('revisor-push.mjs', entrada('git add . && git commit -m "x" && git push', repo2));
ok('commit && push conta o que está na árvore', r.code === 2, JSON.stringify(r));
ok('sem commit na linha ignora árvore suja', hook('revisor-push.mjs', entrada('git push', repo2)).code === 0);
git(repo2, 'checkout', '-q', '--', '.');

// arquivo novo ainda não rastreado, em commit na mesma linha
fs.writeFileSync(`${repo2}/novo-grande.txt`, linhas(400));
r = hook('revisor-push.mjs', entrada('git add -A && git commit -m x && git push', repo2));
ok('commit && push conta arquivo novo', r.code === 2 && r.err.includes('commit sozinho'), JSON.stringify(r));
ok('sem commit na linha ignora arquivo novo', hook('revisor-push.mjs', entrada('git push', repo2)).code === 0);
fs.rmSync(`${repo2}/novo-grande.txt`);
fs.writeFileSync(`${repo2}/café açúcar.txt`, linhas(400));
ok('arquivo novo com acento conta', hook('revisor-push.mjs', entrada('git add -A && git commit -m x && git push', repo2)).code === 2);
fs.rmSync(`${repo2}/café açúcar.txt`);
fs.writeFileSync(`${repo2}/yarn.lock`, linhas(400));
fs.writeFileSync(`${repo2}/imagem.bin`, Buffer.concat([Buffer.from([0]), Buffer.from(linhas(400))]));
ok('lockfile e binário novos não contam', hook('revisor-push.mjs', entrada('git add -A && git commit -m x && git push', repo2)).code === 0);
fs.rmSync(`${repo2}/yarn.lock`);
fs.rmSync(`${repo2}/imagem.bin`);

// repo sem upstream nem origin: libera por falha própria
const repo3 = `${raiz}/sem-remoto`;
fs.mkdirSync(repo3);
execFileSync('git', ['init', '-q', repo3]);
ok('sem remoto libera', hook('revisor-push.mjs', entrada('git push', repo3)).code === 0);

// revisor no transcript
const agora = new Date(Date.now() + 5000).toISOString();
const antigo = '2020-01-01T00:00:00.000Z';
const uso = (ts, prompt, id = 'toolu_1') => JSON.stringify({ type: 'assistant', timestamp: ts, message: { content: [{ type: 'tool_use', id, name: 'Agent', input: { subagent_type: 'revisor', prompt } }] } });
const res = (id = 'toolu_1', is_error = false) => JSON.stringify({ type: 'user', timestamp: agora, message: { content: [{ type: 'tool_result', tool_use_id: id, is_error, content: 'ok' }] } });
fs.writeFileSync(tr, uso(antigo, 'revise projeto-teste') + '\n' + res() + '\n');
ok('revisor antes do commit não libera', hook('revisor-push.mjs', entrada('git push')).code === 2);
fs.writeFileSync(tr, uso(agora, 'revise outro-repo') + '\n' + res() + '\n');
ok('revisor de outro repo não libera', hook('revisor-push.mjs', entrada('git push')).code === 2);
fs.writeFileSync(tr, uso(agora, 'revise projeto-teste') + '\n');
ok('revisor sem resultado não libera', hook('revisor-push.mjs', entrada('git push')).code === 2);
fs.writeFileSync(tr, uso(agora, 'revise projeto-teste') + '\n' + res('toolu_1', true) + '\n');
ok('revisor com erro não libera', hook('revisor-push.mjs', entrada('git push')).code === 2);
fs.writeFileSync(tr, uso(agora, 'revise projeto-teste') + '\n' + res() + '\n');
ok('revisor depois do commit libera', hook('revisor-push.mjs', entrada('git push')).code === 0);
ok('commit && push não libera nem com revisor', hook('revisor-push.mjs', entrada('git commit -am x && git push')).code === 2);
// segundo plano: o lançamento volta sem erro antes de o revisor terminar
const lancado = JSON.stringify({ type: 'user', timestamp: agora, toolUseResult: { isAsync: true, status: 'async_launched' }, message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'lançado' }] } });
const aviso = (status, id = 'toolu_1') => JSON.stringify({ type: 'queue-operation', operation: 'enqueue', content: `<task-notification><tool-use-id>${id}</tool-use-id><status>${status}</status></task-notification>` });
fs.writeFileSync(tr, uso(agora, 'revise projeto-teste') + '\n' + lancado + '\n');
ok('revisor só lançado não libera', hook('revisor-push.mjs', entrada('git push')).code === 2);
fs.writeFileSync(tr, uso(agora, 'revise projeto-teste') + '\n' + lancado + '\n' + aviso('failed') + '\n');
ok('revisor em segundo plano com falha não libera', hook('revisor-push.mjs', entrada('git push')).code === 2);
fs.writeFileSync(tr, uso(agora, 'revise projeto-teste') + '\n' + lancado + '\n' + aviso('completed', 'toolu_outro') + '\n');
ok('conclusão de outro agente não libera', hook('revisor-push.mjs', entrada('git push')).code === 2);
fs.writeFileSync(tr, uso(agora, 'revise projeto-teste') + '\n' + lancado + '\n' + aviso('completed') + '\n');
ok('revisor em segundo plano concluído libera', hook('revisor-push.mjs', entrada('git push')).code === 0);
fs.writeFileSync(tr, uso(agora, 'revise projeto-teste') + '\n' + lancado + '\n' + aviso('completed') + '\n{"type":"assistant","mess');
ok('última linha pela metade não atrapalha', hook('revisor-push.mjs', entrada('git push')).code === 0);
fs.writeFileSync(tr, '');

// ---------- manifest-atraso
const proj = `${raiz}/projects/teste`;
fs.mkdirSync(proj, { recursive: true });
execFileSync('git', ['init', '-q', proj]);
git(proj, 'config', 'user.email', 't@t');
git(proj, 'config', 'user.name', 't');
fs.writeFileSync(`${proj}/manifest.md`, '# t\n\n## Onde paramos\n\n- parou em: 2026-11-01\n');
git(proj, 'add', '.');
const commitEm = (data, msg) => {
  const env = { ...process.env, GIT_AUTHOR_DATE: `${data}T12:00:00`, GIT_COMMITTER_DATE: `${data}T12:00:00` };
  fs.writeFileSync(`${proj}/log.txt`, `${msg}\n`);
  git(proj, 'add', '.');
  execFileSync('git', ['-C', proj, 'commit', '-q', '-m', msg], { env });
};
commitEm('2026-11-01', 'mesmo dia');
const manifest = `${proj}/manifest.md`;
const atraso = (fp = manifest) => hook('manifest-atraso.mjs', { tool_input: { file_path: fp } });
ok('commit no mesmo dia não avisa', atraso().out === '');
commitEm('2026-11-03', 'depois do parou em');
r = atraso();
ok('commit depois avisa', r.out.includes('depois do parou em') && JSON.parse(r.out).hookSpecificOutput.hookEventName === 'PostToolUse', JSON.stringify(r));
ok('não cita commit do mesmo dia', !r.out.includes('mesmo dia'));
ok('barra invertida também casa', atraso(manifest.replace(/\//g, '\\')).out.includes('depois'));
ok('outro arquivo não avisa', atraso(`${proj}/README.md`).out === '');
ok('arquivo inexistente não quebra', hook('manifest-atraso.mjs', { tool_input: { file_path: `${raiz}/projects/nada/manifest.md` } }).code === 0);
// projeto sem repo próprio dentro de um repo pai
const pai = `${raiz}/pai`;
fs.mkdirSync(`${pai}/projects/semgit`, { recursive: true });
execFileSync('git', ['init', '-q', pai]);
git(pai, 'config', 'user.email', 't@t');
git(pai, 'config', 'user.name', 't');
fs.writeFileSync(`${pai}/raiz.txt`, 'x');
git(pai, 'add', '.');
git(pai, 'commit', '-qm', 'commit do pai');
fs.writeFileSync(`${pai}/projects/semgit/manifest.md`, '- parou em: 2020-01-01\n');
ok('projeto sem repo não pega git do pai', atraso(`${pai}/projects/semgit/manifest.md`).out === '');

// ---------- verificar
const V = path.resolve(AQUI, '../../scripts/verificar.mjs');
const roda = (pasta, ...a) => spawnSync('node', [V, pasta, ...a], { encoding: 'utf8' });
const app = `${raiz}/app`;
fs.mkdirSync(app);
const pkg = (scripts) => fs.writeFileSync(`${app}/package.json`, JSON.stringify({ name: 'app', scripts }));
pkg({
  typecheck: 'node -e "console.log(1)"',
  lint: 'node -e "console.log(\'muito ruido\');console.error(\'src/a.ts(3,1): error TS2322: tipo errado\');console.error(\'Error: quebrou\');console.error(\'failed 1\');process.exit(1)"',
  test: 'node -e "for(let i=0;i<500;i++)console.log(\'ruido \'+i);console.error(\'sem palavra chave\');process.exit(3)"',
  'test:e2e': 'node -e "console.log(\'e2e rodou\')"',
  deploy: 'node -e "require(\'fs\').writeFileSync(\'DEPLOYOU\',\'x\')"',
});
r = roda(app);
console.log(r.stdout.replace(/^/gm, '     '));
ok('exit 1 com falha', r.status === 1, String(r.status));
ok('verde em uma linha', /✅ typecheck \(\d+s\)/.test(r.stdout));
ok('falha traz erro exato', r.stdout.includes('error TS2322: tipo errado'));
ok('falha corta ruído', !r.stdout.includes('muito ruido'));
ok('sem palavra-chave cai nas últimas linhas', r.stdout.includes('sem palavra chave') && !r.stdout.includes('ruido 10\n'));
ok('aponta log completo', r.stdout.includes('log completo:') && fs.existsSync(r.stdout.match(/log completo: (.*verificar-app-lint\.log)/)[1].trim()));
ok('não roda e2e sem pedir', !r.stdout.includes('test:e2e'));
ok('não roda deploy', !fs.existsSync(`${app}/DEPLOYOU`));
r = roda(app, 'test:e2e');
ok('e2e por nome verde', r.status === 0 && r.stdout.includes('✅ test:e2e'), r.stdout);
r = roda(app, 'naoexiste');
ok('script inexistente falha', r.status === 1, r.stdout);
pkg({ build: `node -e "console.error('error TS1: causa no começo');for(let i=0;i<500;i++)console.log('texto '+i);process.exit(1)"` });
r = roda(app, 'build');
ok('erro raro no começo aparece junto com o fim', r.stdout.includes('causa no começo') && r.stdout.includes('texto 499'), r.stdout);
// tsconfig com references: --noEmit na raiz não checa nada, -b checa
const refs = `${raiz}/ts-refs`;
fs.mkdirSync(`${refs}/src`, { recursive: true });
fs.writeFileSync(`${refs}/package.json`, JSON.stringify({ name: 'refs', scripts: {} }));
execFileSync('bun', ['add', '-d', 'typescript', '--silent'], { cwd: refs, stdio: 'ignore', shell: true });
fs.writeFileSync(`${refs}/tsconfig.json`, JSON.stringify({ files: [], references: [{ path: './tsconfig.app.json' }] }));
fs.writeFileSync(`${refs}/tsconfig.app.json`, JSON.stringify({ compilerOptions: { noEmit: true, strict: true, skipLibCheck: true, tsBuildInfoFile: './node_modules/.tmp/app.tsbuildinfo' }, include: ['src'] }));
fs.writeFileSync(`${refs}/src/a.ts`, 'export const x: number = "texto";\n');
const ingenuo = spawnSync('bunx tsc --noEmit', { cwd: refs, shell: true, encoding: 'utf8' });
ok('confirma o achado: tsc --noEmit na raiz sai verde com erro de tipo', ingenuo.status === 0, ingenuo.stdout);
r = roda(refs);
ok('references: pega o erro de tipo', r.status === 1 && r.stdout.includes('TS2322'), r.stdout);
fs.writeFileSync(`${refs}/src/a.ts`, 'export const x: number = 1;\n');
r = roda(refs);
ok('references: verde sem erro de tipo', r.status === 0 && r.stdout.includes('✅ typecheck'), r.stdout);
const sobra = fs.readdirSync(`${refs}/src`).filter((f) => f !== 'a.ts');
ok('references: não emite arquivo', sobra.length === 0, sobra.join());
r = roda(`${raiz}/nada`);
ok('sem package.json exit 2', r.status === 2 && r.stdout.includes('nada verificado'), r.stdout);
pkg({ dev: 'x' });
r = roda(app);
ok('sem scripts de verificação exit 2', r.status === 2, r.stdout);

// ---------- config-protection
const cfg = `${raiz}/cfg`;
fs.mkdirSync(cfg);
fs.writeFileSync(`${cfg}/.eslintrc.json`, '{}');
fs.writeFileSync(`${cfg}/eslint.config.base.mjs`, 'export default []');
fs.writeFileSync(`${cfg}/tsconfig.json`, '{ "compilerOptions": { "strict": true } }');
fs.writeFileSync(`${cfg}/a.ts`, 'x');
const ed = (file_path, old_string, new_string) => ({ tool_name: 'Edit', tool_input: { file_path, old_string, new_string } });
ok('lint existente barra', hook('config-protection.mjs', ed(`${cfg}/.eslintrc.json`, '{}', '{"rules":{}}')).code === 2);
ok('lint base com qualificador barra', hook('config-protection.mjs', ed(`${cfg}/eslint.config.base.mjs`, '[]', '[{}]')).code === 2);
ok('lint novo passa', hook('config-protection.mjs', { tool_name: 'Write', tool_input: { file_path: `${cfg}/eslint.config.mjs`, content: 'x' } }).code === 0);
ok('arquivo comum passa', hook('config-protection.mjs', ed(`${cfg}/a.ts`, 'x', 'y')).code === 0);
r = hook('config-protection.mjs', ed(`${cfg}/tsconfig.json`, '"strict": true', '"strict": false'));
ok('tsconfig strict false barra', r.code === 2 && r.err.includes('TypeScript'), JSON.stringify(r));
ok('tsconfig noImplicitAny false barra', hook('config-protection.mjs', ed(`${cfg}/tsconfig.json`, '"strict": true', '"strict": true, "noImplicitAny": false')).code === 2);
ok('tsconfig sem afrouxar passa', hook('config-protection.mjs', ed(`${cfg}/tsconfig.json`, '"strict": true', '"strict": true, "paths": {}')).code === 0);
ok('tsconfig Write tirando strict barra', hook('config-protection.mjs', { tool_name: 'Write', tool_input: { file_path: `${cfg}/tsconfig.json`, content: '{ "compilerOptions": {} }' } }).code === 2);
ok('tsconfig Write mantendo strict passa', hook('config-protection.mjs', { tool_name: 'Write', tool_input: { file_path: `${cfg}/tsconfig.json`, content: '{ "compilerOptions": { "strict": true, "jsx": "react-jsx" } }' } }).code === 0);
ok('tsconfig MultiEdit afrouxando barra', hook('config-protection.mjs', { tool_name: 'MultiEdit', tool_input: { file_path: `${cfg}/tsconfig.json`, edits: [{ old_string: 'a', new_string: 'b' }, { old_string: '"strict": true', new_string: '"strictNullChecks": false, "strict": true' }] } }).code === 2);
ok('config-protection desligado passa', hook('config-protection.mjs', ed(`${cfg}/.eslintrc.json`, '{}', '{"rules":{}}'), { JETRO_HOOKS_DESLIGADOS: 'config-protection' }).code === 0);

// ---------- liga/desliga nos hooks antigos
const grandeArq = `${raiz}/grande-leitura.txt`;
fs.writeFileSync(grandeArq, 'x'.repeat(30 * 1024));
ok('leitura-grande ligado barra', hook('leitura-grande.mjs', { tool_input: { file_path: grandeArq } }).code === 2);
ok('leitura-grande com * passa', hook('leitura-grande.mjs', { tool_input: { file_path: grandeArq } }, { JETRO_HOOKS_DESLIGADOS: '*' }).code === 0);
ok('leitura-grande com outro nome desligado barra', hook('leitura-grande.mjs', { tool_input: { file_path: grandeArq } }, { JETRO_HOOKS_DESLIGADOS: 'cost-tracker' }).code === 2);
ok('revisor-push desligado passa', hook('revisor-push.mjs', entrada(`git -C ${repo} push`, '.'), { JETRO_HOOKS_DESLIGADOS: 'revisor-push' }).code === 0);

// ---------- cost-tracker
const ct = `${raiz}/custos`;
const tmpProj = `${ct}/temp-proj`;
fs.mkdirSync(`${ct}/sess1/subagents`, { recursive: true });
fs.mkdirSync(tmpProj);
const msg = (id, model, u) => JSON.stringify({ type: 'assistant', message: { id, model, usage: u } });
const M = 1_000_000;
fs.writeFileSync(`${ct}/sess1.jsonl`, [
  JSON.stringify({ type: 'user', message: { content: 'oi' } }),
  msg('m1', 'claude-opus-5-5', { input_tokens: M, output_tokens: 0 }),
  msg('m1', 'claude-opus-5-5', { input_tokens: M, output_tokens: 0 }),
  msg('m2', 'claude-opus-5-5', { input_tokens: 0, output_tokens: M, cache_read_input_tokens: M, cache_creation_input_tokens: M, cache_creation: { ephemeral_1h_input_tokens: M, ephemeral_5m_input_tokens: 0 } }),
].join('\n') + '\n');
fs.writeFileSync(`${ct}/sess1/subagents/agent-a.jsonl`, msg('s1', 'claude-haiku-5-5', { input_tokens: M, output_tokens: 0 }) + '\n');
fs.writeFileSync(`${tmpProj}/mem1.jsonl`, JSON.stringify({ type: 'user', message: { content: 'Siga.\nVocê atualiza a memória pessoal do usuário a partir' } }) + '\n' + msg('h1', 'claude-haiku-5-5', { input_tokens: 50_000, output_tokens: 0 }) + '\n');
fs.writeFileSync(`${tmpProj}/outro.jsonl`, JSON.stringify({ type: 'user', message: { content: 'outra coisa' } }) + '\n' + msg('o1', 'claude-haiku-5-5', { input_tokens: M }) + '\n');
const ctEnv = { OS_CUSTOS_ARQ: `${ct}/custos.tsv`, OS_CUSTOS_TEMP_DIR: tmpProj };
hook('cost-tracker.mjs', { session_id: 'sess1', transcript_path: `${ct}/sess1.jsonl` }, ctEnv);
let led = fs.readFileSync(`${ct}/custos.tsv`, 'utf8').trim().split('\n').map((l) => l.split('\t'));
const sess = led.find((c) => c[1] === 'sess1');
// opus 5.5: 1M entrada (4) + 1M saída (20) + 1M leitura (0,2) + 1M escrita 1h (8) = 32,2
// subagente haiku 5.5 com 1M de prompt cai na faixa acima de 100K (5x): 0,5. Total 32,7.
ok('cost-tracker soma sessão + subagente sem duplicar', sess && Math.abs(Number(sess[8]) - 32.7) < 0.001, JSON.stringify(sess));
const mem = led.find((c) => c[1] === 'mem1');
// memoria: 50K de prompt, faixa até 100K: 0,05 * 0,1 = 0,005
ok('cost-tracker registra memoria', mem && mem[2] === 'memoria' && Math.abs(Number(mem[8]) - 0.005) < 0.0001, JSON.stringify(led));
ok('cost-tracker ignora transcript que não é memoria', !led.some((c) => c[1] === 'outro'));
hook('cost-tracker.mjs', { session_id: 'sess2', transcript_path: `${ct}/sess1.jsonl` }, ctEnv);
const ledTxt = fs.readFileSync(`${ct}/custos.tsv`, 'utf8').trim().split('\n');
ok('cost-tracker não repete memoria', ledTxt.filter((l) => l.includes('\tmem1\t')).length === 1, ledTxt.join('|'));
r = spawnSync('node', [`${H}/cost-tracker.mjs`, '--resumo'], { encoding: 'utf8', env: { ...process.env, ...ctEnv } });
ok('cost-tracker resumo', r.status === 0 && r.stdout.includes('US$'), r.stdout + r.stderr);
fs.rmSync(`${ct}/custos.tsv`);
hook('cost-tracker.mjs', { session_id: 'sess1', transcript_path: `${ct}/sess1.jsonl` }, { ...ctEnv, JETRO_HOOKS_DESLIGADOS: 'cost-tracker' });
ok('cost-tracker desligado não grava', !fs.existsSync(`${ct}/custos.tsv`));

// ---------- suggest-compact
const sc = `${raiz}/sc.jsonl`;
const sid = `teste${Date.now()}`;
const ctxEm = (n) => fs.appendFileSync(sc, msg(`c${n}`, 'claude-opus-5-5', { input_tokens: 10, cache_read_input_tokens: n - 10 }) + '\n');
const scHook = (env) => hook('suggest-compact.mjs', { session_id: sid, transcript_path: sc, hook_event_name: 'PostToolUse' }, env);
fs.writeFileSync(sc, '');
ctxEm(80_000);
ok('suggest-compact abaixo do limiar quieto', scHook().out === '');
ctxEm(130_000);
r = scHook();
ok('suggest-compact avisa no limiar', r.out.includes('/compact') && JSON.parse(r.out).hookSpecificOutput.additionalContext.includes('130k'), r.out);
ok('suggest-compact não repete logo', scHook().out === '');
ctxEm(165_000);
ok('suggest-compact avisa de novo +30k', scHook().out.includes('165k'));
fs.appendFileSync(sc, JSON.stringify({ type: 'assistant', isSidechain: true, message: { id: 'side', usage: { input_tokens: 5 } } }) + '\n');
ok('suggest-compact ignora subagente', scHook().out === '');
ctxEm(20_000);
scHook();
ctxEm(125_000);
ok('suggest-compact volta a valer depois de compactar', scHook().out.includes('125k'));
ctxEm(170_000);
ok('suggest-compact desligado quieto', scHook({ JETRO_HOOKS_DESLIGADOS: 'suggest-compact' }).out === '');
fs.rmSync(path.join(os.tmpdir(), `jetro-compact-${sid}.json`), { force: true });

// ---------- publico-atraso
const { assinatura } = await import(new URL('../../scripts/publico-lista.mjs', import.meta.url));
const pa = `${raiz}/pa-os`;
const pub = `${raiz}/pa-publico`;
fs.mkdirSync(`${pa}/.claude/hooks`, { recursive: true });
fs.writeFileSync(`${pa}/CLAUDE.md`, 'regra 1\n');
fs.writeFileSync(`${pa}/.claude/hooks/x.mjs`, '// x\n');
execFileSync('git', ['clone', '-q', bare, pub], { stdio: 'ignore' });
const paHook = (env = {}) => hook('publico-atraso.mjs', {}, { JETRO_RAIZ: pa, ...env }).out;
ok('publico-atraso sem estado quieto', paHook() === '');
fs.writeFileSync(`${pa}/.claude/hooks/.publico-sync.json`, JSON.stringify({ destino: '../pa-publico', arquivos: assinatura(pa) }));
ok('publico-atraso em dia quieto', paHook() === '');
fs.writeFileSync(`${pa}/CLAUDE.md`, 'regra 1\nregra 2\n');
ok('publico-atraso mecanismo mudou avisa', paHook().includes('Público atrasado: 1 arquivo(s)') && paHook().includes('CLAUDE.md'), paHook());
fs.writeFileSync(`${pa}/.claude/hooks/novo.mjs`, '// novo\n');
ok('publico-atraso arquivo novo conta', paHook().includes('2 arquivo(s)'), paHook());
git(pub, 'config', 'user.email', 't@t');
git(pub, 'config', 'user.name', 't');
fs.writeFileSync(`${pub}/b.txt`, 'b\n');
git(pub, 'add', '.');
git(pub, 'commit', '-qm', 'pronto');
ok('publico-atraso commit sem push avisa', paHook().includes('aguardando push: 1 commit'), paHook());
ok('publico-atraso desligado quieto', paHook({ JETRO_HOOKS_DESLIGADOS: 'publico-atraso' }) === '');

fs.rmSync(raiz, { recursive: true, force: true, maxRetries: 5 });
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
