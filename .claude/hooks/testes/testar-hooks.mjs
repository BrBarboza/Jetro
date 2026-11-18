// Testes de revisor-push, manifest-atraso e verificar. Uso: node .claude/hooks/testes/testar-hooks.mjs
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
const hook = (arq, entrada) => {
  const r = spawnSync('node', [`${H}/${arq}`], { input: JSON.stringify(entrada), encoding: 'utf8' });
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
ok('git -C barra', hook('revisor-push.mjs', entrada(`git -C ${repo} push`, 'D:/OS')).code === 2);
ok('git -C com aspas barra', hook('revisor-push.mjs', entrada(`git -C "${repo}" push origin main`, 'D:/OS')).code === 2);
ok('cd && git push barra', hook('revisor-push.mjs', entrada(`cd ${repo} && git push`, 'D:/OS')).code === 2);
ok('cd caminho posix barra', hook('revisor-push.mjs', entrada(`cd /${repo[0].toLowerCase()}/${repo.slice(3)} && git push`, 'D:/OS')).code === 2);
ok('rtk git push barra', hook('revisor-push.mjs', entrada('rtk git push')).code === 2);

ok('cd; git push barra', hook('revisor-push.mjs', entrada(`cd ${repo}; git push`, 'D:/OS')).code === 2);
ok('--delete não barra', hook('revisor-push.mjs', entrada('git push origin --delete foo')).code === 0);
ok('-d não barra', hook('revisor-push.mjs', entrada('git push origin -d foo')).code === 0);
ok('--tags não barra', hook('revisor-push.mjs', entrada('git push --tags')).code === 0);
ok('--dry-run não barra', hook('revisor-push.mjs', entrada('git push --dry-run')).code === 0);
ok('-n não barra', hook('revisor-push.mjs', entrada('git push -n')).code === 0);
ok('flag de outro comando não libera', hook('revisor-push.mjs', entrada('git push && git branch -d velho')).code === 2);
ok('git -C commit && push é tratado como commit', hook('revisor-push.mjs', entrada(`git -C ${repo} commit -am x && git -C ${repo} push`, 'D:/OS')).err.includes('commit sozinho'));

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

fs.rmSync(raiz, { recursive: true, force: true, maxRetries: 5 });
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
