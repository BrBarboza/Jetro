// Status line do OS: roda a status line global (GSD) e acrescenta o uso do limite de 5 h e a hora do reset.
// Campos vêm do JSON que o Claude Code manda no stdin: rate_limits.five_hour.{used_percentage, resets_at}.
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  const base = spawnSync(process.execPath, [`${homedir()}/.claude/hooks/gsd-statusline.js`], {
    input: raw,
    encoding: "utf8",
    timeout: 4000,
  }).stdout?.trimEnd() ?? "";

  let limite = "5h: sem dado";
  try {
    const h5 = JSON.parse(raw).rate_limits?.five_hour;
    if (h5?.used_percentage != null) {
      const pct = Math.round(h5.used_percentage);
      const fim = h5.resets_at ? new Date(h5.resets_at * 1000) : null;
      const hora = fim ? fim.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "?";
      const cor = pct >= 90 ? 31 : pct >= 70 ? 33 : 32;
      limite = `\x1b[${cor}m5h: ${pct}%\x1b[0m · reseta ${hora}`;
    }
  } catch {}

  process.stdout.write(base ? `${base} │ ${limite}` : limite);
});
