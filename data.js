// data.js

(() => {
  "use strict";

  const safeJSON = {
    parse(str, fallback) {
      try { return JSON.parse(str); } catch (_) { return fallback; }
    },
    stringify(obj) {
      try { return JSON.stringify(obj); } catch (_) { return "";
 }
    }
  };

  const theme = {
    key: "max_theme",
    get() {
      const v = localStorage.getItem(this.key);
      return v === "light" ? "light" : "dark";
    },
    set(t) {
      const v = t === "light" ? "light" : "dark";
      localStorage.setItem(this.key, v);
      return v;
    },
    toggle() {
      return this.set(this.get() === "dark" ? "light" : "dark");
    }
  };

  const uid = () => {
    const a = crypto?.randomUUID?.();
    if (a) return a;
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

  const normalizeType = (type) => {
    const t = String(type || "").trim().toLowerCase();
    if (["security", "wifi", "graffiti", "argus", "appointment"].includes(t)) return t;
    return "security";
  };

  const api = {
    async submitReport(report) {
      try {
        const base = String(window.AppConfig?.apiBaseUrl || "").replace(/\/$/, "");
        const url = base ? `${base}/api/reports` : "/api/reports";
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ report }),
        });
        const json = await r.json().catch(() => ({}));
        return { ok: r.ok && json?.ok, json };
      } catch (_) {
        return { ok: false, json: null };
      }
    }
  };

  const makeReport = (type, payload, extra = {}) => {
    const t = normalizeType(type);
    const now = new Date().toISOString();
    return {
      id: uid(),
      type: t,
      subtype: type !== t ? String(type) : "",
      status: "new",
      timestamp: now,
      updatedAt: now,
      user: extra.user || null,
      payload: payload || null
    };
  };

  window.AppData = window.AppData || {};
  window.AppData.getTheme = () => theme.get();
  window.AppData.setTheme = (t) => theme.set(t);
  window.AppData.toggleTheme = () => theme.toggle();
  window.AppData.makeReport = (type, payload, extra) => makeReport(type, payload, extra);
  window.AppData.submitReport = (report) => api.submitReport(report);
})();
