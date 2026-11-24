// Liga/desliga de hooks do Jetro sem editar settings.json.
// JETRO_HOOKS_DESLIGADOS=config-protection,suggest-compact (ou * para todos), na variável de
// ambiente do sistema ou no campo "env" de .claude/settings.local.json. Vale na próxima sessão.
// Origem: ecc @ 4adeee6 — scripts/lib/hook-flags.js (ECC_DISABLED_HOOKS; perfis cortados).
export const desligado = (nome) => {
  const lista = String(process.env.JETRO_HOOKS_DESLIGADOS || '').split(',').map((s) => s.trim().toLowerCase());
  return lista.includes('*') || lista.includes(nome);
};
