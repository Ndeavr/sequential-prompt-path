const $ = (id) => document.getElementById(id);

async function tab() {
  const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
  return t;
}

async function ctx() {
  const t = await tab();
  if (!t || !/facebook\.com/.test(t.url || "")) return null;
  try {
    return await chrome.tabs.sendMessage(t.id, { type: "SCOUT_CONTEXT" });
  } catch { return null; }
}

function renderStats(s) {
  s = s || { captured: 0, new: 0, duplicate: 0, error: 0 };
  $("s-captured").textContent = s.captured || 0;
  $("s-new").textContent = s.new || 0;
  $("s-dup").textContent = s.duplicate || 0;
  $("s-err").textContent = s.error || 0;
}

async function refresh() {
  const st = await chrome.storage.local.get(["accessToken", "sessionId", "paused", "stats"]);
  const c = await ctx();
  $("ctx").textContent = c
    ? `Groupe : ${c.group_name || "non détecté"}`
    : "Ouvrez un groupe Facebook (onglet actif)";
  const authed = Boolean(st.accessToken);
  $("authCard").hidden = authed;
  $("statsCard").hidden = !st.sessionId;
  $("start").hidden = !authed || Boolean(st.sessionId);
  $("pause").hidden = !st.sessionId;
  $("stop").hidden = !st.sessionId;
  $("pause").textContent = st.paused ? "Reprendre la capture" : "Mettre en pause";
  $("dot").className = "dot" + (st.sessionId && !st.paused ? "" : " off");
  renderStats(st.stats);
}

$("save").addEventListener("click", async () => {
  const token = $("token").value.trim();
  if (!token) { $("msg").className = "msg err"; $("msg").textContent = "Jeton requis."; return; }
  await chrome.storage.local.set({ accessToken: token });
  $("msg").className = "msg ok"; $("msg").textContent = "Connecté.";
  refresh();
});

$("start").addEventListener("click", async () => {
  const t = await tab();
  if (!t || !/facebook\.com/.test(t.url || "")) {
    $("msg").className = "msg err";
    $("msg").textContent = "Ouvrez d'abord le groupe Facebook.";
    return;
  }
  const c = await ctx();
  const r = await chrome.runtime.sendMessage({
    type: "SCOUT_START_SESSION",
    group_name: c?.group_name ?? null,
    group_url: t.url,
  });
  if (!r?.ok) {
    $("msg").className = "msg err";
    $("msg").textContent = r?.error === "not_authenticated" ? "Jeton invalide ou expiré." : `Erreur : ${r?.error}`;
    return;
  }
  await chrome.tabs.sendMessage(t.id, { type: "SCOUT_START" });
  $("msg").className = "msg ok";
  $("msg").textContent = "Capture active. Faites défiler normalement.";
  refresh();
});

$("pause").addEventListener("click", async () => {
  const { paused } = await chrome.storage.local.get("paused");
  const next = !paused;
  await chrome.storage.local.set({ paused: next });
  const t = await tab();
  if (t) await chrome.tabs.sendMessage(t.id, { type: next ? "SCOUT_STOP" : "SCOUT_START" }).catch(() => {});
  refresh();
});

$("stop").addEventListener("click", async () => {
  const t = await tab();
  if (t) await chrome.tabs.sendMessage(t.id, { type: "SCOUT_STOP" }).catch(() => {});
  await chrome.runtime.sendMessage({ type: "SCOUT_END_SESSION" });
  $("msg").className = "msg ok";
  $("msg").textContent = "Session terminée.";
  refresh();
});

chrome.runtime.onMessage.addListener((m) => { if (m.type === "SCOUT_STATS") renderStats(m.stats); });
refresh();
