// admin-panel.js — Admin UI inside #admin-section (dynamic build)
// Функции:
//  - показывает обращения (security / wifi / graffiti)
//  - фильтр по статусу
//  - смена статуса (new / in_progress / resolved)
//  - экспорт CSV
//  - дашборд: счетчики + график (если Chart.js доступен)

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

  // ------- AppData helpers (совместимо с fallback из app.js) -------
  const AppData = window.AppData;

  const readReports = async (type) => {
    try {
      const list = await AppData.getReports(type);
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  };

  // update list полностью (используем приватные методы если есть, иначе localStorage)
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

  // ------- UI Builder -------
  class AdminPanel {
    constructor() {
      this.root = $("#admin-section");
      this.isAdmin = false;
      this.chart = null;

      this.activeTab = "dashboard";
      this.activeType = "security"; // for lists
      this.statusFilter = "all";

      this._boot();
    }

    _boot() {
      // Проверка админа делаем так же, как в app.js
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

      // Собираем UI
      this.root.innerHTML = this._template();

      // bind
      this._bindTabs();
      this._bindFilters();
      this._bindExports();
      this._bindEmailSettings();

      // initial
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

          <div class="tabs" role="tablist" aria-label="Админ вкладки" style="grid-template-columns:repeat(4,minmax(0,1fr));">
            <button class="tab is-active" data-admin-tab="dashboard" type="button" role="tab" aria-selected="true">Дашборд</button>
            <button class="tab" data-admin-tab="security" type="button" role="tab" aria-selected="false">Безопасность</button>
            <button class="tab" data-admin-tab="wifi" type="button" role="tab" aria-selected="false">Wi-Fi</button>
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
            <div id="adminList_wifi" class="cards-grid" aria-label="Список обращений Wi-Fi"></div>
          </div>

          <div class="tab-content" data-admin-tab-content="settings">
            <div class="glass-card" style="padding:14px;border-radius:18px;">
              <div style="font-weight:900;margin-bottom:12px;">Email для уведомлений</div>

              <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;">
                ${this._emailSetting("security", "Безопасность")}
                ${this._emailSetting("wifi", "Wi-Fi")}
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
            <button class="btn btn-primary btn-compact" id="adminExport_${t}" type="button">
              <i class="fas fa-download"></i><span>Экспорт CSV</span>
            </button>
          </div>
          <div style="color:var(--muted);font-weight:800;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            Тип: ${t.toUpperCase()}
          </div>
        </div>
      `;
    }

    _emailSetting(type, title) {
      const t = esc(type);
      const lab = esc(title);
      return `
        <div class="glass-card" style="padding:12px;border-radius:18px;">
          <div style="font-weight:900;margin-bottom:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${lab}</div>
          <div class="form-group" style="gap:8px;">
            <label for="adminEmail_${t}">Email</label>
            <input id="adminEmail_${t}" class="form-input" type="email" placeholder="name@domain.ru" />
            <button class="btn btn-primary btn-compact" id="adminEmailSave_${t}" type="button">
              <i class="fas fa-save"></i><span>Сохранить</span>
            </button>
          </div>
        </div>
      `;
    }

    _bindTabs() {
      const refresh = $("#adminRefresh");
      refresh?.addEventListener("click", () => this.refreshAll());

      $$("#admin-section [data-admin-tab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const tab = btn.dataset.adminTab;
          if (!tab) return;
          this.activeTab = tab;

          $$("#admin-section [data-admin-tab]").forEach((b) => {
            b.classList.toggle("is-active", b.dataset.adminTab === tab);
            b.setAttribute("aria-selected", b.dataset.adminTab === tab ? "true" : "false");
          });

          $$("#admin-section [data-admin-tab-content]").forEach((c) => {
            c.classList.toggle("is-active", c.dataset.adminTabContent === tab);
          });

          if (tab === "security") this.refreshList("security");
          if (tab === "wifi") this.refreshList("wifi");
          if (tab === "dashboard") this.refreshDashboard();
        });
      });
    }

    _bindFilters() {
      const s = $("#adminStatusFilter_security");
      const w = $("#adminStatusFilter_wifi");
      s?.addEventListener("change", () => this.refreshList("security"));
      w?.addEventListener("change", () => this.refreshList("wifi"));
    }

    _bindExports() {
      $("#adminExport_security")?.addEventListener("click", async () => {
        const list = await readReports("security");
        exportCSV("security_reports.csv", this._csvRows("security", list));
      });
      $("#adminExport_wifi")?.addEventListener("click", async () => {
        const list = await readReports("wifi");
        exportCSV("wifi_reports.csv", this._csvRows("wifi", list));
      });
    }

    _bindEmailSettings() {
      const svc = window.EmailService;
      const emails = svc?.getAdminEmails ? svc.getAdminEmails() : (window.AppConfig?.adminEmails || {});

      const fill = (type, val) => {
        const input = $(`#adminEmail_${type}`);
        if (input) input.value = val || "";
      };

      fill("security", emails.security || "");
      fill("wifi", emails.wifi || "");
      fill("graffiti", emails.graffiti || "");

      const bindSave = (type) => {
        $(`#adminEmailSave_${type}`)?.addEventListener("click", () => {
          const input = $(`#adminEmail_${type}`);
          const v = input ? String(input.value || "").trim() : "";
          const ok = svc?.setAdminEmail ? svc.setAdminEmail(type, v) : false;
          if (ok) this._toast("Сохранено", "success");
          else this._toast("Не удалось сохранить", "danger");
        });
      };

      bindSave("security");
      bindSave("wifi");
      bindSave("graffiti");
    }

    async refreshAll() {
      await this.refreshDashboard();
      await this.refreshList("security");
      await this.refreshList("wifi");
      this._toast("Данные обновлены", "success");
    }

    async refreshDashboard() {
      const sec = await readReports("security");
      const wifi = await readReports("wifi");
      const all = [...sec, ...wifi];

      const total = all.length;
      const cntNew = all.filter((r) => r.status === "new").length;
      const cntProg = all.filter((r) => r.status === "in_progress").length;
      const cntRes = all.filter((r) => r.status === "resolved").length;

      $("#adminTotal") && ($("#adminTotal").textContent = String(total));
      $("#adminNew") && ($("#adminNew").textContent = String(cntNew));
      $("#adminInProgress") && ($("#adminInProgress").textContent = String(cntProg));
      $("#adminResolved") && ($("#adminResolved").textContent = String(cntRes));

      // Chart
      const hasChart = typeof window.Chart !== "undefined";
      if (!hasChart) return;

      const ctx = $("#adminChart");
      if (!ctx) return;

      const data = {
        labels: ["Безопасность", "Wi-Fi"],
        datasets: [{
          label: "Обращения",
          data: [sec.length, wifi.length]
        }]
      };

      try {
        if (this.chart) {
          this.chart.data = data;
          this.chart.update();
        } else {
          this.chart = new window.Chart(ctx, {
            type: "doughnut",
            data,
            options: {
              responsive: true,
              plugins: {
                legend: { display: true }
              }
            }
          });
        }
      } catch (_) {
        // ignore chart failures
      }
    }

    async refreshList(type) {
      const list = await readReports(type);

      const filterEl = $(`#adminStatusFilter_${type}`);
      const filter = filterEl ? String(filterEl.value || "all") : "all";

      const filtered = filter === "all" ? list : list.filter((r) => r.status === filter);

      const box = $(`#adminList_${type}`);
      if (!box) return;
      box.innerHTML = "";

      if (!filtered.length) {
        box.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Нет обращений</div>`;
        return;
      }

      filtered.forEach((r) => {
        box.appendChild(this._renderCard(type, r));
      });
    }

    _renderCard(type, r) {
      const card = document.createElement("div");
      card.className = "wifi-card"; // используем готовый премиальный стиль карточки

      const title = document.createElement("div");
      title.className = "wifi-card-title";
      title.textContent = `${String(r.id || "").trim() || "Без ID"} • ${this._statusLabel(r.status)}`;
      title.title = title.textContent;

      const sub = document.createElement("div");
      sub.className = "wifi-card-sub";
      sub.textContent = `${(r.type || type).toUpperCase()}${r.subtype ? ` (${r.subtype})` : ""} • ${r.timestamp || ""}`;
      sub.title = sub.textContent;

      const payload = r.payload || {};
      const line1 = document.createElement("div");
      line1.className = "wifi-card-sub";
      line1.textContent = `Имя: ${payload.name || "—"} • Тел: ${payload.phone || "—"}`;
      line1.title = line1.textContent;

      const line2 = document.createElement("div");
      line2.className = "wifi-card-sub";
      const place =
        payload.place ||
        payload.address ||
        (payload.location?.lat && payload.location?.lon ? `${payload.location.lat}, ${payload.location.lon}` : "");
      line2.textContent = `Место: ${place || "—"}`;
      line2.title = line2.textContent;

      const desc = document.createElement("div");
      desc.className = "wifi-card-sub";
      desc.textContent = `Описание: ${String(payload.description || "").slice(0, 140) || "—"}`;
      desc.title = payload.description || "—";

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "10px";
      actions.style.flexWrap = "wrap";
      actions.style.marginTop = "10px";

      const btnNew = this._statusBtn("Новые", "new", type, r.id);
      const btnProg = this._statusBtn("В работе", "in_progress", type, r.id);
      const btnRes = this._statusBtn("Решено", "resolved", type, r.id);

      actions.append(btnNew, btnProg, btnRes);

      card.append(title, sub, line1, line2, desc, actions);
      return card;
    }

    _statusBtn(label, status, type, id) {
      const b = document.createElement("button");
      b.className = "btn btn-primary btn-compact";
      b.type = "button";
      b.innerHTML = `<span>${esc(label)}</span>`;
      b.addEventListener("click", async () => {
        const ok = await updateReportStatus(type, id, status);
        if (ok) {
          this._toast("Статус обновлен", "success");
          await this.refreshDashboard();
          await this.refreshList(type);
        } else {
          this._toast("Не удалось обновить статус", "danger");
        }
      });
      return b;
    }

    _statusLabel(s) {
      if (s === "in_progress") return "В работе";
      if (s === "resolved") return "Решено";
      return "Новое";
    }

    _csvRows(type, list) {
      const head = ["id", "type", "subtype", "status", "timestamp", "name", "phone", "email", "place/address", "coords", "description"];
      const rows = [head];

      list.forEach((r) => {
        const p = r.payload || {};
        const coords =
          p.location?.lat && p.location?.lon ? `${p.location.lat},${p.location.lon}` : "";
        const place = p.place || p.address || "";
        rows.push([
          r.id || "",
          r.type || type,
          r.subtype || "",
          r.status || "",
          r.timestamp || "",
          p.name || "",
          p.phone || "",
          p.email || "",
          place,
          coords,
          (p.description || "").replaceAll("\n", " ")
        ]);
      });

      return rows;
    }

    _toast(msg, kind = "success") {
      // маленькая нотификация без ломания layout
      const el = document.createElement("div");
      el.style.position = "fixed";
      el.style.left = "50%";
      el.style.top = "16px";
      el.style.transform = "translateX(-50%)";
      el.style.zIndex = "9999";
      el.style.padding = "10px 14px";
      el.style.borderRadius = "14px";
      el.style.whiteSpace = "nowrap";
      el.style.maxWidth = "92vw";
      el.style.overflow = "hidden";
      el.style.textOverflow = "ellipsis";
      el.style.fontWeight = "900";
      el.style.fontSize = "13px";
      el.style.backdropFilter = "blur(14px)";
      el.style.webkitBackdropFilter = "blur(14px)";
      el.style.border = "1px solid rgba(255,255,255,.16)";
      el.style.boxShadow = "0 16px 40px rgba(0,0,0,.35)";
      el.style.color = "rgba(255,255,255,.92)";

      const bg =
        kind === "danger" ? "rgba(255,59,48,.78)" :
        kind === "warning" ? "rgba(255,159,10,.78)" :
        "rgba(52,199,89,.68)";
      el.style.background = bg;

      el.textContent = String(msg || "").slice(0, 140);
      document.body.appendChild(el);
      setTimeout(() => {
        el.style.opacity = "0";
        el.style.transition = "opacity 240ms ease";
        setTimeout(() => el.remove(), 260);
      }, 1600);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    // не ломаемся, если нет AppData
    if (!window.AppData) return;
    window.adminPanel = new AdminPanel();
  });
})();
