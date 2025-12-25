// admin-panel.js — Simple Admin UI (no charts / no totals / no summary)
// Требования:
// - 3 секции: security / wifi / graffiti
// - админ видит только доступные секции (ADMIN_ACCESS или ADMIN_USER_IDS)
// - фильтры: статус (new / in_progress / all), поиск
// - Wi-Fi: subtype (problem / new / all)
// - без ответов; можно только посмотреть и перевести статус new <-> in_progress
// - адаптивно + поддержка темной/светлой темы через ваши CSS variables

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

  const fmtDate = (iso) => {
    const d = iso ? new Date(iso) : null;
    if (!d || Number.isNaN(d.getTime())) return "—";
    // 23.12.2025 12:03
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}.${mm}.${yy} ${hh}:${mi}`;
  };

  const clamp = (s, n = 120) => {
    const v = String(s ?? "").trim();
    if (!v) return "";
    return v.length > n ? v.slice(0, n - 1) + "…" : v;
  };

  // совместимо с вашим app.js fallback
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
      if (AppData && typeof AppData._save === "function") return await AppData._save(key, list);
    } catch (_) {}
    try {
      localStorage.setItem(key, JSON.stringify(list));
      return true;
    } catch (_) {
      return false;
    }
  };

  const updateReportStatus = async (type, id, status) => {
    try {
      // если есть серверный метод — используем его
      if (AppData && typeof AppData.setReportStatus === "function") {
        const ok = await AppData.setReportStatus(id, status);
        return !!ok;
      }
    } catch (_) {}
  
    // fallback (старое поведение)
    const list = await readReports(type);
    const idx = list.findIndex((r) => String(r.id) === String(id));
    if (idx < 0) return false;
    list[idx].status = status;
    list[idx].updatedAt = new Date().toISOString();
    return writeReports(type, list);
  };

  const getUid = () => {
    const uid = window.WebApp?.initDataUnsafe?.user?.id;
    return uid == null ? "" : String(uid);
  };

  const getAccess = () => {
    const uid = getUid();
    const fallback = (window.ADMIN_USER_IDS || []).map(String);

    // если есть ADMIN_ACCESS — используем его
    const access = window.ADMIN_ACCESS && typeof window.ADMIN_ACCESS === "object" ? window.ADMIN_ACCESS : null;

    const can = (section) => {
      if (!uid) return false;
      if (access && Array.isArray(access[section])) return access[section].map(String).includes(uid);
      return fallback.includes(uid);
    };

    const sections = ["security", "wifi", "graffiti"].filter(can);

    return { uid, isAdmin: sections.length > 0, sections };
  };

  const STATUS_LABEL = {
    new: "Новые",
    in_progress: "В работе",
    resolved: "Решено"
  };

  const TYPE_LABEL = {
    security: "Безопасность",
    wifi: "Wi-Fi",
    graffiti: "Граффити"
  };

  const WIFI_SUB_LABEL = {
    all: "Все",
    problem: "Проблемы",
    new: "Новые точки"
  };

  // модалка — используем общий #modal
  const showModal = (title, bodyHTML, actionsHTML) => {
    const modal = $("#modal");
    if (!modal) return;
    const t = $("#modalTitle");
    const b = $("#modalBody");
    const a = $("#modalActions");
    if (t) t.textContent = title || "";
    if (b) b.innerHTML = bodyHTML || "";
    if (a) a.innerHTML = actionsHTML || "";
    modal.setAttribute("aria-hidden", "false");
  };

  const hideModal = () => {
    $("#modal")?.setAttribute("aria-hidden", "true");
  };

  class AdminPanelV2 {
    constructor() {
      this.root = $("#admin-section");
      this.state = {
        activeSection: "security",
        status: "all", // all | new | in_progress
        q: "",
        wifiSubtype: "all" // all | problem | new
      };

      this.access = getAccess();
      this._boot();
    }

    _boot() {
      if (!this.root) return;

      if (!this.access.isAdmin) {
        const card = this.root.querySelector(".glass-card.form-card");
        if (card) {
          card.innerHTML = `<div class="placeholder">Доступ только для администраторов</div>`;
        }
        return;
      }

      // если доступна 1 секция — сразу ее
      this.state.activeSection = this.access.sections[0] || "security";

      // рендерим UI
      const card = this.root.querySelector(".glass-card.form-card");
      if (!card) return;

      card.innerHTML = this._template();

      // bind
      this._bind();
      this.refresh();
    }

    _template() {
      return `
        <div class="admin-v2">
          <div class="admin-v2__head">
            <div class="admin-v2__title">Админ панель</div>
            <button class="btn btn-primary btn-compact" id="admRefresh" type="button">
              <i class="fas fa-sync"></i><span>Обновить</span>
            </button>
          </div>

          <div class="admin-v2__seg" role="tablist" aria-label="Секции">
            ${this.access.sections
              .map((s) => {
                const active = s === this.state.activeSection ? "is-active" : "";
                return `<button type="button" class="admin-v2__seg-btn ${active}" data-adm-sec="${esc(
                  s
                )}" role="tab" aria-selected="${s === this.state.activeSection ? "true" : "false"}">
                  ${esc(TYPE_LABEL[s] || s)}
                </button>`;
              })
              .join("")}
          </div>

          <div class="admin-v2__toolbar">
            <div class="admin-v2__filters">
              <select class="form-select" id="admStatus">
                <option value="all">Все</option>
                <option value="new">Новые</option>
                <option value="in_progress">В работе</option>
              </select>

              <select class="form-select" id="admWifiSubtype" style="display:none;">
                <option value="all">${esc(WIFI_SUB_LABEL.all)}</option>
                <option value="problem">${esc(WIFI_SUB_LABEL.problem)}</option>
                <option value="new">${esc(WIFI_SUB_LABEL.new)}</option>
              </select>
            </div>

            <div class="admin-v2__search">
              <i class="fas fa-search" aria-hidden="true"></i>
              <input class="form-input" id="admSearch" type="text" placeholder="Поиск по обращениям" />
            </div>
          </div>

          <div class="admin-v2__list" id="admList"></div>

          <div class="admin-v2__empty placeholder" id="admEmpty" style="display:none;">
            Нет обращений по выбранным фильтрам
          </div>
        </div>
      `;
    }

    _bind() {
      $("#admRefresh")?.addEventListener("click", () => this.refresh());

      // секции
      $$(".admin-v2__seg-btn", this.root).forEach((btn) => {
        btn.addEventListener("click", () => {
          const sec = btn.dataset.admSec;
          if (!sec) return;
          this.state.activeSection = sec;

          $$(".admin-v2__seg-btn", this.root).forEach((b) => {
            const on = b.dataset.admSec === sec;
            b.classList.toggle("is-active", on);
            b.setAttribute("aria-selected", on ? "true" : "false");
          });

          // wifi subtype показываем только в wifi
          this._syncWifiSubtypeVisibility();

          // сбросим поиск (так удобнее админам)
          const inp = $("#admSearch", this.root);
          if (inp) inp.value = "";
          this.state.q = "";

          this.refresh();
        });
      });

      // фильтр статус
      $("#admStatus")?.addEventListener("change", (e) => {
        this.state.status = e.target.value || "all";
        this.refresh();
      });

      // фильтр subtype wifi
      $("#admWifiSubtype")?.addEventListener("change", (e) => {
        this.state.wifiSubtype = e.target.value || "all";
        this.refresh();
      });

      // поиск
      $("#admSearch")?.addEventListener("input", (e) => {
        this.state.q = String(e.target.value || "").trim().toLowerCase();
        this.refresh();
      });

      this._syncWifiSubtypeVisibility();
    }

    _syncWifiSubtypeVisibility() {
      const sel = $("#admWifiSubtype", this.root);
      if (!sel) return;
      const isWifi = this.state.activeSection === "wifi";
      sel.style.display = isWifi ? "" : "none";
      if (!isWifi) this.state.wifiSubtype = "all";
    }

    async refresh() {
      const type = this.state.activeSection;
      const listEl = $("#admList", this.root);
      const emptyEl = $("#admEmpty", this.root);
      if (!listEl || !emptyEl) return;

      const raw = await readReports(type);

      // фильтры
      let items = raw;

      // статус: берём только new / in_progress / (иногда старые resolved)
      if (this.state.status !== "all") {
        items = items.filter((r) => String(r.status || "new") === this.state.status);
      }

      // wifi subtype
      if (type === "wifi" && this.state.wifiSubtype !== "all") {
        items = items.filter((r) => String(r.subtype || "") === this.state.wifiSubtype);
      }

      // поиск
      const q = this.state.q;
      if (q) {
        items = items.filter((r) => {
          const p = r.payload || {};
          const hay = [
            r.id,
            r.type,
            r.subtype,
            r.status,
            r.timestamp,
            p.name,
            p.phone,
            p.email,
            p.category,
            p.place,
            p.address,
            p.description
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        });
      }

      // сортировка: новые сверху (по timestamp)
      items = [...items].sort((a, b) => {
        const ta = new Date(a.timestamp || 0).getTime() || 0;
        const tb = new Date(b.timestamp || 0).getTime() || 0;
        return tb - ta;
      });

      // render
      listEl.innerHTML = "";

      if (!items.length) {
        emptyEl.style.display = "";
        return;
      }
      emptyEl.style.display = "none";

      const cards = items.map((r) => this._card(type, r)).join("");
      listEl.innerHTML = cards;

      // bind cards click
      $$(".admin-v2__card", listEl).forEach((card) => {
        card.addEventListener("click", async () => {
          const id = card.dataset.id;
          if (!id) return;
          const current = raw.find((x) => String(x.id) === String(id));
          if (!current) return;
          this._openDetails(type, current);
        });
      });
    }

    _badge(status) {
      const s = String(status || "new");
      const label = STATUS_LABEL[s] || s;
      const cls = s === "in_progress" ? "is-work" : s === "resolved" ? "is-done" : "is-new";
      return `<span class="admin-v2__badge ${cls}">${esc(label)}</span>`;
    }

    _card(type, r) {
      const p = r.payload || {};
      const status = String(r.status || "new");

      const title =
        type === "wifi"
          ? `${TYPE_LABEL.wifi}${r.subtype ? ` — ${WIFI_SUB_LABEL[r.subtype] || r.subtype}` : ""}`
          : (TYPE_LABEL[type] || type);

      const line1 =
        type === "security"
          ? (p.category ? `Категория: ${p.category}` : "")
          : type === "wifi"
          ? (p.place ? `Место: ${p.place}` : "")
          : (p.place || p.address ? `Место: ${p.place || p.address}` : "");

      const who = p.name ? `От: ${p.name}` : (r.user?.username ? `От: ${r.user.username}` : "");
      const when = fmtDate(r.timestamp);

      const desc = clamp(p.description || "", 140);

      return `
        <div class="admin-v2__card" role="button" tabindex="0" data-id="${esc(r.id)}" aria-label="Открыть обращение ${esc(r.id)}">
          <div class="admin-v2__card-top">
            <div class="admin-v2__card-title">
              <div class="admin-v2__card-title-main">${esc(title)}</div>
              <div class="admin-v2__card-title-sub">ID: ${esc(r.id)} • ${esc(when)}</div>
            </div>
            ${this._badge(status)}
          </div>

          <div class="admin-v2__card-lines">
            ${who ? `<div class="admin-v2__line">${esc(who)}</div>` : ""}
            ${line1 ? `<div class="admin-v2__line">${esc(line1)}</div>` : ""}
            ${desc ? `<div class="admin-v2__desc">${esc(desc)}</div>` : ""}
          </div>
        </div>
      `;
    }

    _openDetails(type, r) {
      const p = r.payload || {};
      const status = String(r.status || "new");
      const subtype = r.subtype ? String(r.subtype) : "";

      const statusSelectId = `adm_status_${Date.now()}`;
      const btnSaveId = `adm_save_${Date.now()}`;
      const btnCloseId = `adm_close_${Date.now()}`;

      const title =
        type === "wifi"
          ? `${TYPE_LABEL.wifi}${subtype ? ` — ${WIFI_SUB_LABEL[subtype] || subtype}` : ""}`
          : (TYPE_LABEL[type] || type);

      const body = `
        <div class="admin-v2__detail">
          <div class="admin-v2__detail-row">
            <div class="admin-v2__detail-k">ID</div>
            <div class="admin-v2__detail-v">${esc(r.id)}</div>
          </div>

          <div class="admin-v2__detail-row">
            <div class="admin-v2__detail-k">Дата</div>
            <div class="admin-v2__detail-v">${esc(fmtDate(r.timestamp))}</div>
          </div>

          <div class="admin-v2__detail-row">
            <div class="admin-v2__detail-k">Статус</div>
            <div class="admin-v2__detail-v">
              <select class="form-select" id="${esc(statusSelectId)}">
                <option value="new" ${status === "new" ? "selected" : ""}>Новые</option>
                <option value="in_progress" ${status === "in_progress" ? "selected" : ""}>В работе</option>
              </select>
              <div class="admin-v2__hint">Можно только: “Новые” ↔ “В работе”.</div>
            </div>
          </div>

          <hr class="admin-v2__hr" />

          ${p.name ? this._drow("Имя", p.name) : ""}
          ${p.phone ? this._drow("Телефон", p.phone) : ""}
          ${p.email ? this._drow("Email", p.email) : ""}

          ${p.category ? this._drow("Категория", p.category) : ""}
          ${p.place ? this._drow("Место", p.place) : ""}
          ${p.address ? this._drow("Адрес", p.address) : ""}

          ${
            p.location?.lat && p.location?.lon
              ? this._drow("Координаты", `${p.location.lat}, ${p.location.lon}`)
              : ""
          }

          ${p.description ? this._drow("Описание", p.description, true) : ""}

          ${
            Array.isArray(p.media) && p.media.length
              ? this._drow("Медиа", `${p.media.length} файл(ов)`, false)
              : ""
          }

          ${
            r.user
              ? `
                <hr class="admin-v2__hr" />
                <div class="admin-v2__detail-row">
                  <div class="admin-v2__detail-k">Пользователь</div>
                  <div class="admin-v2__detail-v">
                    ${esc(
                      [r.user.first_name, r.user.last_name].filter(Boolean).join(" ").trim() ||
                        r.user.username ||
                        "—"
                    )}
                    ${r.user.id != null ? `<div class="admin-v2__hint">user.id: ${esc(r.user.id)}</div>` : ""}
                  </div>
                </div>
              `
              : ""
          }
        </div>
      `;

      const actions = `
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-wide" id="${esc(btnCloseId)}" type="button">
            <span>Закрыть</span>
          </button>
          <button class="btn btn-primary btn-wide" id="${esc(btnSaveId)}" type="button">
            <i class="fas fa-check"></i><span>Сохранить</span>
          </button>
        </div>
      `;

      showModal(title, body, actions);

      const onClose = () => {
        cleanup();
        hideModal();
      };

      const onSave = async () => {
        const sel = $("#" + statusSelectId);
        const next = sel ? String(sel.value || "new") : "new";
        await updateReportStatus(type, r.id, next);
        cleanup();
        hideModal();
        this.refresh();
      };

      const cleanup = () => {
        $("#" + btnCloseId)?.removeEventListener("click", onClose);
        $("#" + btnSaveId)?.removeEventListener("click", onSave);
      };

      $("#" + btnCloseId)?.addEventListener("click", onClose);
      $("#" + btnSaveId)?.addEventListener("click", onSave);
    }

    _drow(k, v, pre = false) {
      return `
        <div class="admin-v2__detail-row">
          <div class="admin-v2__detail-k">${esc(k)}</div>
          <div class="admin-v2__detail-v">
            ${pre ? `<div class="admin-v2__pre">${esc(v)}</div>` : esc(v)}
          </div>
        </div>
      `;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    try {
      new AdminPanelV2();
    } catch (e) {
      console.error(e);
    }
  });
})();
