// admin-panel.js — Admin UI inside #admin-section (stable rewrite)
// - просмотр обращений (security / wifi / graffiti)
// - фильтр по статусу + смена статуса
// - экспорт CSV
// - дашборд + график (Chart.js если доступен)

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const esc = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const nowISO = () => new Date().toISOString();
  const AppData = window.AppData;

  const readReports = async (type) => {
    try {
      const list = await AppData.getReports(type);
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  };

  const writeReports = async (type, list) => {
    const key = `reports_${type}`;
    try {
      if (AppData._save) return await AppData._save(key, list);
    } catch (_) {}
    try {
      localStorage.setItem(key, JSON.stringify(list));
      return true;
    } catch (_) {
      return false;
    }
  };

  const updateReportStatus = async (type, id, status) => {
    const list = await readReports(type);
    const idx = list.findIndex((r) => String(r.id) === String(id));
    if (idx < 0) return false;
    list[idx].status = status;
    list[idx].updatedAt = nowISO();
    return writeReports(type, list);
  };

  const exportCSV = (filename, rows) => {
    const escCSV = (v) => {
      const s = String(v ?? "");
      if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
      return s;
    };
    const csv = rows.map((r) => r.map(escCSV).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  class AdminPanel {
    constructor() {
      this.root = $("#admin-section");
      this.isAdmin = false;
      this.chart = null;

      this.activeTab = "dashboard";
      this.statusFilter = "all";

      this._boot();
    }

    _boot() {
      const uid = window.WebApp?.initDataUnsafe?.user?.id;
      const admins = (window.ADMIN_USER_IDS || []).map(String);
      this.isAdmin = uid != null && admins.includes(String(uid));

      if (!this.root) return;

      if (!this.isAdmin) {
        this.root.innerHTML = `
          <div class="glass-card form-card">
            <div class="placeholder">Доступ только для администраторов</div>
          </div>`;
        return;
      }

      this.root.innerHTML = this._template();
      $("#adminRefresh")?.addEventListener("click", () => this.refreshAll());

      this._bindTabs();
      this._bindFilters();
      this._bindExports();
      this._bindEmailSettings();

      this.refreshAll();
    }

    _template() {
      return `
        <div class="glass-card form-card" style="display:flex;flex-direction:column;gap:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
            <div style="font-weight:900;font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              Административная панель
            </div>
            <button class="btn btn-primary btn-compact" id="adminRefresh" type="button">
              <i class="fas fa-sync"></i><span>Обновить</span>
            </button>
          </div>

          <div class="tabs" role="tablist" aria-label="Админ вкладки" style="grid-template-columns:repeat(5,minmax(0,1fr));">
            <button class="tab is-active" data-admin-tab="dashboard" type="button" role="tab" aria-selected="true">Дашборд</button>
            <button class="tab" data-admin-tab="security" type="button" role="tab" aria-selected="false">Безопасность</button>
            <button class="tab" data-admin-tab="wifi" type="button" role="tab" aria-selected="false">Wi‑Fi</button>
            <button class="tab" data-admin-tab="graffiti" type="button" role="tab" aria-selected="false">Граффити</button>
            <button class="tab" data-admin-tab="settings" type="button" role="tab" aria-selected="false">Настройки</button>
          </div>

          <div class="tab-content is-active" data-admin-tab-content="dashboard">
            <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;">
              ${this._statCard("Всего", "adminTotal")}
              ${this._statCard("Новые", "adminNew")}
              ${this._statCard("В работе", "adminInProgress")}
              ${this._statCard("Решено", "adminResolved")}
            </div>

            <div class="glass-card" style="padding:14px;border-radius:18px;">
              <div style="font-weight:900;margin-bottom:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">По категориям</div>
              <canvas id="adminChart" height="120"></canvas>
            </div>
          </div>

          <div class="tab-content" data-admin-tab-content="security">
            ${this._listHeader("security")}
            <div id="adminList_security" class="cards-grid" aria-label="Список обращений безопасности"></div>
          </div>

          <div class="tab-content" data-admin-tab-content="wifi">
            ${this._listHeader("wifi")}
            <div id="adminList_wifi" class="cards-grid" aria-label="Список обращений Wi‑Fi"></div>
          </div>

          <div class="tab-content" data-admin-tab-content="graffiti">
            ${this._listHeader("graffiti")}
            <div id="adminList_graffiti" class="cards-grid" aria-label="Список обращений граффити"></div>
          </div>

          <div class="tab-content" data-admin-tab-content="settings">
            <div class="glass-card" style="padding:14px;border-radius:18px;">
              <div style="font-weight:900;margin-bottom:12px;">Email для уведомлений</div>

              <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;">
                ${this._emailSetting("security", "Безопасность")}
                ${this._emailSetting("wifi", "Wi‑Fi")}
                ${this._emailSetting("graffiti", "Граффити")}
              </div>

              <div style="margin-top:12px;color:var(--muted);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                Отправка email работает через ваш серверный endpoint (см. AppConfig.email.endpoint).
              </div>
            </div>
          </div>
        </div>
      `;
    }

    _statCard(title, id) {
      return `
        <div class="glass-card" style="padding:14px;border-radius:18px;">
          <div style="color:var(--muted);font-weight:800;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(title)}</div>
          <div id="${id}" style="font-weight:900;font-size:22px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">0</div>
        </div>
      `;
    }

    _listHeader(type) {
      const t = esc(type);
      return `
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;">
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <select class="form-select" id="adminStatusFilter_${t}" style="min-width:220px;">
              <option value="all">Все статусы</option>
              <option value="new">Новые</option>
              <option value="in_progress">В работе</option>
              <option value="resolved">Решено</option>
            </select>
          </div>

          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <button class="btn btn-secondary btn-compact" data-admin-export="${t}" type="button">
              <i class="fas fa-file-csv"></i><span>CSV</span>
            </button>
          </div>
        </div>
      `;
    }

    _emailSetting(type, label) {
      const t = esc(type);
      const l = esc(label);
      return `
        <div class="glass-card" style="padding:12px;border-radius:18px;">
          <div style="font-weight:900;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${l}</div>
          <input class="form-input" id="adminEmail_${t}" type="email" placeholder="email@domain.ru" />
          <div style="display:flex;gap:10px;margin-top:10px;">
            <button class="btn btn-primary btn-compact" data-admin-save-email="${t}" type="button">
              <i class="fas fa-save"></i><span>Сохранить</span>
            </button>
          </div>
        </div>
      `;
    }

    _bindTabs() {
      $$(".tab[data-admin-tab]", this.root).forEach((btn) => {
        btn.addEventListener("click", () => this.switchTab(btn.dataset.adminTab));
      });
    }

    switchTab(tab) {
      const t = String(tab || "").trim();
      if (!t) return;
      this.activeTab = t;

      $$(".tab[data-admin-tab]", this.root).forEach((b) => {
        const active = b.dataset.adminTab === t;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
      });

      $$("[data-admin-tab-content]", this.root).forEach((c) => {
        c.classList.toggle("is-active", c.dataset.adminTabContent === t);
      });
    }

    _bindFilters() {
      ["security", "wifi", "graffiti"].forEach((type) => {
        const sel = $(`#adminStatusFilter_${type}`, this.root);
        if (!sel) return;
        sel.addEventListener("change", () => {
          this.statusFilter = sel.value || "all";
          this.refreshList(type);
        });
      });
    }

    _bindExports() {
      $$("[data-admin-export]", this.root).forEach((btn) => {
        btn.addEventListener("click", async () => {
          const type = btn.dataset.adminExport;
          const list = await readReports(type);
          const rows = [
            ["id", "type", "subtype", "status", "timestamp", "updatedAt", "name", "phone", "email", "payload"]
          ];

          list.forEach((r) => {
            const p = r.payload || {};
            rows.push([
              r.id,
              r.type,
              r.subtype || "",
              r.status || "",
              r.timestamp || "",
              r.updatedAt || "",
              p.name || "",
              p.phone || "",
              p.email || "",
              JSON.stringify(p)
            ]);
          });

          exportCSV(`reports_${type}.csv`, rows);
        });
      });
    }

    _bindEmailSettings() {
      const EmailService = window.EmailService;
      if (!EmailService) return;

      const cur = EmailService.getAdminEmails?.() || {};
      ["security", "wifi", "graffiti"].forEach((type) => {
        const input = $(`#adminEmail_${type}`, this.root);
        if (input) input.value = cur[type] || "";

        const btn = $(`[data-admin-save-email="${type}"]`, this.root);
        btn?.addEventListener("click", () => {
          const val = input?.value || "";
          EmailService.setAdminEmail?.(type, val);
          this._toast("Сохранено");
        });
      });
    }

    async refreshAll() {
      await Promise.all([
        this.refreshList("security"),
        this.refreshList("wifi"),
        this.refreshList("graffiti")
      ]);
      await this.refreshDashboard();
    }

    async refreshList(type) {
      const list = await readReports(type);
      const root = $(`#adminList_${type}`, this.root);
      if (!root) return;

      const filtered = this.statusFilter === "all"
        ? list
        : list.filter((r) => String(r.status || "new") === String(this.statusFilter));

      root.innerHTML = "";

      if (!filtered.length) {
        root.innerHTML = `<div class="placeholder">Нет обращений</div>`;
        return;
      }

      filtered.forEach((r) => {
        root.appendChild(this._renderReportCard(type, r));
      });
    }

    _renderReportCard(type, report) {
      const card = document.createElement("div");
      card.className = "glass-card card";

      const p = report.payload || {};
      const title =
        type === "security" ? "Безопасность" :
        type === "wifi" ? "Wi‑Fi" :
        "Граффити";

      const status = report.status || "new";
      const ts = report.timestamp || "";
      const upd = report.updatedAt || "";
      const sub = report.subtype ? ` (${esc(report.subtype)})` : "";

      const loc = p.location || null;
      const coords = loc?.coordinates ? `${loc.coordinates.lat}, ${loc.coordinates.lon}` : "";
      const addr = loc?.manualAddress ? String(loc.manualAddress) : "";

      const place = p.place ? `<div class="meta"><b>Место:</b> ${esc(p.place)}</div>` : "";
      const locBlock = (coords || addr) ? `
        <div class="meta">
          <b>Локация:</b>
          ${coords ? `коорд. ${esc(coords)}` : ""}
          ${coords && addr ? " • " : ""}
          ${addr ? `адрес: ${esc(addr)}` : ""}
        </div>` : "";

      card.innerHTML = `
        <div class="card-head">
          <div class="card-title" title="${esc(title)}">${esc(title)}${sub}</div>
          <div class="meta" title="Статус">${esc(status)}</div>
        </div>

        <div class="meta"><b>ID:</b> ${esc(report.id)}</div>
        <div class="meta"><b>Создано:</b> ${esc(ts)}</div>
        ${upd ? `<div class="meta"><b>Обновлено:</b> ${esc(upd)}</div>` : ""}

        <div class="meta"><b>Имя:</b> ${esc(p.name || "")}</div>
        <div class="meta"><b>Телефон:</b> ${esc(p.phone || "")}</div>
        ${p.email ? `<div class="meta"><b>Email:</b> ${esc(p.email)}</div>` : ""}

        ${place}
        ${locBlock}

        ${p.description ? `<div class="card-desc" style="white-space:normal">${esc(p.description)}</div>` : ""}

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
          <button class="btn btn-secondary btn-compact" data-status="new" type="button">Новый</button>
          <button class="btn btn-secondary btn-compact" data-status="in_progress" type="button">В работе</button>
          <button class="btn btn-secondary btn-compact" data-status="resolved" type="button">Решено</button>
        </div>
      `;

      $$("button[data-status]", card).forEach((btn) => {
        btn.addEventListener("click", async () => {
          const next = btn.dataset.status;
          const ok = await updateReportStatus(type, report.id, next);
          if (!ok) return this._toast("Не удалось обновить", "warning");
          this._toast("Статус обновлён");
          this.refreshAll();
        });
      });

      return card;
    }

    async refreshDashboard() {
      const [sec, wifi, graf] = await Promise.all([
        readReports("security"),
        readReports("wifi"),
        readReports("graffiti")
      ]);

      const all = [...sec, ...wifi, ...graf];
      const byStatus = (s) => all.filter((r) => (r.status || "new") === s).length;

      const setText = (id, val) => { const el = $("#" + id, this.root); if (el) el.textContent = String(val); };
      setText("adminTotal", all.length);
      setText("adminNew", byStatus("new"));
      setText("adminInProgress", byStatus("in_progress"));
      setText("adminResolved", byStatus("resolved"));

      this._renderChart(sec.length, wifi.length, graf.length);
    }

    _renderChart(securityCount, wifiCount, graffitiCount) {
      const canvas = $("#adminChart", this.root);
      if (!canvas) return;

      // Chart.js optional
      if (!window.Chart) {
        // fallback text
        const parent = canvas.parentElement;
        if (parent && !parent.querySelector(".placeholder")) {
          const p = document.createElement("div");
          p.className = "placeholder";
          p.textContent = `Безопасность: ${securityCount} • Wi‑Fi: ${wifiCount} • Граффити: ${graffitiCount}`;
          parent.appendChild(p);
        }
        return;
      }

      const data = {
        labels: ["Безопасность", "Wi‑Fi", "Граффити"],
        datasets: [{ label: "Обращения", data: [securityCount, wifiCount, graffitiCount] }]
      };

      try {
        this.chart?.destroy?.();
      } catch (_) {}

      this.chart = new window.Chart(canvas, {
        type: "bar",
        data,
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    _toast(text) {
      const el = $("#adminPlaceholder") || this.root;
      if (!el) return;
      // используем общий toast приложения, если есть
      try { window.__MAX_APP__?.toast?.(text); return; } catch (_) {}
      console.log(text);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    try { new AdminPanel(); } catch (e) { console.error(e); }
  });
})();
