/* UNPRO Scout — content script.
   Reads ONLY what the human has already rendered on screen.
   No auto-scroll, no auto-click, no hidden-content expansion, no login automation. */
(function () {
  const state = { active: false, seen: new Set(), sessionId: null, queue: [] };

  function textOf(el) {
    return (el.innerText || "").replace(/\s+\n/g, "\n").trim();
  }

  function postUrlFor(el) {
    const a = el.querySelector('a[href*="/posts/"], a[href*="permalink"], a[href*="story_fbid"], a[href*="/groups/"]');
    if (!a) return null;
    try { return new URL(a.getAttribute("href"), location.origin).toString().split("?")[0]; }
    catch { return null; }
  }

  function authorFor(el) {
    const strong = el.querySelector('h3 a, h2 a, strong span, a[role="link"] strong');
    return strong ? strong.textContent.trim().slice(0, 120) : null;
  }

  function groupName() {
    const h = document.querySelector('h1');
    return h ? h.textContent.trim().slice(0, 160) : null;
  }

  /** Every article/comment node currently painted in the viewport. */
  function visibleUnits() {
    const nodes = Array.from(document.querySelectorAll('[role="article"]'));
    return nodes.filter((n) => {
      const r = n.getBoundingClientRect();
      return r.height > 40 && r.bottom > 0 && r.top < window.innerHeight;
    });
  }

  function keyFor(text) {
    return text.slice(0, 200).replace(/\s+/g, " ");
  }

  function scanOnce() {
    if (!state.active) return;
    for (const el of visibleUnits()) {
      const text = textOf(el);
      if (text.length < 12) continue;
      const key = keyFor(text);
      if (state.seen.has(key)) continue;
      state.seen.add(key);

      const parsed = window.UnproScoutParser.parseScoutText(text, authorFor(el));
      if (!parsed.has_contact && parsed.intent_score < 35) continue; // nothing actionable

      chrome.runtime.sendMessage({
        type: "SCOUT_CAPTURE",
        payload: {
          extraction_mode: "dom",
          raw_text: text.slice(0, 4000),
          author_name: authorFor(el),
          post_url: postUrlFor(el),
          source_url: location.href,
          group_name: groupName(),
          captured_at: new Date().toISOString(),
        },
      });
      markCaptured(el, parsed.intent_score >= 40);
    }
  }

  function markCaptured(el, highIntent) {
    el.style.outline = `2px solid ${highIntent ? "#22c55e" : "#0F62FE"}`;
    el.style.outlineOffset = "2px";
  }

  /* One-click "capture this image" — appears on hover over post images. */
  function attachImageButtons() {
    if (!state.active) return;
    document.querySelectorAll('[role="article"] img').forEach((img) => {
      if (img.dataset.unproScout || img.width < 120 || img.height < 90) return;
      img.dataset.unproScout = "1";
      const btn = document.createElement("button");
      btn.textContent = "📇 Capturer cette carte";
      Object.assign(btn.style, {
        position: "absolute", zIndex: 99999, font: "600 12px Inter, sans-serif",
        background: "#0F62FE", color: "#fff", border: "none", borderRadius: "999px",
        padding: "6px 12px", cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,.3)",
      });
      const place = () => {
        const r = img.getBoundingClientRect();
        btn.style.top = `${window.scrollY + r.top + 8}px`;
        btn.style.left = `${window.scrollX + r.left + 8}px`;
      };
      place();
      btn.addEventListener("click", async (e) => {
        e.preventDefault(); e.stopPropagation();
        btn.textContent = "⏳ Extraction…";
        try {
          const dataUrl = await toDataUrl(img);
          chrome.runtime.sendMessage({
            type: "SCOUT_CAPTURE",
            payload: {
              extraction_mode: "image",
              image_data_url: dataUrl,
              mime_type: "image/png",
              raw_text: textOf(img.closest('[role="article"]') || document.body).slice(0, 2000),
              author_name: authorFor(img.closest('[role="article"]') || document.body),
              post_url: postUrlFor(img.closest('[role="article"]') || document.body),
              source_url: location.href,
              group_name: groupName(),
            },
          });
          btn.textContent = "✅ Capturé";
        } catch (err) {
          btn.textContent = "⚠️ Image protégée";
        }
      });
      document.body.appendChild(btn);
      window.addEventListener("scroll", place, { passive: true });
    });
  }

  /** Canvas re-encode of an already-rendered image. Fails cleanly if tainted. */
  function toDataUrl(img) {
    return new Promise((resolve, reject) => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        c.getContext("2d").drawImage(img, 0, 0);
        resolve(c.toDataURL("image/png"));
      } catch (e) { reject(e); }
    });
  }

  let timer = null;
  function start() {
    state.active = true;
    if (timer) clearInterval(timer);
    timer = setInterval(() => { scanOnce(); attachImageButtons(); }, 1200);
    scanOnce();
  }
  function stop() { state.active = false; if (timer) clearInterval(timer); timer = null; }

  chrome.runtime.onMessage.addListener((msg, _s, respond) => {
    if (msg.type === "SCOUT_START") { start(); respond({ ok: true }); }
    if (msg.type === "SCOUT_STOP") { stop(); respond({ ok: true }); }
    if (msg.type === "SCOUT_CONTEXT") {
      respond({ group_name: groupName(), url: location.href, active: state.active });
    }
    return true;
  });
})();
