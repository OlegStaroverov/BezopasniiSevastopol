// email-service.js — real email sender via backend endpoint
// ВАЖНО: безопасная отправка email напрямую из браузера невозможна без бэкенда.
// Этот модуль отправляет обращение на ваш сервер (endpoint), а уже сервер отправляет email.
// Настройка:
//   window.AppConfig.email.endpoint = "https://your-domain.com/api/send-email"
//   (опционально) window.AppConfig.email.apiKey = "public-client-key" (если используете)
//   window.AppConfig.adminEmails = { security: "...", wifi: "...", graffiti: "..." }

(() => {
  "use strict";

  const safeStr = (v, max = 5000) => {
    if (v == null) return "";
    const s = String(v);
    return s.length > max ? s.slice(0, max) : s;
  };

  const getCfg = () => (window.AppConfig || window.MaxConfig || {});

  const storage = {
    get(key) {
      try { return localStorage.getItem(key); } catch (_) { return null; }
    },
    set(key, val) {
      try { localStorage.setItem(key, val); return true; } catch (_) { return false; }
    }
  };

  const defaults = () => {
    const cfg = getCfg();
    const adminEmails = cfg.adminEmails || cfg.email?.adminEmails || {};
    return {
      endpoint: cfg.email?.endpoint || cfg.emailEndpoint || "",
      apiKey: cfg.email?.apiKey || cfg.emailApiKey || "",
      adminEmails: {
        security: adminEmails.security || "",
        wifi: adminEmails.wifi || "",
        graffiti: adminEmails.graffiti || ""
      }
    };
  };

  const EmailService = {
    config: defaults(),

    refreshConfig() {
      this.config = defaults();
      return this.config;
    },

    // Адреса админов: сначала из localStorage (если админ изменял), иначе из AppConfig
    getAdminEmails() {
      this.refreshConfig();
      const fromStorage = {
        security: storage.get("admin_email_security") || "",
        wifi: storage.get("admin_email_wifi") || "",
        graffiti: storage.get("admin_email_graffiti") || ""
      };

      return {
        security: fromStorage.security || this.config.adminEmails.security || "",
        wifi: fromStorage.wifi || this.config.adminEmails.wifi || "",
        graffiti: fromStorage.graffiti || this.config.adminEmails.graffiti || ""
      };
    },

    setAdminEmail(type, email) {
      const t = String(type || "").trim();
      const e = safeStr(email, 180).trim();
      if (!t) return false;

      const key =
        t === "security" ? "admin_email_security" :
        t === "wifi" ? "admin_email_wifi" :
        t === "graffiti" ? "admin_email_graffiti" :
        null;

      if (!key) return false;
      return storage.set(key, e);
    },

    // Реальная отправка — POST на ваш сервер
    // payload: { to, subject, text, html, meta }
    async sendEmail(payload) {
      this.refreshConfig();

      const endpoint = this.config.endpoint;
      if (!endpoint) {
        throw new Error("EMAIL_ENDPOINT_NOT_CONFIGURED");
      }

      const to = safeStr(payload?.to, 220).trim();
      const subject = safeStr(payload?.subject, 220).trim();
      const text = safeStr(payload?.text, 12000);
      const html = safeStr(payload?.html, 20000);
      const meta = payload?.meta && typeof payload.meta === "object" ? payload.meta : {};

      if (!to || !subject || (!text && !html)) {
        throw new Error("EMAIL_INVALID_REQUEST");
      }

      const body = {
        to,
        subject,
        text,
        html,
        meta,
        // полезно серверу: user/device info from MAX (если есть)
        webapp: {
          platform: window.WebApp?.platform || "",
          version: window.WebApp?.version || "",
          user: window.WebApp?.initDataUnsafe?.user || null
        }
      };

      const headers = {
        "Content-Type": "application/json"
      };

      // Если ваш сервер ожидает ключ/токен
      if (this.config.apiKey) headers["X-Client-Key"] = this.config.apiKey;

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        mode: "cors",
        credentials: "omit"
      });

      if (!res.ok) {
        let details = "";
        try { details = await res.text(); } catch (_) {}
        throw new Error(`EMAIL_SEND_FAILED:${res.status}:${details}`);
      }

      // ожидаем JSON: { ok: true, messageId?: "..."}
      try {
        return await res.json();
      } catch (_) {
        return { ok: true };
      }
    }
  };

  window.EmailService = EmailService;
})();
