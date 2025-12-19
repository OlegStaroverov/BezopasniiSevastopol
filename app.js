// app.js — SafeSevastopol (final for current HTML/CSS)
// Совместим с index.html из предыдущего шага (sections/tabs/modals/buttons)
// Без падений, с защитой от отсутствующих зависимостей (MAX Bridge / ymaps)

(() => {
  "use strict";

  // ---------- Safe helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const clampStr = (v, max = 800) => {
    if (v == null) return "";
    const s = String(v);
    return s.length > max ? s.slice(0, max) : s;
  };

  // ---------- AppData fallback (если в data.js его нет) ----------
  // Хранение: SecureStorage MAX (если есть) -> localStorage
  const AppData = (window.AppData ||= {
    _themeKey: "theme",
    _reportsKey: (type) => `reports_${type}`,

    getTheme() {
      return localStorage.getItem(this._themeKey) || "dark";
    },
    setTheme(theme) {
      const t = theme === "light" ? "light" : "dark";
      localStorage.setItem(this._themeKey, t);
      document.documentElement.setAttribute("data-theme", t);

      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", t === "dark" ? "#0A84FF" : "#0A84FF");
      return t;
    },
    toggleTheme() {
      const cur = this.getTheme();
      return this.setTheme(cur === "dark" ? "light" : "dark");
    },

    async _save(key, value) {
      try {
        if (window.WebApp?.SecureStorage?.setItem) {
          await window.WebApp.SecureStorage.setItem(key, JSON.stringify(value));
          return true;
        }
      } catch (_) {}
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (_) {
        return false;
      }
    },

    async _load(key) {
      try {
        if (window.WebApp?.SecureStorage?.getItem) {
          const raw = await window.WebApp.SecureStorage.getItem(key);
          return raw ? JSON.parse(raw) : null;
        }
      } catch (_) {}
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (_) {
        return null;
      }
    },

    async getReports(type) {
      const t = String(type || "").trim();
      if (!t) return [];
      return (await this._load(this._reportsKey(t))) || [];
    },

    async saveReport(type, report) {
      const t = String(type || "").trim();
      if (!t) return false;
      const key = this._reportsKey(t);
      const list = (await this._load(key)) || [];
      list.unshift(report);
      return this._save(key, list);
    }
  });

  // ---------- Main App ----------
  class SafeSevastopolApp {
    constructor() {
      this.WebApp = window.WebApp || null;
      this.user = null;
      this.isAdmin = false;

      this.section = "security";
      this.wifiTab = "search";

      this.map = null;
      this.mapMarker = null;
      this.mapSelected = null;
      this.mapContext = null;

      this.securityLocation = null; // {lat, lon, address?}
      this.wifiOrigin = null; // {lat, lon}

      this._init();
    }

    async _init() {
      // MAX ready (не ломаем если нет)
      try {
        this.WebApp?.ready?.();
      } catch (_) {}

      // Theme init
      AppData.setTheme(AppData.getTheme());
      this._syncThemeIcon();

      // User init + admin check
      this._loadUser();
      this._checkAdmin();

      // UI bind
      this._bindNavigation();
      this._bindTheme();
      this._bindWifiTabs();
      this._bindSecurityForm();
      this._bindWifiSearch();
      this._bindWifiProblemForm();
      this._bindWifiNewForm();
      this._bindModalSystem();
      this._bindMapModal();

      // Initial render
      this.switchSection("security", { silent: true });
      this.switchWifiTab("search", { silent: true });

      // Preload wifi list
      this.renderWifiResults(window.wifiPoints || []);

      // Small polish
      this.toast("Готово к работе", "success");
    }

    // ---------- User / Admin ----------
    _loadUser() {
      const u = this.WebApp?.initDataUnsafe?.user || null;
      this.user = u;
    }

    _checkAdmin() {
      const id = this.user?.id != null ? String(this.user.id) : "";
      const admins = (window.ADMIN_USER_IDS || []).map(String);
      this.isAdmin = id && admins.includes(id);

      // Hide admin nav if not admin (bottom nav has admin always)
      const adminBtn = $(`.bottom-nav .nav-item[data-section="admin"]`);
      if (adminBtn) adminBtn.style.display = this.isAdmin ? "" : "none";
    }

    // ---------- Navigation ----------
    _bindNavigation() {
      $$(".bottom-nav .nav-item").forEach((btn) => {
        btn.addEventListener("click", () => {
          const section = btn.dataset.section;
          if (!section) return;
          this.switchSection(section);
          this.haptic("light");
        });
      });
    }

    switchSection(section, opts = {}) {
      const s = String(section || "").trim();
      if (!s) return;
      if (s === "admin" && !this.isAdmin) {
        this.toast("Доступ только для администраторов", "warning");
        this.haptic("warning");
        return;
      }

      this.section = s;

      // nav active
      $$(".bottom-nav .nav-item").forEach((b) => {
        b.classList.toggle("is-active", b.dataset.section === s);
      });

      // sections
      $$(".content-section").forEach((sec) => {
        sec.classList.toggle("is-active", sec.dataset.section === s);
      });

      if (!opts.silent) this.haptic("light");
    }

    // ---------- Theme ----------
    _bindTheme() {
      const toggle = $("#themeToggle");
      if (!toggle) return;
      toggle.addEventListener("click", () => {
        AppData.toggleTheme();
        this._syncThemeIcon();
        this.haptic("light");
      });
    }

    _syncThemeIcon() {
      const btn = $("#themeToggle");
      if (!btn) return;
      const icon = $("i", btn);
      if (!icon) return;
      const t = document.documentElement.getAttribute("data-theme") || "dark";
      icon.className = t === "dark" ? "fas fa-moon" : "fas fa-sun";
    }

    // ---------- Wi-Fi Tabs ----------
    _bindWifiTabs() {
      $$("#wifi-section .tab").forEach((tab) => {
        tab.addEventListener("click", () => {
          const name = tab.dataset.tab;
          if (!name) return;
          this.switchWifiTab(name);
          this.haptic("light");
        });
      });
    }

    switchWifiTab(name, opts = {}) {
      const n = String(name || "").trim();
      if (!n) return;
      this.wifiTab = n;

      $$("#wifi-section .tab").forEach((t) => {
        t.classList.toggle("is-active", t.dataset.tab === n);
        t.setAttribute("aria-selected", t.dataset.tab === n ? "true" : "false");
      });

      $$("#wifi-section .tab-content").forEach((c) => {
        c.classList.toggle("is-active", c.dataset.tabContent === n);
      });

      if (!opts.silent) this.haptic("light");
    }

    // ---------- Security Form ----------
    _bindSecurityForm() {
      const form = $("#securityForm");
      if (!form) return;

      const phoneInput = $("#securityPhone");
      if (phoneInput) {
        // При фокусе - если поле пустое, ставим +7
        phoneInput.addEventListener("focus", () => {
          if (!phoneInput.value.trim()) {
            phoneInput.value = "+7";
          }
        });
    
        // При вводе - следим чтобы +7 всегда было в начале
        phoneInput.addEventListener("input", (e) => {
          const value = e.target.value;
          
          // Если удалили +7, восстанавливаем
          if (!value.startsWith("+7")) {
            // Оставляем только цифры
            const digits = value.replace(/\D/g, '');
            
            // Если начиналось с 8 или 7 - делаем +7
            if (digits.startsWith('8') || digits.startsWith('7')) {
              e.target.value = "+7" + digits.slice(1);
            } else {
              e.target.value = "+7" + digits;
            }
          }
        });
    
        // При потере фокуса - убираем лишнее
        phoneInput.addEventListener("blur", (e) => {
          const value = e.target.value.replace(/\D/g, '');
          if (value.startsWith('7') || value.startsWith('8')) {
            e.target.value = "+7" + value.slice(1);
          } else if (value.length > 0 && !value.startsWith('7')) {
            e.target.value = "+7" + value;
          }
        });
      }
      
      // Name from MAX
      const useMaxName = $("#useMaxName");
      if (useMaxName) {
        useMaxName.addEventListener("click", () => {
          const fn = this.user?.first_name || "";
          const ln = this.user?.last_name || "";
          const full = [fn, ln].filter(Boolean).join(" ").trim();
          const name = full || this.user?.username || "";
          const input = $("#securityName");
          if (input && name) {
            input.value = name;
            this.toast("Имя подставлено", "success");
            this.haptic("light");
          } else {
            this.toast("Не удалось получить имя из MAX", "warning");
            this.haptic("warning");
          }
        });
      }

      // Location buttons
      $("#useCurrentLocation")?.addEventListener("click", () => this._useCurrentLocation());
      $("#useManualLocation")?.addEventListener("click", () => this._focusManualAddress());
      $("#useMapLocation")?.addEventListener("click", () => this.openMap("security"));
      $("#showOnMap")?.addEventListener("click", () => this.openMap("security"));

      // Description counter
      const desc = $("#securityDescription");
      const counter = $("#charCount");
      if (desc && counter) {
        const sync = () => (counter.textContent = String(desc.value.length || 0));
        desc.addEventListener("input", sync);
        sync();
      }

      // Media preview (simple)
      const mediaInput = $("#securityMedia");
      const mediaPreview = $("#mediaPreview");
      if (mediaInput && mediaPreview) {
        mediaInput.addEventListener("change", () => {
          mediaPreview.innerHTML = "";
          const files = Array.from(mediaInput.files || []).slice(0, (window.AppConfig?.limits?.maxMediaFiles || 5));
          files.forEach((f) => {
            const item = document.createElement("div");
            item.className = "media-item";
            item.title = f.name;
            item.textContent = f.name;
            mediaPreview.appendChild(item);
          });
        });
      }

      // Submit with confirmation modal
      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const data = this._collectSecurityForm();
        const err = this._validateSecurity(data);
        if (err) {
          this.toast(err, "danger");
          this.haptic("error");
          return;
        }

        const ok = await this.confirmModal("Подтверждение", this._renderSecurityConfirm(data), "Подтвердить", "Отмена");
        if (!ok) return;

        const report = {
          id: (window.AppUtils?.generateReportId?.() || `RPT-${Date.now()}`),
          type: "security",
          status: "new",
          timestamp: (window.AppUtils?.getCurrentTimestamp?.() || new Date().toISOString()),
          user: this._userSnapshot(),
          payload: data
        };

        const saved = await AppData.saveReport("security", report);
        if (!saved) {
          this.toast("Не удалось сохранить обращение", "danger");
          this.haptic("error");
          return;
        }

        await this._notifyAdmins("security", report);

        this.toast("Обращение отправлено", "success");
        this.haptic("success");
        form.reset();
        this.securityLocation = null;
        const hint = $("#locationHint");
        if (hint) hint.textContent = "Адрес/координаты будут добавлены в обращение";
        const counter2 = $("#charCount");
        if (counter2) counter2.textContent = "0";
        const mediaPreview2 = $("#mediaPreview");
        if (mediaPreview2) mediaPreview2.innerHTML = "";
      });
    }

    _collectSecurityForm() {
      const name = clampStr($("#securityName")?.value || "", 120);
      const phone = clampStr($("#securityPhone")?.value || "", 40);
      const email = clampStr($("#securityEmail")?.value || "", 140);
      const category = clampStr($("#securityCategory")?.value || "", 60);
      const description = clampStr($("#securityDescription")?.value || "", 1200);
      const address = clampStr($("#manualAddress")?.value || "", 220);

      const mediaInput = $("#securityMedia");
      const files = Array.from(mediaInput?.files || []).slice(0, (window.AppConfig?.limits?.maxMediaFiles || 5));
      const media = files.map((f) => ({ name: f.name, type: f.type, size: f.size }));

      const location = this.securityLocation
        ? { lat: this.securityLocation.lat, lon: this.securityLocation.lon, address: this.securityLocation.address || "" }
        : null;

      return { name, phone, email, category, description, address, location, media };
    }

    _validateSecurity(d) {
      // обязательны: все строки кроме email и медиа
      if (!d.name.trim()) return "Введите имя";
      if (!this._validatePhone(d.phone)) return "Введите корректный телефон";
      if (!d.category.trim()) return "Выберите категорию";
      const hasLoc = !!(d.location && this._isNum(d.location.lat) && this._isNum(d.location.lon));
      const hasAddr = !!d.address.trim();
      if (!hasLoc && !hasAddr) return "Укажите местоположение (адрес или точку на карте)";
      if (!d.description.trim() || d.description.trim().length < (window.AppConfig?.limits?.descriptionMinLength || 10)) {
        return `Описание должно быть не короче ${window.AppConfig?.limits?.descriptionMinLength || 10} символов`;
      }
      if (d.email && !this._validateEmail(d.email)) return "Некорректный email";
      return "";
    }

    _renderSecurityConfirm(d) {
      const locLine = d.location
        ? `Координаты: ${d.location.lat.toFixed(6)}, ${d.location.lon.toFixed(6)}`
        : "Координаты: —";
      const addrLine = d.address ? `Адрес: ${d.address}` : "Адрес: —";
      const mediaLine = d.media?.length ? `Медиа: ${d.media.length} файл(ов)` : "Медиа: —";

      return `
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div><b>Имя:</b> ${this._esc(d.name)}</div>
          <div><b>Телефон:</b> ${this._esc(d.phone)}</div>
          <div><b>Email:</b> ${this._esc(d.email || "—")}</div>
          <div><b>Категория:</b> ${this._esc(d.category)}</div>
          <div><b>${this._esc(addrLine)}</b></div>
          <div><b>${this._esc(locLine)}</b></div>
          <div><b>Описание:</b> ${this._esc(d.description)}</div>
          <div><b>${this._esc(mediaLine)}</b></div>
        </div>
      `;
    }

    async _useCurrentLocation() {
      if (!navigator.geolocation) {
        this.toast("Геолокация недоступна", "warning");
        return;
      }
      this.toast("Определяем местоположение…", "success");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          this.securityLocation = { lat, lon, address: "" };
          const hint = $("#locationHint");
          if (hint) hint.textContent = `Координаты: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
          this.haptic("success");
        },
        () => {
          this.toast("Не удалось получить геолокацию", "danger");
          this.haptic("error");
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    }

    _focusManualAddress() {
      const a = $("#manualAddress");
      if (a) {
        a.focus();
        a.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    // ---------- Wi-Fi Search + Nearby ----------
    _bindWifiSearch() {
      const input = $("#wifiSearch");
      const findNearby = $("#findNearby");
      if (input) {
        input.addEventListener("input", () => {
          const q = input.value.trim().toLowerCase();
          const all = window.wifiPoints || [];
          const filtered = !q
            ? all
            : all.filter((p) => {
                const s = `${p.name || ""} ${p.address || ""} ${p.type || ""} ${p.description || ""}`.toLowerCase();
                return s.includes(q);
              });
          this.renderWifiResults(filtered);
        });
      }
      if (findNearby) {
        findNearby.addEventListener("click", () => {
          this.mapContext = "wifi-nearby";
          this.openMap("wifi-nearby");
        });
      }
    }

    renderWifiResults(points) {
      const list = Array.isArray(points) ? points : [];
      const box = $("#wifiResults");
      const cnt = $("#wifiCount");
      const empty = $("#wifiEmpty");

      if (cnt) cnt.textContent = String(list.length);

      if (!box) return;
      box.innerHTML = "";

      if (!list.length) {
        if (empty) empty.style.display = "";
        return;
      }
      if (empty) empty.style.display = "none";

      list.forEach((p) => {
        const card = document.createElement("div");
        card.className = "wifi-card";
        const title = document.createElement("div");
        title.className = "wifi-card-title";
        title.textContent = p.name || "Точка Wi-Fi";
        title.title = title.textContent;

        const sub = document.createElement("div");
        sub.className = "wifi-card-sub";
        sub.textContent = p.address || "";
        sub.title = sub.textContent;

        card.appendChild(title);
        card.appendChild(sub);

        // distance if origin known
        if (this.wifiOrigin && p.coordinates && this._isNum(p.coordinates.lat) && this._isNum(p.coordinates.lon) && window.AppUtils?.calculateDistance) {
          const d = window.AppUtils.calculateDistance(this.wifiOrigin.lat, this.wifiOrigin.lon, p.coordinates.lat, p.coordinates.lon);
          const line = document.createElement("div");
          line.className = "wifi-card-sub";
          line.textContent = `Расстояние: ${window.AppUtils.formatDistance ? window.AppUtils.formatDistance(d) : `${d.toFixed(2)} км`}`;
          line.title = line.textContent;
          card.appendChild(line);
        }

        box.appendChild(card);
      });
    }

    // ---------- Wi-Fi Problem / New forms ----------
    _bindWifiProblemForm() {
      const form = $("#wifiProblemForm");
      if (!form) return;

      const wifiProblemPhone = $("#wifiProblemPhone");
      if (wifiProblemPhone) {
        wifiProblemPhone.addEventListener("focus", () => {
          if (!wifiProblemPhone.value.trim()) {
            wifiProblemPhone.value = "+7";
          }
        });
      
        wifiProblemPhone.addEventListener("input", (e) => {
          const value = e.target.value;
          if (!value.startsWith("+7")) {
            const digits = value.replace(/\D/g, '');
            if (digits.startsWith('8') || digits.startsWith('7')) {
              e.target.value = "+7" + digits.slice(1);
            } else {
              e.target.value = "+7" + digits;
            }
          }
        });
      
        wifiProblemPhone.addEventListener("blur", (e) => {
          const value = e.target.value.replace(/\D/g, '');
          if (value.startsWith('7') || value.startsWith('8')) {
            e.target.value = "+7" + value.slice(1);
          } else if (value.length > 0 && !value.startsWith('7')) {
            e.target.value = "+7" + value;
          }
        });
      }
      
      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const d = {
          name: clampStr($("#wifiProblemName")?.value || "", 120),
          phone: clampStr($("#wifiProblemPhone")?.value || "", 40),
          email: clampStr($("#wifiProblemEmail")?.value || "", 140),
          place: clampStr($("#wifiProblemPlace")?.value || "", 220),
          description: clampStr($("#wifiProblemDescription")?.value || "", 1200)
        };

        const err =
          (!d.name.trim() && "Введите имя") ||
          (!this._validatePhone(d.phone) && "Введите корректный телефон") ||
          (!d.place.trim() && "Укажите место/адрес") ||
          (!d.description.trim() && "Опишите проблему") ||
          (d.email && !this._validateEmail(d.email) && "Некорректный email") ||
          "";

        if (err) {
          this.toast(err, "danger");
          this.haptic("error");
          return;
        }

        const ok = await this.confirmModal(
          "Подтверждение",
          `<div style="display:flex;flex-direction:column;gap:10px;">
             <div><b>Тип:</b> Проблема Wi-Fi</div>
             <div><b>Имя:</b> ${this._esc(d.name)}</div>
             <div><b>Телефон:</b> ${this._esc(d.phone)}</div>
             <div><b>Email:</b> ${this._esc(d.email || "—")}</div>
             <div><b>Место:</b> ${this._esc(d.place)}</div>
             <div><b>Описание:</b> ${this._esc(d.description)}</div>
           </div>`,
          "Подтвердить",
          "Отмена"
        );
        if (!ok) return;

        const report = {
          id: (window.AppUtils?.generateReportId?.() || `RPT-${Date.now()}`),
          type: "wifi",
          subtype: "problem",
          status: "new",
          timestamp: (window.AppUtils?.getCurrentTimestamp?.() || new Date().toISOString()),
          user: this._userSnapshot(),
          payload: d
        };

        const saved = await AppData.saveReport("wifi", report);
        if (!saved) {
          this.toast("Не удалось сохранить обращение", "danger");
          this.haptic("error");
          return;
        }

        await this._notifyAdmins("wifi", report);

        this.toast("Заявка отправлена", "success");
        this.haptic("success");
        form.reset();
      });
    }

    _bindWifiNewForm() {
      const form = $("#wifiNewForm");
      if (!form) return;

      const wifiNewPhone = $("#wifiNewPhone");
      if (wifiNewPhone) {
        wifiNewPhone.addEventListener("focus", () => {
          if (!wifiNewPhone.value.trim()) {
            wifiNewPhone.value = "+7";
          }
        });
      
        wifiNewPhone.addEventListener("input", (e) => {
          const value = e.target.value;
          if (!value.startsWith("+7")) {
            const digits = value.replace(/\D/g, '');
            if (digits.startsWith('8') || digits.startsWith('7')) {
              e.target.value = "+7" + digits.slice(1);
            } else {
              e.target.value = "+7" + digits;
            }
          }
        });
      
        wifiNewPhone.addEventListener("blur", (e) => {
          const value = e.target.value.replace(/\D/g, '');
          if (value.startsWith('7') || value.startsWith('8')) {
            e.target.value = "+7" + value.slice(1);
          } else if (value.length > 0 && !value.startsWith('7')) {
            e.target.value = "+7" + value;
          }
        });
      }
      
      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const d = {
          name: clampStr($("#wifiNewName")?.value || "", 120),
          phone: clampStr($("#wifiNewPhone")?.value || "", 40),
          email: clampStr($("#wifiNewEmail")?.value || "", 140),
          place: clampStr($("#wifiNewPlace")?.value || "", 220),
          description: clampStr($("#wifiNewDescription")?.value || "", 1200)
        };

        const err =
          (!d.name.trim() && "Введите имя") ||
          (!this._validatePhone(d.phone) && "Введите корректный телефон") ||
          (!d.place.trim() && "Укажите место/адрес") ||
          (!d.description.trim() && "Добавьте описание") ||
          (d.email && !this._validateEmail(d.email) && "Некорректный email") ||
          "";

        if (err) {
          this.toast(err, "danger");
          this.haptic("error");
          return;
        }

        const ok = await this.confirmModal(
          "Подтверждение",
          `<div style="display:flex;flex-direction:column;gap:10px;">
             <div><b>Тип:</b> Новая точка Wi-Fi</div>
             <div><b>Имя:</b> ${this._esc(d.name)}</div>
             <div><b>Телефон:</b> ${this._esc(d.phone)}</div>
             <div><b>Email:</b> ${this._esc(d.email || "—")}</div>
             <div><b>Место:</b> ${this._esc(d.place)}</div>
             <div><b>Описание:</b> ${this._esc(d.description)}</div>
           </div>`,
          "Подтвердить",
          "Отмена"
        );
        if (!ok) return;

        const report = {
          id: (window.AppUtils?.generateReportId?.() || `RPT-${Date.now()}`),
          type: "wifi",
          subtype: "new",
          status: "new",
          timestamp: (window.AppUtils?.getCurrentTimestamp?.() || new Date().toISOString()),
          user: this._userSnapshot(),
          payload: d
        };

        const saved = await AppData.saveReport("wifi", report);
        if (!saved) {
          this.toast("Не удалось сохранить обращение", "danger");
          this.haptic("error");
          return;
        }

        await this._notifyAdmins("wifi", report);

        this.toast("Предложение отправлено", "success");
        this.haptic("success");
        form.reset();
      });
    }

    // ---------- Modal system (confirm modal) ----------
    _bindModalSystem() {
      const modal = $("#modal");
      if (!modal) return;

      // Close actions
      modal.addEventListener("click", (e) => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        if (t.dataset.close === "modal") this.hideModal("modal");
      });
    }

    showModal(title, bodyHTML, actionsHTML) {
      const modal = $("#modal");
      if (!modal) return;
      $("#modalTitle") && ($("#modalTitle").textContent = title || ""); // eslint-disable-line no-unused-expressions
      const body = $("#modalBody");
      if (body) body.innerHTML = bodyHTML || "";
      const actions = $("#modalActions");
      if (actions) actions.innerHTML = actionsHTML || "";
      modal.setAttribute("aria-hidden", "false");
    }

    hideModal(which = "modal") {
      const modal = which === "mapModal" ? $("#mapModal") : $("#modal");
      if (!modal) return;
      modal.setAttribute("aria-hidden", "true");
    }

    confirmModal(title, bodyHTML, okText = "OK", cancelText = "Отмена") {
      return new Promise((resolve) => {
        const okId = `ok_${Date.now()}`;
        const cancelId = `cancel_${Date.now()}`;

        this.showModal(
          title,
          bodyHTML,
          `<div style="display:flex;gap:10px;flex-wrap:wrap;">
             <button class="btn btn-secondary btn-wide" id="${cancelId}" type="button"><span>${this._esc(cancelText)}</span></button>
             <button class="btn btn-primary btn-wide" id="${okId}" type="button"><span>${this._esc(okText)}</span></button>
           </div>`
        );

        const cleanup = () => {
          $(`#${okId}`)?.removeEventListener("click", onOk);
          $(`#${cancelId}`)?.removeEventListener("click", onCancel);
        };

        const onOk = () => {
          cleanup();
          this.hideModal("modal");
          resolve(true);
        };

        const onCancel = () => {
          cleanup();
          this.hideModal("modal");
          resolve(false);
        };

        $(`#${okId}`)?.addEventListener("click", onOk);
        $(`#${cancelId}`)?.addEventListener("click", onCancel);
      });
    }

    // ---------- Map Modal (Yandex) ----------
    _bindMapModal() {
      const mapModal = $("#mapModal");
      if (!mapModal) return;

      mapModal.addEventListener("click", (e) => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        if (t.dataset.close === "mapModal") this.hideModal("mapModal");
      });

      $("#confirmMapSelection")?.addEventListener("click", () => this._confirmMapSelection());
    }

    openMap(context) {
      this.mapContext = context || "security";

      const mapModal = $("#mapModal");
      if (!mapModal) return;

      // Show
      mapModal.setAttribute("aria-hidden", "false");

      // Init map
      this._initYandexMap();
    }

    _initYandexMap() {
      if (!window.ymaps || typeof window.ymaps.ready !== "function") {
        this.toast("Яндекс карты недоступны (проверь API ключ)", "warning");
        return;
      }

      window.ymaps.ready(() => {
        const el = $("#yandexMap");
        if (!el) return;

        // If exists, just resize
        if (this.map) {
          try {
            this.map.container.fitToViewport();
          } catch (_) {}
          return;
        }

        const center = window.AppConfig?.coordinates
          ? [window.AppConfig.coordinates.lat, window.AppConfig.coordinates.lon]
          : [44.6166, 33.5254];

        this.map = new window.ymaps.Map(el, {
          center,
          zoom: 12,
          controls: ["zoomControl"]
        });

        this.map.events.add("click", (e) => {
          const coords = e.get("coords");
          if (!coords || coords.length < 2) return;
          const lat = coords[0];
          const lon = coords[1];
          this.mapSelected = { lat, lon };

          if (this.mapMarker) {
            this.mapMarker.geometry.setCoordinates(coords);
          } else {
            this.mapMarker = new window.ymaps.Placemark(coords, {}, { draggable: true });
            this.map.geoObjects.add(this.mapMarker);
            this.mapMarker.events.add("dragend", () => {
              const c = this.mapMarker.geometry.getCoordinates();
              this.mapSelected = { lat: c[0], lon: c[1] };
            });
          }
          this.haptic("selection");
        });

        // Fit
        setTimeout(() => {
          try {
            this.map.container.fitToViewport();
          } catch (_) {}
        }, 50);
      });
    }

    _confirmMapSelection() {
      if (!this.mapSelected || !this._isNum(this.mapSelected.lat) || !this._isNum(this.mapSelected.lon)) {
        this.toast("Поставьте метку на карте", "warning");
        this.haptic("warning");
        return;
      }

      const { lat, lon } = this.mapSelected;

      if (this.mapContext === "wifi-nearby") {
        // origin for wifi distance
        this.wifiOrigin = { lat, lon };
        // sort all points by distance and render
        const all = window.wifiPoints || [];
        if (window.AppUtils?.calculateDistance) {
          const sorted = [...all].sort((a, b) => {
            const da = a.coordinates ? window.AppUtils.calculateDistance(lat, lon, a.coordinates.lat, a.coordinates.lon) : Infinity;
            const db = b.coordinates ? window.AppUtils.calculateDistance(lat, lon, b.coordinates.lat, b.coordinates.lon) : Infinity;
            return da - db;
          });
          this.renderWifiResults(sorted);
          this.toast("Показаны ближайшие точки", "success");
          this.haptic("success");
        } else {
          this.renderWifiResults(all);
        }
      } else {
        // security location
        this.securityLocation = { lat, lon, address: "" };
        const hint = $("#locationHint");
        if (hint) hint.textContent = `Координаты: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
        this.toast("Метка выбрана", "success");
        this.haptic("success");
      }

      this.hideModal("mapModal");
    }

    // ---------- Admin email notify ----------
    async _notifyAdmins(type, report) {
      // EmailService may be stubbed now; real impl будет в email-service.js следующей частью
      const svc = window.EmailService;
      if (!svc || typeof svc.sendEmail !== "function") return;

      const adminEmails = svc.getAdminEmails ? svc.getAdminEmails() : (svc.config?.adminEmails || {});
      const to = adminEmails[type] || adminEmails.security || "";
      if (!to) return;

      const subject = `[${type.toUpperCase()}] Новое обращение ${report.id}`;
      const text = this._buildPlainEmail(report);

      try {
        await svc.sendEmail({ to, subject, text });
      } catch (_) {}
    }

    _buildPlainEmail(report) {
      const p = report.payload || {};
      const lines = [];
      lines.push(`ID: ${report.id}`);
      lines.push(`Тип: ${report.type}${report.subtype ? ` (${report.subtype})` : ""}`);
      lines.push(`Дата: ${report.timestamp}`);
      if (p.name) lines.push(`Имя: ${p.name}`);
      if (p.phone) lines.push(`Телефон: ${p.phone}`);
      if (p.email) lines.push(`Email: ${p.email}`);
      if (p.category) lines.push(`Категория: ${p.category}`);
      if (p.place) lines.push(`Место: ${p.place}`);
      if (p.address) lines.push(`Адрес: ${p.address}`);
      if (p.location?.lat && p.location?.lon) lines.push(`Координаты: ${p.location.lat}, ${p.location.lon}`);
      if (p.description) lines.push(`Описание: ${p.description}`);
      if (p.media?.length) lines.push(`Медиа: ${p.media.length}`);
      return lines.join("\n");
    }

    // ---------- Notifications / Haptics ----------
    toast(message, type = "success") {
      // Minimal, no layout breaks
      const txt = clampStr(message, 140);
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
      el.style.fontWeight = "800";
      el.style.fontSize = "13px";
      el.style.backdropFilter = "blur(14px)";
      el.style.webkitBackdropFilter = "blur(14px)";
      el.style.border = "1px solid rgba(255,255,255,.16)";
      el.style.boxShadow = "0 16px 40px rgba(0,0,0,.35)";
      el.style.color = "rgba(255,255,255,.92)";

      const bg =
        type === "danger" ? "rgba(255,59,48,.78)" :
        type === "warning" ? "rgba(255,159,10,.78)" :
        "rgba(52,199,89,.68)";
      el.style.background = bg;

      el.textContent = txt;
      document.body.appendChild(el);
      setTimeout(() => {
        el.style.opacity = "0";
        el.style.transition = "opacity 240ms ease";
        setTimeout(() => el.remove(), 260);
      }, 1800);
    }

    haptic(kind) {
      try {
        const h = this.WebApp?.HapticFeedback;
        if (!h) return;
        if (kind === "success") return h.notificationOccurred("success");
        if (kind === "error") return h.notificationOccurred("error");
        if (kind === "warning") return h.notificationOccurred("warning");
        if (kind === "selection") return h.selectionChanged();
        return h.impactOccurred(kind || "light");
      } catch (_) {}
    }

    // ---------- Validation ----------
    _validatePhone(phone) {
      if (window.AppUtils?.validatePhone) return window.AppUtils.validatePhone(phone);
      const s = String(phone || "").replace(/[()\s-]/g, "");
      return /^(\+7|7|8)?[489]\d{9}$/.test(s);
    }

    _validateEmail(email) {
      const s = String(email || "").trim();
      if (!s) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
    }

    _isNum(v) {
      return typeof v === "number" && Number.isFinite(v);
    }

    _userSnapshot() {
      const u = this.user || {};
      return {
        id: u.id ?? null,
        first_name: u.first_name ?? "",
        last_name: u.last_name ?? "",
        username: u.username ?? "",
        language_code: u.language_code ?? ""
      };
    }

    _esc(s) {
      return String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }
  }

  // ---------- Boot ----------
  document.addEventListener("DOMContentLoaded", () => {
    window.app = new SafeSevastopolApp();
  });
})();
