import { execFileSync } from "node:child_process";
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
try {
  const source = git("rev-parse", "--verify", "refs/remotes/origin/lovable-sync^{commit}");
  const head = git("rev-parse", "HEAD");
  try { git("merge-base", "--is-ancestor", source, head); }
  catch { throw new Error("La branche courante n’inclut pas origin/lovable-sync. Fetch puis intégrer la source active avant de modifier le site."); }
  const branch = git("branch", "--show-current") || "detached";
  if (/^lovable-sync-\d+$/.test(branch)) throw new Error("Cette branche est un instantané historique, pas la source active.");
  console.log(`Source vérifiée : ${branch} inclut lovable-sync ${source.slice(0, 12)}. Vérifier aussi la révision du projet publié.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Source non vérifiable. Fetch origin/lovable-sync puis réessayer.");
  process.exitCode = 1;
}
