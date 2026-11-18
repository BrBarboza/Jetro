// Procura segredo nas linhas adicionadas de um diff. Devolve descrições com o valor mascarado, nunca inteiro.
// Linha com "segredo-ok" é ignorada (falso positivo conhecido). Usado por memoria.mjs antes do push.

const FORTES = [
  ['chave privada', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['AWS', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/],
  ['Anthropic/OpenAI', /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}\b/],
  ['Google', /\bAIza[0-9A-Za-z_-]{30,}\b/],
  ['Slack', /\bxox[abpors]-[A-Za-z0-9-]{10,}\b/],
  ['Stripe', /\b[rs]k_live_[A-Za-z0-9]{16,}\b/],
  ['Resend', /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9_]{16,}\b/],
  ['Supabase', /\b(?:sb_secret_|sbp_)[A-Za-z0-9_-]{20,}\b/],
  ['Telegram', /\b\d{8,10}:AA[A-Za-z0-9_-]{30,}\b/],
  ['ElevenLabs', /\bsk_[a-f0-9]{40,}\b/],
  ['JWT', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['URL com senha', /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@'"]+:[^\s/:@'"]{3,}@[^\s'"]+/i],
  ['hash de senha', /\bpbkdf2\$\d+\$[A-Za-z0-9+/=_-]+\$[A-Za-z0-9+/=_-]+/],
];
const NOME = /(pass(?:word|wd)?|senha|secret|segredo|token|api[_-]?key|apikey|auth[_-]?key|private[_-]?key|service[_-]?role|bearer|authorization|vapid)/i;
const ATRIBUICAO = new RegExp(`${NOME.source}[\\w-]*["'\`]?\\s*(?:[:=]|=>)\\s*["'\`]?(?:Bearer\\s+)?([^\\s"'\`,;)}\\]]{8,})`, 'i');
const FALSO = /^(?:process\.|import\.|env\.|Deno\.|\$\{|\{\{|<|\[|string|number|boolean|undefined|null|true|false|function|await\b|req\.|args\.|input\.|data\.|options\.|config\.|session\b|localStorage)|\.\.\.|^x{4,}|sua?[_-]|your|exemplo|example|placeholder|aqui/i;
const SEM_ENTROPIA = /(^|\/)(package-lock\.json|bun\.lock)$|\.(svg|map)$/;

const mascara = (s) => `${s.slice(0, 4)}…(${s.length})`;

function entropia(s) {
  const c = {};
  for (const x of s) c[x] = (c[x] ?? 0) + 1;
  return Object.values(c).reduce((t, v) => t - (v / s.length) * Math.log2(v / s.length), 0);
}

function classificar(linha, arquivo) {
  for (const [tipo, re] of FORTES) {
    const m = re.exec(linha);
    if (m) return `${tipo} ${mascara(m[0])}`;
  }
  const a = ATRIBUICAO.exec(linha);
  if (a && !FALSO.test(a[2]) && /[0-9]/.test(a[2]) && /[A-Za-z]/.test(a[2])) return `${a[1].toLowerCase()} ${mascara(a[2])}`;
  if (SEM_ENTROPIA.test(arquivo)) return null;
  for (const m of linha.matchAll(/[A-Za-z0-9_+/=-]{32,}/g)) {
    const v = m[0];
    if (v.includes('/') && !/[+=]/.test(v) && v.split('/').length > 2) continue; // caminho
    if (/[0-9]/.test(v) && /[a-z]/.test(v) && /[A-Z]/.test(v) && entropia(v) > 4.2) return `texto aleatório ${mascara(v)}`;
  }
  return null;
}

export function acharSegredos(diff) {
  const achados = new Set();
  let arquivo = '';
  for (const linha of diff.split(/\r?\n/)) {
    if (linha.startsWith('+++ ')) {
      arquivo = linha.slice(4).replace(/^b\//, '');
      continue;
    }
    if (!linha.startsWith('+')) continue;
    const texto = linha.slice(1, 20001);
    if (texto.includes('segredo-ok')) continue;
    const tipo = classificar(texto, arquivo);
    if (tipo) achados.add(`${arquivo}: ${tipo}`);
  }
  return [...achados];
}
