// app.js — MAX Mini App

(() => {
  "use strict";

  // -------------------- Helpers --------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const clampStr = (v, max = 1500) => {
    const s = String(v ?? "");
    return s.length > max ? s.slice(0, max) : s;
  };

  const safeNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const esc = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const fmtCoords = (coords) => {
    if (!coords || coords.lat == null || coords.lon == null) return "";
    return `${Number(coords.lat).toFixed(6)}, ${Number(coords.lon).toFixed(6)}`;
  };

  const AppData = window.AppData;

  // -------------------- App --------------------
  class MaxMiniApp {
    constructor() {
      this.WebApp = window.WebApp || null;
      this.user = null;
      this.isAdmin = false;

      this.section = "security";
      this.wifiTab = "search";
      this.wifiBaseList = (window.wifiPoints || []);
      this.wifiWithDistance = false;
      this.wifiFilterType = "all";

      this.map = null;
      this.mapMarker = null;
      this.mapSelected = null;
      this.mapContext = null;

      // locations
      this.securityLocation = { coords: null, manualAddress: "" };
      this.graffitiLocation = { coords: null, manualAddress: "" };
      this.argusLocation = { coords: null, manualAddress: "" };

      this._init();
    }

    async _init() {
      const safe = (fn, label) => {
        try {
          return fn();
        } catch (e) {
          console.error(`[INIT] ${label} failed:`, e);
          return undefined;
        }
      };
    
      // ВАЖНО: чтобы один упавший бинд НЕ убивал всю инициализацию
      try {
        safe(() => { try { this.WebApp?.ready?.(); } catch (_) {} }, "WebApp.ready");
    
        // theme
        safe(() => { try { AppData?.setTheme?.(AppData.getTheme()); } catch (_) {} }, "theme.init");
        safe(() => this._syncThemeIcon(), "theme.icon");
    
        // user/admin
        safe(() => { this.user = this.WebApp?.initDataUnsafe?.user || null; }, "user.read");
        safe(() => { this.isAdmin = this._isAdminUser(this.user); }, "admin.check");
        safe(() => this._syncAdminNav(), "admin.nav");
    
        // binds
        safe(() => this._enableTapClickBridge(), "tap.bridge");
        safe(() => this._bindTheme(), "bind.theme");
        safe(() => this._applyRenamesAndInjectNewSections(), "inject.sections");
        safe(() => this._bindNavigation(), "bind.navigation");
        safe(() => this._bindModalSystem(), "bind.modal");
        safe(() => this._bindMapModal(), "bind.mapModal");
    
        safe(() => this._bindSecurityForm(), "bind.securityForm");
        safe(() => this._bindWifiTabs(), "bind.wifiTabs");
        safe(() => this._initWifiTypeFilter(), "init.wifiTypeFilter");
        safe(() => this._bindWifiSearch(), "bind.wifiSearch");
        safe(() => this._bindWifiProblemForm(), "bind.wifiProblemForm");
        safe(() => this._bindWifiNewForm(), "bind.wifiNewForm");
        safe(() => this._bindGraffitiForm(), "bind.graffitiForm");
        safe(() => this._bindArgusForm(), "bind.argusForm");
        safe(() => this._bindAppointmentForm(), "bind.appointmentForm");
    
        // initial render
        safe(() => this.switchSection("security", { silent: true }), "render.section");
        safe(() => this.switchWifiTab("search", { silent: true }), "render.wifiTab");
        safe(() => { this.wifiBaseList = (window.wifiPoints || []); }, "wifi.baseList");
        safe(() => { this.wifiWithDistance = false; }, "wifi.distanceFlag");
        safe(() => this._applyWifiFilters(), "wifi.applyFilters");
    
        safe(() => this.toast("Готово к работе", "success"), "toast.ready");
      } catch (fatal) {
        console.error("[INIT] fatal error:", fatal);
        try { this.toast("Ошибка инициализации приложения", "danger"); } catch (_) {}
      }
    }

    // -------------------- Admin --------------------
    _isAdminUser(user) {
      const uid = user?.id != null ? String(user.id) : "";
      const admins = (window.ADMIN_USER_IDS || []).map(String);
      return !!uid && admins.includes(uid);
    }

    _syncAdminNav() {
      const adminBtn = $(`.bottom-nav .nav-item[data-section="admin"]`);
      if (adminBtn) adminBtn.style.display = this.isAdmin ? "" : "none";
    }

        // -------------------- Tap/Click bridge (MAX WebView compatibility) --------------------
    _enableTapClickBridge() {
      // Если WebView перестал генерировать "click" по тапу на кнопках,
      // мы мягко мапим touchend -> click, не трогая инпуты.
      if (this.__tapBridgeEnabled) return;
      this.__tapBridgeEnabled = true;

      // Только для тач-устройств
      if (!("ontouchstart" in window)) return;

      let sx = 0, sy = 0, moved = false;

      document.addEventListener("touchstart", (e) => {
        const t = e.touches && e.touches[0];
        if (!t) return;
        sx = t.clientX;
        sy = t.clientY;
        moved = false;
      }, { passive: true });

      document.addEventListener("touchmove", (e) => {
        const t = e.touches && e.touches[0];
        if (!t) return;
        // если это скролл/жест — не считаем тапом
        if (Math.abs(t.clientX - sx) > 8 || Math.abs(t.clientY - sy) > 8) moved = true;
      }, { passive: true });

      document.addEventListener("touchend", (e) => {
        if (moved) return;

        const target = e.target;
        if (!target) return;

        // Инпуты/селекты/текстарии не трогаем — они и так работают
        const tag = (target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select" || tag === "label") return;

        // Ищем ближайший "кликабельный" элемент
        const clickable = target.closest?.(
          'button, a, [role="button"], .btn, .nav-item, [data-section], [data-tab], [data-close]'
        );
        if (!clickable) return;

        // Если click уже должен был сработать — мы не мешаем, но в проблемных WebView он не приходит.
        // Важно: preventDefault, чтобы не было двойной активации (особенно у <a>).
        e.preventDefault();

        // Генерируем синтетический click
        try {
          clickable.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
        } catch (_) {}
      }, { passive: false });
    }

    // -------------------- Navigation --------------------
    _bindNavigation() {
      $$(".bottom-nav .nav-item").forEach((btn) => {
        if (btn.dataset.navBound === "1") return;
        btn.dataset.navBound = "1";
    
        btn.addEventListener("click", () => {
          const sec = btn.dataset.section;
          if (!sec) return;
          this.switchSection(sec);
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

      $$(".bottom-nav .nav-item").forEach((b) => {
        b.classList.toggle("is-active", b.dataset.section === s);
      });

      $$(".content-section").forEach((sec) => {
        sec.classList.toggle("is-active", sec.dataset.section === s);
      });

      this._resetScroll();
      if (!opts.silent) this.haptic("light");
    }

    _resetScroll() {
      try {
        window.scrollTo({ top: 0, behavior: "instant" });
      } catch (_) {
        window.scrollTo(0, 0);
      }
      try {
        document.querySelector("main.main")?.scrollTo?.({ top: 0, behavior: "instant" });
      } catch (_) {}
    }

    // -------------------- Dynamic sections: rename + ARGUS + Appointment --------------------
    _applyRenamesAndInjectNewSections() {
      // 1) rename bottom-nav label: "Безопасность" -> "Оборона"
      try {
        const secBtn = document.querySelector('.bottom-nav .nav-item[data-section="security"] span');
        if (secBtn) secBtn.textContent = "Оборона";
      } catch (_) {}

      // text for "Оборона" (security section) - without touching index.html
      try {
        const note = document.querySelector('#security-section .section-note');
        if (note) {
          note.textContent =
            "Это форма для приема сообщений о подозрительных предметах, событиях и ситуациях, которые могут представлять угрозу безопасности. " +
            "Оперативные службы города проверят поступившую информацию и примут меры. " +
            "Пожалуйста, заполните форму и укажите корректный email — ответ будет направлен вам по почте.";
          note.setAttribute("title", note.textContent);
        }
      } catch (_) {}

      // text for "Граффити" (existing section) - without touching index.html
      try {
        const note = document.querySelector('#graffiti-section .section-note');
        if (note) {
          note.textContent =
            "В этом разделе вы можете сообщить о граффити, надписях или изображениях, портящих красоту нашего белокаменного Города-Героя. " +
            "Укажите адрес или выберите место на карте, при необходимости добавьте фото.";
          note.setAttribute("title", note.textContent);
        }
      } catch (_) {}
      
      // 2) mark known emails as required (без правки HTML)
      try {
        ["#securityEmail", "#wifiProblemEmail", "#wifiNewEmail", "#graffitiEmail"].forEach((sel) => {
          const el = document.querySelector(sel);
          if (el) el.required = true;
        });
      } catch (_) {}
    
      const main = document.querySelector("main.main");
      const nav = document.querySelector("nav.bottom-nav");
      if (!main || !nav) return;
    
      // 3) inject ARGUS
      if (!document.querySelector("#argus-section")) {
        nav.insertBefore(
          this._createNavItem("argus", "fas fa-eye", "АРГУС"),
          nav.querySelector('.nav-item[data-section="contacts"]') || null
        );
        main.insertBefore(this._createArgusSection(), document.querySelector("#contacts-section") || null);
      }
    
      // 4) inject Appointment
      if (!document.querySelector("#appointment-section")) {
        nav.insertBefore(
          this._createNavItem("appointment", "fas fa-calendar-alt", "Запись"),
          nav.querySelector('.nav-item[data-section="contacts"]') || null
        );
        main.insertBefore(this._createAppointmentSection(), document.querySelector("#contacts-section") || null);
      }
    
      // 5) rebind for new nav buttons
      this._bindNavigation();
    }
    
    _createNavItem(section, iconClass, labelText) {
      const btn = document.createElement("button");
      btn.className = "nav-item";
      btn.type = "button";
      btn.dataset.section = section;
      btn.innerHTML = `<i class="${iconClass}"></i><span>${labelText}</span>`;
      return btn;
    }
    
    _createArgusSection() {
      const sec = document.createElement("section");
      sec.id = "argus-section";
      sec.className = "content-section";
      sec.dataset.section = "argus";
      sec.setAttribute("aria-label", "АРГУС");
    
      sec.innerHTML = `
        <div class="section-head">
          <div class="section-title" title="АРГУС">АРГУС</div>
          <div class="section-note" title="В Севастополе действует система видеонаблюдения «Аргус», включающая более 2000 камер по всему городу. Система используется для контроля общественного порядка, помощи правоохранительным органам, выявления правонарушений и поиска пропавших людей. Если вы стали свидетелем происшествия или считаете, что ситуация требует внимания, вы можете отправить обращение через эту форму. Сообщение будет зарегистрировано и передано ответственным специалистам.">
  В Севастополе действует система видеонаблюдения «Аргус», включающая более 2000 камер по всему городу. Система используется для контроля общественного порядка, помощи правоохранительным органам, выявления правонарушений и поиска пропавших людей. Если вы стали свидетелем происшествия или считаете, что ситуация требует внимания, вы можете отправить обращение через эту форму. Сообщение будет зарегистрировано и передано ответственным специалистам.
</div>
        </div>
    
        <form id="argusForm" class="glass-card form-card" autocomplete="on">
          <div class="form-grid">
            <div class="form-group">
              <label for="argusName">Имя *</label>
              <div class="input-row">
                <input id="argusName" class="form-input" type="text" placeholder="Ваше имя" required />
                <button class="btn btn-primary btn-compact" id="useMaxNameArgus" type="button">
                  <i class="fas fa-user-check"></i><span>Из MAX</span>
                </button>
              </div>
            </div>
    
            <div class="form-group">
              <label for="argusPhone">Телефон *</label>
              <input id="argusPhone" class="form-input" type="tel" inputmode="tel" placeholder="+7" required />
            </div>
    
            <div class="form-group">
              <label for="argusEmail">Email</label>
              <input id="argusEmail" class="form-input" type="email" inputmode="email" placeholder="name@mail.ru" required />
            </div>
    
            <div class="form-group">
              <label>Локация *</label>
              <div class="location-actions">
                <button type="button" class="btn btn-primary location-btn" id="argusUseCurrentLocation">МОЕ МЕСТОПОЛОЖЕНИЕ</button>
                <button type="button" class="btn btn-primary location-btn" id="argusSelectOnMap">ВЫБРАТЬ НА КАРТЕ</button>
                <button type="button" class="btn btn-primary location-btn" id="argusShowAddressInput">УКАЗАТЬ АДРЕС</button>
              </div>
    
              <div class="address-input-wrapper" id="argusAddressWrap" hidden>
                <input type="text" id="argusAddressInput" class="form-input" autocomplete="street-address" placeholder="Введите адрес или описание места" />
              </div>
    
              <div class="form-hint" id="argusLocationHint">Укажите местоположение (адрес или точку на карте)</div>
              <input id="argusCoordinates" class="form-input is-hidden" type="text" readonly />
            </div>
    
            <div class="form-group form-group--full">
              <label for="argusDescription">Описание *</label>
              <textarea id="argusDescription" class="form-textarea" rows="5" placeholder="Опишите ситуацию максимально подробно" required></textarea>
              <div class="meta-row">
                <div class="meta" aria-live="polite"><span id="argusCharCount">0</span>/500</div>
              </div>
            </div>
    
            <div class="form-group form-group--full">
              <label>Медиа</label>
              <div class="upload" id="argusUploadArea">
                <input id="argusMedia" type="file" accept="image/*,video/*" multiple />
                <div class="upload-ui">
                  <i class="fas fa-cloud-upload-alt"></i>
                  <div class="upload-text">
                    <div class="upload-title" title="Добавить фото/видео">Добавить фото/видео</div>
                    <div class="upload-sub" title="Перетащите или выберите файлы">Перетащите или выберите</div>
                  </div>
                </div>
              </div>
              <div class="media-preview" id="argusMediaPreview"></div>
            </div>
          </div>
    
          <div class="actions">
            <button class="btn btn-primary btn-wide" id="submitArgus" type="submit">
              <i class="fas fa-paper-plane"></i><span>ОТПРАВИТЬ</span>
            </button>
          </div>
        </form>
      `;
    
      return sec;
    }
    
    _createAppointmentSection() {
      const sec = document.createElement("section");
      sec.id = "appointment-section";
      sec.className = "content-section";
      sec.dataset.section = "appointment";
      sec.setAttribute("aria-label", "Запись на прием в департамент цифрового развития");
    
      sec.innerHTML = `
        <div class="section-head">
          <div class="section-title" title="Запись на прием в департамент цифрового развития">Запись на прием в департамент цифрового развития</div>
          <div class="section-note" title="Через эту форму вы можете оставить заявку на запись на прием в департамент цифрового развития города Севастополя. Это поможет сотрудникам заранее ознакомиться с вашим вопросом и подготовиться к встрече. Пожалуйста, укажите контактные данные, желаемую дату прием и кратко опишите суть обращения.">
            Через эту форму вы можете оставить заявку на запись на прием в департамент цифрового развития города Севастополя. Это поможет сотрудникам заранее ознакомиться с вашим вопросом и подготовиться к встрече. Пожалуйста, укажите контактные данные, желаемую дату прием и кратко опишите суть обращения.
          </div>
        </div>
    
        <form id="appointmentForm" class="glass-card form-card" autocomplete="on">
          <div class="form-grid">
            <div class="form-group">
              <label for="appointmentName">ФИО *</label>
              <input id="appointmentName" class="form-input" type="text" placeholder="ФИО" required />
            </div>
    
            <div class="form-group">
              <label for="appointmentPhone">Телефон *</label>
              <input id="appointmentPhone" class="form-input" type="tel" inputmode="tel" placeholder="+7" required />
            </div>
    
            <div class="form-group">
              <label for="appointmentEmail">Email</label>
              <input id="appointmentEmail" class="form-input" type="email" inputmode="email" placeholder="name@mail.ru" required />
            </div>
    
            <div class="form-group">
              <label for="appointmentDate">Дата приёма *</label>
              <input id="appointmentDate" class="form-input" type="text" placeholder="Выберите дату" readonly required />
            </div>
    
            <div class="form-group form-group--full">
              <label for="appointmentDescription">Что Вас интересует? *</label>
              <textarea id="appointmentDescription" class="form-textarea" rows="5" placeholder="Опишите вопрос, с которым Вы хотите обратиться в департамент." required></textarea>
            </div>
          </div>
    
          <div class="actions">
            <button class="btn btn-primary btn-wide" id="submitAppointment" type="submit">
              <i class="fas fa-paper-plane"></i><span>ОТПРАВИТЬ</span>
            </button>
          </div>
        </form>
      `;
    
      return sec;
    }
    
    // -------------------- ARGUS form bind --------------------
    _bindArgusForm() {
      const form = document.querySelector("#argusForm");
      if (!form) return;
    
      this._bindPhoneMask("#argusPhone");
      this._bindUseMaxName("#useMaxNameArgus", "#argusName");
    
      document.querySelector("#argusUseCurrentLocation")?.addEventListener("click", () => this._useCurrentLocation("argus"));
      document.querySelector("#argusSelectOnMap")?.addEventListener("click", () => this.openMap("argus"));
      document.querySelector("#argusShowAddressInput")?.addEventListener("click", () => this._setAddressInputVisible("argus", true));
    
      document.querySelector("#argusAddressInput")?.addEventListener("input", (e) => {
        this.argusLocation.manualAddress = String(e.target.value || "").slice(0, 260);
        this._syncLocationUI("argus");
      });
    
      const desc = document.querySelector("#argusDescription");
      const counter = document.querySelector("#argusCharCount");
      const maxLen = 500;
      if (desc && counter) {
        const sync = () => {
          if (desc.value.length > maxLen) desc.value = desc.value.slice(0, maxLen);
          counter.textContent = String(desc.value.length || 0);
        };
        desc.addEventListener("input", sync);
        sync();
      }
    
      this._bindMediaPreview("#argusMedia", "#argusMediaPreview");
    
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
    
        const payload = this._collectCommonPayload({
          nameSel: "#argusName",
          phoneSel: "#argusPhone",
          emailSel: "#argusEmail",
          descriptionSel: "#argusDescription",
          location: this.argusLocation,
          mediaSel: "#argusMedia"
        });
    
        payload.requestType = "argus";
    
        const err = this._validateCommon(payload, { requireLocation: true });
        if (err) { this.toast(err, "danger"); this.haptic("error"); return; }
    
        const ok = await this.confirmModal("Подтверждение", this._renderConfirm(payload, "argus"), "Подтвердить", "Отмена");
        if (!ok) return;
    
        const report = AppData.makeReport("argus", payload, { user: this._userSnapshot() });
        const saved = await AppData.saveReport("argus", report);
        if (!saved) { this.toast("Не удалось сохранить обращение", "danger"); this.haptic("error"); return; }
    
        await this._notifyAdmins("argus", report);
    
        this.toast("Заявка отправлена. Администрация ответит вам в течение 5 рабочих дней по указанной почте.", "success");
        this.haptic("success");
        form.reset();
        this.argusLocation = { coords: null, manualAddress: "" };
        this._setAddressInputVisible("argus", false);
        this._syncLocationUI("argus");
        const mp = document.querySelector("#argusMediaPreview");
        if (mp) mp.innerHTML = "";
        const cc = document.querySelector("#argusCharCount");
        if (cc) cc.textContent = "0";
      });
    }
    
    // -------------------- Appointment form bind --------------------
    _bindAppointmentForm() {
      const form = document.querySelector("#appointmentForm");
      if (!form) return;

      document.querySelector("#appointmentDate")?.addEventListener("click", (e) => {
        e.preventDefault();
        this._openAppointmentDatePicker();
      });
      
      document.querySelector("#appointmentDate")?.addEventListener("focus", (e) => {
        e.preventDefault();
        this._openAppointmentDatePicker();
      });
    
      this._bindPhoneMask("#appointmentPhone");

      // date picker button -> native calendar
      const dateInput = document.querySelector("#appointmentDate");
      const dateDisplay = document.querySelector("#appointmentDateDisplay");
      const pickBtn = document.querySelector("#appointmentPickDate");
      
      const syncDate = () => {
        if (!dateDisplay) return;
        dateDisplay.value = dateInput?.value ? dateInput.value : "";
      };
      
      if (pickBtn && dateInput) {
        pickBtn.addEventListener("click", () => {
          try {
            // Chrome/Android supports showPicker()
            if (typeof dateInput.showPicker === "function") dateInput.showPicker();
            else dateInput.focus();
          } catch (_) {
            try { dateInput.focus(); } catch (_) {}
          }
        });
      }
      
      if (dateInput) dateInput.addEventListener("change", syncDate);
      syncDate();
      
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
    
        const payload = {
          requestType: "appointment",
          name: String(document.querySelector("#appointmentName")?.value || "").slice(0, 140).trim(),
          phone: String(document.querySelector("#appointmentPhone")?.value || "").slice(0, 40).trim(),
          email: String(document.querySelector("#appointmentEmail")?.value || "").slice(0, 180).trim(),
          date: String(document.querySelector("#appointmentDate")?.value || "").trim(),
          description: String(document.querySelector("#appointmentDescription")?.value || "").slice(0, 1000).trim()
        };
    
        if (!payload.name) { this.toast("Укажите ФИО", "danger"); this.haptic("error"); return; }
        if (!payload.phone || payload.phone.replace(/\D/g, "").length < 6) { this.toast("Укажите телефон", "danger"); this.haptic("error"); return; }
        if (!payload.email) { this.toast("Укажите email", "danger"); this.haptic("error"); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) { this.toast("Некорректный email", "danger"); this.haptic("error"); return; }
        if (!payload.date) { this.toast("Укажите дату приёма", "danger"); this.haptic("error"); return; }
        if (!payload.description) { this.toast("Укажите описание вопроса", "danger"); this.haptic("error"); return; }
    
        const ok = await this.confirmModal(
          "Подтверждение",
          `<div class="placeholder" style="white-space:normal">
            <b>Запись на приём</b><br/>
            ФИО: ${this._escInline(payload.name)}<br/>
            Телефон: ${this._escInline(payload.phone)}<br/>
            Email: ${this._escInline(payload.email)}<br/>
            Дата: ${this._escInline(payload.date)}<br/><br/>
            ${this._escInline(payload.description).replaceAll("\n","<br/>")}
          </div>`,
          "Подтвердить",
          "Отмена"
        );
        if (!ok) return;
    
        const report = AppData.makeReport("appointment", payload, { user: this._userSnapshot() });
        const saved = await AppData.saveReport("appointment", report);
        if (!saved) { this.toast("Не удалось сохранить обращение", "danger"); this.haptic("error"); return; }
    
        await this._notifyAdmins("appointment", report);
    
        this.toast(`Заявка оставлена. Ждём вас ${payload.date}. Если потребуется перенос, мы уведомим вас по почте или по указанному номеру телефона.`, "success");
        this.haptic("success");
        form.reset();
      });
    }
    
    _escInline(s) {
      return String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }
    
    // -------------------- Theme --------------------
    _bindTheme() {
      $("#themeToggle")?.addEventListener("click", () => {
        try { AppData?.toggleTheme?.(); } catch (_) {}
        this._syncThemeIcon();
        this.haptic("light");
      });
      // compatibility
      $("#themeToggleSmall")?.addEventListener("click", () => $("#themeToggle")?.click());
    }

    _syncThemeIcon() {
      const t = document.documentElement.getAttribute("data-theme") || "dark";
      const icon = $("#themeToggle i");
      if (icon) icon.className = t === "dark" ? "fas fa-moon" : "fas fa-sun";
      const icon2 = $("#themeToggleSmall i");
      if (icon2) icon2.className = icon?.className || (t === "dark" ? "fas fa-moon" : "fas fa-sun");
    }

    // -------------------- Toast / Haptics --------------------
    haptic(kind = "light") {
      const enabled = window.AppConfig?.ui?.haptics !== false;
      if (!enabled) return;
      try {
        const h = this.WebApp?.HapticFeedback;
        if (!h) return;
        if (kind === "success") return h.notificationOccurred("success");
        if (kind === "warning") return h.notificationOccurred("warning");
        if (kind === "error" || kind === "danger") return h.notificationOccurred("error");
        return h.impactOccurred("light");
      } catch (_) {}
    }

    toast(text, type = "info") {
      const msg = clampStr(text, 220);
      try {
        // MAX showAlert is blocking; use showPopup if available
        if (this.WebApp?.showPopup) {
          this.WebApp.showPopup({ title: "Сообщение", message: msg, buttons: [{ id: "ok", type: "default", text: "OK" }] });
          return;
        }
      } catch (_) {}
      // fallback: small in-app toast
      const id = "appToast";
      let el = $("#" + id);
      if (!el) {
        el = document.createElement("div");
        el.id = id;
        el.style.position = "fixed";
        el.style.left = "12px";
        el.style.right = "12px";
        el.style.bottom = "calc(var(--nav-h) + env(safe-area-inset-bottom) + 14px)";
        el.style.zIndex = "9999";
        el.style.padding = "12px 14px";
        el.style.borderRadius = "16px";
        el.style.backdropFilter = "blur(var(--blur))";
        el.style.webkitBackdropFilter = "blur(var(--blur))";
        el.style.border = "1px solid var(--stroke)";
        el.style.boxShadow = "var(--shadow-soft)";
        el.style.background = "var(--glass)";
        el.style.color = "var(--text)";
        el.style.fontWeight = "700";
        el.style.fontSize = "13px";
        el.style.opacity = "0";
        el.style.transform = "translateY(10px)";
        el.style.transition = "opacity 220ms var(--ease), transform 220ms var(--ease)";
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => {
        el.style.opacity = "0";
        el.style.transform = "translateY(10px)";
      }, 2200);
    }

    // -------------------- Modal system --------------------
    _bindModalSystem() {
      const modal = $("#modal");
      if (!modal) return;

      // Закрытие по клику на фон / data-close
      modal.addEventListener("click", (e) => {
        const close = e.target?.closest?.("[data-close]");
        if (close && close.getAttribute("data-close") === "modal") {
          this.closeModal();
        }
      });

      // Esc (закрываем и обычную, и карту)
      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;

        if ($("#modal")?.getAttribute("aria-hidden") === "false") {
          this.closeModal();
        }
        if ($("#mapModal")?.getAttribute("aria-hidden") === "false") {
          this.closeMap();
        }
      });
    }

    openModal({ title = "Подтверждение", bodyHTML = "", actions = [] } = {}) {
      const modal = $("#modal");
      if (!modal) return;

      $("#modalTitle").textContent = title;
      $("#modalBody").innerHTML = bodyHTML;

      const actionsRoot = $("#modalActions");
      actionsRoot.innerHTML = "";
      actions.forEach((btn) => actionsRoot.appendChild(btn));

      modal.setAttribute("aria-hidden", "false");
      modal.classList.add("is-open");

      this._syncModalLock();
    }

    closeModal() {
      const modal = $("#modal");
      if (!modal) return;

      modal.setAttribute("aria-hidden", "true");
      modal.classList.remove("is-open");

      // если confirm был закрыт кликом на фон/крестик — считаем "Отмена"
      if (typeof this._confirmResolve === "function") {
        const r = this._confirmResolve;
        this._confirmResolve = null;
        try { r(false); } catch (_) {}
      }

      this._syncModalLock();
    }

    _openAppointmentDatePicker() {
      const input = $("#appointmentDate");
      if (!input) return;
    
      const pad2 = (n) => String(n).padStart(2, "0");
      const toISO = (dt) => `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
    
      const parseISO = (s) => {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
        if (!m) return null;
        const y = Number(m[1]);
        const mo = Number(m[2]) - 1;
        const d = Number(m[3]);
        const dt = new Date(y, mo, d);
        if (Number.isNaN(dt.getTime())) return null;
        dt.setHours(0, 0, 0, 0);
        return dt;
      };
    
      const monthNames = [
        "Январь","Февраль","Март","Апрель","Май","Июнь",
        "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"
      ];
    
      // today (00:00)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
    
      // view month = selected date month OR current month
      const selected = parseISO(input.value);
      let view = selected
        ? new Date(selected.getFullYear(), selected.getMonth(), 1)
        : new Date(today.getFullYear(), today.getMonth(), 1);
    
      const render = () => {
        const y = view.getFullYear();
        const m = view.getMonth();
    
        // запрет листать на прошлые месяцы
        const nowMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const viewMonthStart = new Date(y, m, 1);
        const prevDisabled = viewMonthStart <= nowMonthStart;
    
        const selectedISO = String(input.value || "");
    
        // Пн=0..Вс=6
        const first = new Date(y, m, 1);
        const startDay = (first.getDay() + 6) % 7;
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const daysPrevMonth = new Date(y, m, 0).getDate();
    
        // 42 клетки (6 недель) — фикс размер
        const totalCells = 42;
        let cells = "";
    
        // 1) предыдущий месяц (начало сетки)
        for (let i = 0; i < startDay; i++) {
          const day = daysPrevMonth - (startDay - 1 - i);
          const dt = new Date(y, m - 1, day);
          dt.setHours(0, 0, 0, 0);
    
          const iso = toISO(dt);
          const isPast = dt < today;
          const isSel = iso === selectedISO;
    
          cells += `<button type="button"
            class="dp__cell is-outside ${isSel ? "is-selected" : ""} ${isPast ? "is-disabled" : ""}"
            data-iso="${iso}"
            ${isPast ? "disabled" : ""}
          >${day}</button>`;
        }
    
        // 2) текущий месяц
        for (let d = 1; d <= daysInMonth; d++) {
          const dt = new Date(y, m, d);
          dt.setHours(0, 0, 0, 0);
    
          const iso = toISO(dt);
          const isPast = dt < today;
          const isSel = iso === selectedISO;
          const isToday = dt.getTime() === today.getTime();
    
          cells += `<button type="button"
            class="dp__cell ${isSel ? "is-selected" : ""} ${isPast ? "is-disabled" : ""} ${isToday ? "is-today" : ""}"
            data-iso="${iso}"
            ${isPast ? "disabled" : ""}
          >${d}</button>`;
        }
    
        // 3) следующий месяц (конец сетки)
        const filled = startDay + daysInMonth;
        const remain = totalCells - filled;
    
        for (let d = 1; d <= remain; d++) {
          const dt = new Date(y, m + 1, d);
          dt.setHours(0, 0, 0, 0);
    
          const iso = toISO(dt);
          const isPast = dt < today;
          const isSel = iso === selectedISO;
    
          cells += `<button type="button"
            class="dp__cell is-outside ${isSel ? "is-selected" : ""} ${isPast ? "is-disabled" : ""}"
            data-iso="${iso}"
            ${isPast ? "disabled" : ""}
          >${d}</button>`;
        }
    
        const bodyHTML = `
          <div class="dp" id="dpRoot">
            <div class="dp__head">
              <button type="button" class="btn btn-primary btn-compact dp__nav" id="dpPrev" ${prevDisabled ? "disabled" : ""} aria-label="Предыдущий месяц">
                <i class="fas fa-chevron-left"></i>
              </button>
    
              <div class="dp__title">${monthNames[m]} ${y}</div>
    
              <button type="button" class="btn btn-primary btn-compact dp__nav" id="dpNext" aria-label="Следующий месяц">
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>
    
            <div class="dp__dow">
              <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Вс</div>
            </div>
    
            <div class="dp__grid" id="dpGrid">${cells}</div>
          </div>
        `;
    
        // без кнопки "ОТМЕНА" — закрытие крестиком в модалке
        this.openModal({
          title: "Выбор даты",
          bodyHTML,
          actions: []
        });
    
        // --- FIX: убрать "дергание" на мобиле (скролл/overscroll внутри модалки) ---
        const root = $("#dpRoot");
        const grid = $("#dpGrid");
        const stopTouch = (e) => {
          // на iOS/Android иногда пытается скроллить фон -> дергается
          e.preventDefault();
        };
        if (root) {
          root.addEventListener("touchmove", stopTouch, { passive: false });
        }
        if (grid) {
          grid.addEventListener("touchmove", stopTouch, { passive: false });
        }
    
        // Prev / Next
        const prevBtn = $("#dpPrev");
        if (prevBtn) {
          prevBtn.classList.toggle("is-disabled", prevDisabled);
          prevBtn.addEventListener("click", () => {
            if (prevDisabled) return;
            view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
            render();
          });
        }
    
        $("#dpNext")?.addEventListener("click", () => {
          view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
          render();
        });
    
        // Select date
        $$(".dp__cell[data-iso]").forEach((btn) => {
          btn.addEventListener("click", () => {
            if (btn.disabled) return;
    
            const iso = btn.getAttribute("data-iso");
            if (!iso) return;
    
            const dt = parseISO(iso);
            if (!dt || dt < today) return;
    
            input.value = iso;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
    
            this.closeModal();
            this.haptic("success");
          });
        });
      };
    
      render();
    }
    
    _syncModalLock() {
      const anyOpen =
        $("#modal")?.getAttribute("aria-hidden") === "false" ||
        $("#mapModal")?.getAttribute("aria-hidden") === "false";

      document.documentElement.classList.toggle("is-modal-open", !!anyOpen);
      document.body.classList.toggle("is-modal-open", !!anyOpen);

      // Жёсткая блокировка скролла для mobile webview (iOS/Android)
      if (anyOpen) {
        if (this._scrollLockY == null) {
          this._scrollLockY = window.scrollY || window.pageYOffset || 0;
          document.body.style.position = "fixed";
          document.body.style.top = `-${this._scrollLockY}px`;
          document.body.style.left = "0";
          document.body.style.right = "0";
          document.body.style.width = "100%";
        }
      } else {
        if (this._scrollLockY != null) {
          const y = this._scrollLockY;
          this._scrollLockY = null;
          document.body.style.position = "";
          document.body.style.top = "";
          document.body.style.left = "";
          document.body.style.right = "";
          document.body.style.width = "";
          window.scrollTo(0, y);
        }
      }
    }

    confirmModal(title, bodyHTML, okText = "ОК", cancelText = "Отмена") {
      return new Promise((resolve) => {
        // если вдруг confirm уже открыт — считаем его отменённым
        if (typeof this._confirmResolve === "function") {
          try { this._confirmResolve(false); } catch (_) {}
        }
        this._confirmResolve = resolve;

        const okBtn = document.createElement("button");
        okBtn.type = "button";
        okBtn.className = "btn btn-primary btn-wide";
        okBtn.innerHTML = `<i class="fas fa-check"></i><span>${esc(okText)}</span>`;
        okBtn.addEventListener("click", () => {
          const r = this._confirmResolve;
          this._confirmResolve = null;
          this.closeModal();
          try { r(true); } catch (_) {}
        });

        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "btn btn-primary btn-wide";
        cancelBtn.innerHTML = `<i class="fas fa-times"></i><span>${esc(cancelText)}</span>`;
        cancelBtn.addEventListener("click", () => {
          const r = this._confirmResolve;
          this._confirmResolve = null;
          this.closeModal();
          try { r(false); } catch (_) {}
        });

        this.openModal({ title, bodyHTML, actions: [okBtn, cancelBtn] });
      });
    }
    
    // -------------------- Map modal (Yandex) --------------------
    _bindMapModal() {
      const modal = $("#mapModal");
      if (!modal) return;

      modal.addEventListener("click", (e) => {
        const close = e.target?.closest?.("[data-close]");
        if (close && close.getAttribute("data-close") === "mapModal") this.closeMap();
      });

      $("#confirmMapSelection")?.addEventListener("click", () => {
        if (!this.mapSelected) {
          this.toast("Сначала выберите точку на карте", "warning");
          this.haptic("warning");
          return;
        }
        const sel = { ...this.mapSelected };
        const ctx = this.mapContext;
        this.closeMap();
        this._applyMapSelection(ctx, sel);
      });
    }

    openMap(context) {
      this.mapContext = context;
      this.mapSelected = null;
    
      const modal = $("#mapModal");
      if (!modal) return;
      modal.setAttribute("aria-hidden", "false");
      modal.classList.add("is-open");
      this._syncModalLock();
    
      const cfg = window.AppConfig?.maps || {};
      const centerDefault = cfg.defaultCenter || { lat: 44.61665, lon: 33.52536 };
      const zoom = cfg.zoom || 14;
    
      const ensureYMaps = () => {
        // ВАЖНО: никаких ключей. Либо ymaps уже есть (как у тебя в index.html),
        // либо подгружаем бесплатный скрипт без apikey.
        if (window.ymaps?.ready) return Promise.resolve();
    
        return new Promise((resolve, reject) => {
          const existing = Array.from(document.scripts || []).find(s =>
            String(s.src || "").includes("api-maps.yandex.ru/2.1/")
          );
    
          // если скрипт уже есть — просто ждём появления ymaps
          if (existing) {
            const t0 = Date.now();
            const tick = () => {
              if (window.ymaps?.ready) return resolve();
              if (Date.now() - t0 > 8000) return reject(new Error("YM_NOT_READY"));
              setTimeout(tick, 50);
            };
            tick();
            return;
          }
    
          // если скрипта нет — грузим без ключа
          const s = document.createElement("script");
          s.src = "https://api-maps.yandex.ru/2.1/?lang=ru_RU";
          s.async = true;
          s.onload = () => (window.ymaps?.ready ? resolve() : reject(new Error("YM_NOT_READY")));
          s.onerror = () => reject(new Error("YM_LOAD_FAILED"));
          document.head.appendChild(s);
        });
      };
    
      const placeOrMoveMarker = (lat, lon) => {
        this.mapSelected = { lat, lon };
    
        if (!this.mapMarker) {
          this.mapMarker = new window.ymaps.Placemark([lat, lon], {}, { draggable: true });
          this.map.geoObjects.add(this.mapMarker);
    
          this.mapMarker.events.add("dragend", () => {
            const c = this.mapMarker.geometry.getCoordinates();
            this.mapSelected = { lat: c[0], lon: c[1] };
          });
        } else {
          this.mapMarker.geometry.setCoordinates([lat, lon]);
        }
      };
    
      const init = async () => {
        await ensureYMaps();
        await new Promise((res) => window.ymaps.ready(res));
    
        // стартовый центр
        let center = centerDefault;
        if (context === "security" && this.securityLocation?.coords) center = this.securityLocation.coords;
        if (context === "graffiti" && this.graffitiLocation?.coords) center = this.graffitiLocation.coords;
        if (context === "argus" && this.argusLocation?.coords) center = this.argusLocation.coords;
        
        if (!this.map) {
          this.map = new window.ymaps.Map("yandexMap", {
            center: [center.lat, center.lon],
            zoom
          });

          placeOrMoveMarker(center.lat, center.lon);
        
          // клик по карте — выбрать точку (и метка)
          this.map.events.add("click", (e) => {
            const coords = e.get("coords");
            const lat = coords?.[0];
            const lon = coords?.[1];
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
            placeOrMoveMarker(lat, lon);
          });
        
          // важно: после открытия модалки заставляем карту пересчитать размер контейнера
          setTimeout(() => {
            try { this.map.container.fitToViewport(); } catch (_) {}
          }, 50);
        
        } else {
          // при переоткрытии — центр и resize
          try { this.map.setCenter([center.lat, center.lon], zoom, { duration: 0 }); } catch (_) {}
          placeOrMoveMarker(center.lat, center.lon);
          try { this.map.container.fitToViewport(); } catch (_) {}
        }
    
        // КЛЮЧЕВО: после показа модалки принудительно пересчитать размер (иначе часто “пусто” в WebView)
        setTimeout(() => {
          try { this.map.container.fitToViewport(); } catch (_) {}
        }, 120);
      };
    
      init().catch((e) => {
        console.error("[YMAPS] init failed:", e);
        this.toast("Не удалось загрузить карту внутри приложения", "warning");
        this.haptic("warning");
        // ВАЖНО: НЕ открываем внешнюю ссылку и НЕ закрываем модалку автоматически.
        // Пусть юзер закроет сам, а ты увидишь ошибку в консоли.
      });
    }
    
    closeMap() {
      const modal = $("#mapModal");
      if (!modal) return;
      modal.setAttribute("aria-hidden", "true");
      modal.classList.remove("is-open");
      this._syncModalLock();
    }

    _applyMapSelection(context, coords) {
      const location = { coords: { lat: coords.lat, lon: coords.lon }, manualAddress: "" };
    
      if (context === "security") {
        this.securityLocation.coords = location.coords;
        this._setAddressInputVisible("security", false);
        this._syncLocationUI("security");
      } else if (context === "graffiti") {
        this.graffitiLocation.coords = location.coords;
        this._setAddressInputVisible("graffiti", false);
        this._syncLocationUI("graffiti");
      } else if (context === "argus") {
        this.argusLocation.coords = location.coords;
        this._setAddressInputVisible("argus", false);
        this._syncLocationUI("argus");
      } else if (context === "wifi_nearby") {
        this._renderWifiNearestFromCoords(location.coords);
      }
    }

    // -------------------- Location UI sync --------------------
    _setAddressInputVisible(prefix, visible) {
      const wrap =
        prefix === "security" ? $("#securityAddressWrap") :
        prefix === "graffiti" ? $("#graffitiAddressWrap") :
        prefix === "argus" ? $("#argusAddressWrap") :
        null;

      if (!wrap) return;

      if (visible) {
        wrap.hidden = false;
        wrap.closest(".form-group")?.classList.add("has-address-input");
        const input = $("input", wrap);
        input?.focus?.();
      } else {
        wrap.hidden = true;
        wrap.closest(".form-group")?.classList.remove("has-address-input");
      }
    }

    _syncLocationUI(prefix) {
      const state =
        prefix === "security" ? this.securityLocation :
        prefix === "argus" ? this.argusLocation :
        this.graffitiLocation;
    
      const hint =
        prefix === "security" ? $("#locationHint") :
        prefix === "argus" ? $("#argusLocationHint") :
        $("#graffitiLocationHint");
    
      const coordsInput =
        prefix === "security" ? $("#securityCoordinates") :
        prefix === "argus" ? $("#argusCoordinates") :
        $("#graffitiCoordinates");
    
      const lines = [];
    
      if (state?.coords?.lat != null && state?.coords?.lon != null) {
        const lat = Number(state.coords.lat).toFixed(6);
        const lon = Number(state.coords.lon).toFixed(6);
        lines.push(`Координаты: ${lat}, ${lon}`);
      }
    
      if (state?.manualAddress && String(state.manualAddress).trim()) {
        lines.push(`Адрес: ${String(state.manualAddress).trim()}`);
      }
    
      if (!lines.length) {
        lines.push("Укажите местоположение (адрес или точку на карте)");
      }
    
      if (hint) {
        hint.textContent = lines.join("\n");   // каждая строка с новой строки
        hint.setAttribute("title", hint.textContent);
      }
    
      if (coordsInput) {
        coordsInput.value =
          state?.coords?.lat != null && state?.coords?.lon != null
            ? `${Number(state.coords.lat).toFixed(6)}, ${Number(state.coords.lon).toFixed(6)}`
            : "";
      }
    }

    async _useCurrentLocation(prefix = "security") {
      const state =
        prefix === "security" ? this.securityLocation :
        prefix === "graffiti" ? this.graffitiLocation :
        prefix === "argus" ? this.argusLocation :
        null;
    
      if (!state) {
        this.toast("Не удалось определить форму для геолокации", "warning");
        this.haptic("warning");
        return;
      }
    
      if (!navigator.geolocation) {
        this.toast("Геолокация недоступна", "warning");
        this.haptic("warning");
        return;
      }
    
      const getPos = (opts) => new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, opts);
      });
    
      try {
        this.toast("Определяю местоположение…", "info");
    
        // 1) пробуем точнее, но даём время
        let pos;
        try {
          pos = await getPos({ enableHighAccuracy: true, timeout: 20000, maximumAge: 15000 });
        } catch (_) {
          // 2) fallback без highAccuracy — часто спасает
          pos = await getPos({ enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 });
        }
    
        const lat = pos?.coords?.latitude;
        const lon = pos?.coords?.longitude;
    
        if (typeof lat !== "number" || typeof lon !== "number") {
          this.toast("Не удалось получить координаты", "warning");
          this.haptic("warning");
          return;
        }
    
        state.coords = { lat, lon };
        state.manualAddress = "";
        this._setAddressInputVisible(prefix, false);
        this._syncLocationUI(prefix);
    
        this.toast("Местоположение определено", "success");
        this.haptic("success");
      } catch (e) {
        this.toast("Не удалось получить геолокацию. Попробуйте ещё раз или выберите точку на карте.", "warning");
        this.haptic("warning");
      }
    }

    // -------------------- Security --------------------
    _bindSecurityForm() {
      const form = $("#securityForm");
      if (!form) return;

      this._bindPhoneMask("#securityPhone");
      this._bindUseMaxName("#useMaxName", "#securityName");

      $("#useCurrentLocation")?.addEventListener("click", () => this._useCurrentLocation("security"));
      $("#selectOnMap")?.addEventListener("click", () => this.openMap("security"));
      
      $("#showAddressInput")?.addEventListener("click", () => this._setAddressInputVisible("security", true));

      $("#addressInput")?.addEventListener("input", (e) => {
        this.securityLocation.manualAddress = clampStr(e.target.value, 260);
        this._syncLocationUI("security");
      });

      const desc = $("#securityDescription");
      const counter = $("#charCount");
      const maxLen = 500;
      if (desc && counter) {
        const sync = () => {
          if (desc.value.length > maxLen) desc.value = desc.value.slice(0, maxLen);
          counter.textContent = String(desc.value.length || 0);
        };
        desc.addEventListener("input", sync);
        sync();
      }

      this._bindMediaPreview("#securityMedia", "#mediaPreview");

      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = this._collectCommonPayload({
          nameSel: "#securityName",
          phoneSel: "#securityPhone",
          emailSel: "#securityEmail",
          descriptionSel: "#securityDescription",
          location: this.securityLocation,
          mediaSel: "#securityMedia"
        });

        const err = this._validateCommon(payload, { requireLocation: true });
        if (err) { this.toast(err, "danger"); this.haptic("error"); return; }

        const ok = await this.confirmModal("Подтверждение", this._renderConfirm(payload, "security"), "Подтвердить", "Отмена");
        if (!ok) return;

        const report = AppData.makeReport("security", payload, { user: this._userSnapshot() });
        const saved = await AppData.saveReport("security", report);
        if (!saved) { this.toast("Не удалось сохранить обращение", "danger"); this.haptic("error"); return; }

        await this._notifyAdmins("security", report);

        this.toast("Обращение отправлено", "success");
        this.haptic("success");
        form.reset();
        this.securityLocation = { coords: null, manualAddress: "" };
        this._setAddressInputVisible("security", false);
        this._syncLocationUI("security");
        $("#mediaPreview") && ($("#mediaPreview").innerHTML = "");
        $("#charCount") && ($("#charCount").textContent = "0");
      });
    }

    // -------------------- Graffiti (копия Security по логике) --------------------
    _bindGraffitiForm() {
      const form = $("#graffitiForm");
      if (!form) return;

      this._bindPhoneMask("#graffitiPhone");
      this._bindUseMaxName("#useMaxNameGraffiti", "#graffitiName");

      $("#graffitiUseCurrentLocation")?.addEventListener("click", () => this._useCurrentLocation("graffiti"));
      $("#graffitiSelectOnMap")?.addEventListener("click", () => this.openMap("graffiti"));
      $("#graffitiShowAddressInput")?.addEventListener("click", () => this._setAddressInputVisible("graffiti", true));

      $("#graffitiAddressInput")?.addEventListener("input", (e) => {
        this.graffitiLocation.manualAddress = clampStr(e.target.value, 260);
        this._syncLocationUI("graffiti");
      });

      const desc = $("#graffitiDescription");
      const counter = $("#graffitiCharCount");
      const maxLen = 500;
      if (desc && counter) {
        const sync = () => {
          if (desc.value.length > maxLen) desc.value = desc.value.slice(0, maxLen);
          counter.textContent = String(desc.value.length || 0);
        };
        desc.addEventListener("input", sync);
        sync();
      }

      this._bindMediaPreview("#graffitiMedia", "#graffitiMediaPreview");

      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = this._collectCommonPayload({
          nameSel: "#graffitiName",
          phoneSel: "#graffitiPhone",
          emailSel: "#graffitiEmail",
          descriptionSel: "#graffitiDescription",
          location: this.graffitiLocation,
          mediaSel: "#graffitiMedia"
        });

        payload.requestType = "graffiti";

        const err = this._validateCommon(payload, { requireLocation: true });
        if (err) { this.toast(err, "danger"); this.haptic("error"); return; }

        const ok = await this.confirmModal("Подтверждение", this._renderConfirm(payload, "graffiti"), "Подтвердить", "Отмена");
        if (!ok) return;

        const report = AppData.makeReport("graffiti", payload, { user: this._userSnapshot() });
        const saved = await AppData.saveReport("graffiti", report);
        if (!saved) { this.toast("Не удалось сохранить обращение", "danger"); this.haptic("error"); return; }

        await this._notifyAdmins("graffiti", report);

        this.toast("Обращение отправлено", "success");
        this.haptic("success");
        form.reset();
        this.graffitiLocation = { coords: null, manualAddress: "" };
        this._setAddressInputVisible("graffiti", false);
        this._syncLocationUI("graffiti");
        $("#graffitiMediaPreview") && ($("#graffitiMediaPreview").innerHTML = "");
        $("#graffitiCharCount") && ($("#graffitiCharCount").textContent = "0");
      });
    }

    // -------------------- Wi-Fi tabs/search/forms --------------------
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

      const sub = $("#wifiSectionSubtitle");
      if (sub) {
        sub.textContent =
          n === "search" ? "В этом разделе вы можете найти ближайшие точки публичного Wi-Fi на карте города." :
          n === "problem" ? "Используйте этот раздел, если публичная точка Wi-Fi не работает." :
          "В этом разделе вы можете предложить работающую точку публичного Wi-Fi для добавления в список. Укажите адрес или отметьте место на карте и кратко опишите предложение.";
        sub.setAttribute("title", sub.textContent);
      }

      $$("#wifi-section .tab").forEach((t) => {
        const active = t.dataset.tab === n;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
      });

      $$("#wifi-section .tab-content").forEach((c) => {
        c.classList.toggle("is-active", c.dataset.tabContent === n);
      });

      this._resetScroll();
      if (!opts.silent) this.haptic("light");
    }

    getTypeEmoji(type) {
      const emojis = {
        "здрав": "🏥",
        "образование": "🎓",
        "тц": "🛍️",
        "транспорт": "🚌",
        "отдых": "🌳",
        "спорт": "⚽",
        "МФЦ": "🏢",
        "АЗС": "⛽",
        "гостиница": "🏨",
        "пляж": "🏖️",
        "турбаза": "⛺",
        "дома": "🏘️",
        "кафе": "🍴",
        "торговля": "🛒",
        "другое": "📍"
      };
      return emojis[type] || "📍";
    }
    
    getTypeName(type) {
      const names = {
        "здрав": "Медицинские организации",
        "образование": "Образовательные учреждения",
        "тц": "Торговые центры",
        "транспорт": "Транспорт",
        "отдых": "Места отдыха",
        "спорт": "Спортивные объекты",
        "МФЦ": "МФЦ",
        "АЗС": "АЗС",
        "гостиница": "Гостиницы",
        "пляж": "Пляжи",
        "турбаза": "Турбазы",
        "дома": "Жилые комплексы",
        "кафе": "Кафе и рестораны",
        "торговля": "Магазины",
        "другое": "Другое"
      };
      return names[type] || "Другое";
    }
    
    _normalizeWifiType(rawType) {
      const t = String(rawType || "").trim();
      if (!t) return "другое";
      if (t === "парки и скверы") return "отдых";
      if (t.toLowerCase() === "мфц") return "МФЦ";
      if (t.toLowerCase() === "азс") return "АЗС";
    
      const low = t.toLowerCase();
      const known = [
        "здрав","образование","тц","транспорт","отдых","спорт",
        "гостиница","пляж","турбаза","дома","кафе","торговля","другое"
      ];
      return known.includes(low) ? low : "другое";
    }
    
    _wifiTypesOrder() {
      return [
        "здрав","образование","тц","транспорт","отдых","спорт",
        "МФЦ","АЗС","гостиница","пляж","турбаза","дома","кафе","торговля","другое"
      ];
    }
    
    _initWifiTypeFilter() {
      const sel = $("#wifiTypeFilter");
      if (!sel) return;
    
      const set = new Set();
      (Array.isArray(window.wifiPoints) ? window.wifiPoints : []).forEach((p) => {
        set.add(this._normalizeWifiType(p?.type));
      });
    
      const order = this._wifiTypesOrder().filter((t) => set.has(t));
      sel.innerHTML = '<option value="all">Все категории</option>';
    
      order.forEach((t) => {
        const o = document.createElement("option");
        o.value = t;
        o.textContent = `${this.getTypeEmoji(t)} ${this.getTypeName(t)}`;
        sel.appendChild(o);
      });
    
      sel.value = this.wifiFilterType || "all";
    }
    
    _applyWifiFilters() {
      const input = $("#wifiSearch");
      const sel = $("#wifiTypeFilter");
      const q = String(input?.value || "").trim().toLowerCase();
      const type = String(sel?.value || this.wifiFilterType || "all");
      this.wifiFilterType = type;
    
      const base = Array.isArray(this.wifiBaseList) ? this.wifiBaseList : [];
      const filtered = base.filter((p) => {
        const pt = this._normalizeWifiType(p?.type);
        const byType = type === "all" ? true : pt === type;
        if (!byType) return false;
        if (!q) return true;
        const hay = `${p?.name || ""} ${p?.address || ""} ${p?.description || ""} ${p?.type || ""}`.toLowerCase();
        return hay.includes(q);
      });
    
      this.renderWifiResults(filtered, { withDistance: !!this.wifiWithDistance });
    }
    
    openWifiPointDetails(point) {
      const p = point || null;
      if (!p) return;
    
      const t = this._normalizeWifiType(p.type);
      const hasCoords = p.coordinates && Number.isFinite(p.coordinates.lat) && Number.isFinite(p.coordinates.lon);
      const coordsText = hasCoords ? fmtCoords(p.coordinates) : "—";
    
      const addr = p.address ? esc(p.address) : "—";
      const desc = p.description ? esc(p.description) : "—";
    
      const ymShow = hasCoords
        ? `https://yandex.ru/maps/?ll=${encodeURIComponent(p.coordinates.lon)},${encodeURIComponent(p.coordinates.lat)}&z=17&pt=${encodeURIComponent(p.coordinates.lon)},${encodeURIComponent(p.coordinates.lat)},pm2rdm`
        : `https://yandex.ru/maps/?text=${encodeURIComponent(p.name || "")}`;
    
      const ymRoute = hasCoords
        ? `https://yandex.ru/maps/?rtext=~${encodeURIComponent(p.coordinates.lat)},${encodeURIComponent(p.coordinates.lon)}&rtt=auto`
        : `https://yandex.ru/maps/?text=${encodeURIComponent(p.address || p.name || "")}`;
    
      const showBtn = document.createElement("button");
      showBtn.type = "button";
      showBtn.className = "btn btn-primary btn-wide";
      showBtn.innerHTML = `<i class="fas fa-map-marker-alt"></i><span>ПОКАЗАТЬ НА КАРТЕ</span>`;
      showBtn.addEventListener("click", () => this._openExternal(ymShow));
    
      const routeBtn = document.createElement("button");
      routeBtn.type = "button";
      routeBtn.className = "btn btn-primary btn-wide";
      routeBtn.innerHTML = `<i class="fas fa-route"></i><span>ПОСТРОИТЬ МАРШРУТ</span>`;
      routeBtn.addEventListener("click", () => this._openExternal(ymRoute));
    
      this.openModal({
        title: p.name || "Точка Wi-Fi",
        bodyHTML: `
          <div class="wifi-detail">
            <div class="wifi-detail-row"><b>Категория:</b> <span class="val">${esc(this.getTypeEmoji(t))} ${esc(this.getTypeName(t))}</span></div>
            <div class="wifi-detail-row"><b>Адрес:</b> <span class="val">${addr}</span></div>
            <div class="wifi-detail-row"><b>Координаты:</b> <span class="val">${esc(coordsText)}</span></div>
            <div class="wifi-detail-row"><b>Описание:</b> <span class="val">${desc}</span></div>
          </div>
        `,
        actions: [showBtn, routeBtn]
      });
    }
    
    _openExternal(url) {
      const u = String(url || "");
      if (!u) return;
      try { if (this.WebApp?.openLink) return this.WebApp.openLink(u); } catch (_) {}
      window.open(u, "_blank", "noopener,noreferrer");
    }
    
    _bindWifiSearch() {
      const input = $("#wifiSearch");
      const typeSelect = $("#wifiTypeFilter");
      const btn = $("#findNearby");
    
      if (input) input.addEventListener("input", () => this._applyWifiFilters());
      if (typeSelect) typeSelect.addEventListener("change", () => this._applyWifiFilters());
    
        btn?.addEventListener("click", () => {
          this.toast("Выберите точку на карте для поиска ближайших Wi-Fi", "info");
          this.haptic("light");
          this.openMap("wifi_nearby");
        });
      
      this.wifiBaseList = (window.wifiPoints || []);
      this.wifiWithDistance = false;
    }

    _renderWifiNearestFromCoords(origin) {
      const radius = Number(window.AppConfig?.wifi?.nearestRadius || 1500);
      const maxResults = Number(window.AppConfig?.wifi?.maxResults || 20);

      const distM = (a, b) => {
        const R = 6371000;
        const toRad = (x) => (x * Math.PI) / 180;
        const dLat = toRad(b.lat - a.lat);
        const dLon = toRad(b.lon - a.lon);
        const la1 = toRad(a.lat);
        const la2 = toRad(b.lat);
        const h =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
      };

      const list = (window.wifiPoints || [])
        .map((p) => ({ ...p, _dist: distM(origin, p.coordinates) }))
        .filter((p) => Number.isFinite(p._dist) && p._dist <= radius)
        .sort((a, b) => a._dist - b._dist)
        .slice(0, maxResults);

      this.wifiBaseList = list;
      this.wifiWithDistance = true;
      this._applyWifiFilters();
      this.toast(list.length ? "Показаны ближайшие точки" : "Рядом точек не найдено", list.length ? "success" : "warning");
      this.haptic(list.length ? "success" : "warning");
    }

renderWifiResults(points, opts = {}) {
  const arr = Array.isArray(points) ? points : [];
  const box = $("#wifiResults");
  const cnt = $("#wifiCount");
  const empty = $("#wifiEmpty");
  if (cnt) cnt.textContent = String(arr.length);
  if (!box) return;

  box.innerHTML = "";
  if (!arr.length) {
    if (empty) empty.style.display = "";
    return;
  }
  if (empty) empty.style.display = "none";

  const groups = new Map();
  arr.forEach((p) => {
    const t = this._normalizeWifiType(p?.type);
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t).push(p);
  });

  const order = this._wifiTypesOrder();
  const keys =
    (this.wifiFilterType && this.wifiFilterType !== "all")
      ? [this.wifiFilterType]
      : order.filter((t) => groups.has(t)).concat(Array.from(groups.keys()).filter((t) => !order.includes(t)));

  const frag = document.createDocumentFragment();

  keys.forEach((t) => {
    const list = groups.get(t);
    if (!list || !list.length) return;

    const group = document.createElement("div");
    group.className = "wifi-type-group";

    const head = document.createElement("div");
    head.className = "wifi-type-head";
    head.innerHTML = `
      <div class="wifi-type-title"><span class="emoji">${esc(this.getTypeEmoji(t))}</span><span>${esc(this.getTypeName(t))}</span></div>
      <div class="wifi-type-count">${list.length}</div>
    `;

    const grid = document.createElement("div");
    grid.className = "cards-grid";

    list.forEach((p) => {
      const card = document.createElement("div");
      card.className = "wifi-card";

      const main = document.createElement("div");
      main.className = "wifi-card-main";

      const title = document.createElement("div");
      title.className = "wifi-card-title";
      title.textContent = p?.name || "Точка Wi-Fi";

      const meta = document.createElement("div");
      meta.className = "wifi-card-meta";

      if (opts.withDistance && p?._dist != null && Number.isFinite(p._dist)) {
        const m = document.createElement("span");
        m.textContent = `${Math.round(p._dist)} м`;
        meta.appendChild(m);
      }

      main.appendChild(title);
      if (meta.childNodes.length) main.appendChild(meta);

      const action = document.createElement("button");
      action.className = "wifi-card-action";
      action.type = "button";
      action.setAttribute("aria-label", "Подробнее");
      action.innerHTML = '<i class="fas fa-chevron-right"></i>';

      const open = () => {
        this.haptic("light");
        this.openWifiPointDetails(p);
      };

      action.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        open();
      });

      card.addEventListener("click", open);

      card.appendChild(main);
      card.appendChild(action);
      grid.appendChild(card);
    });

    group.appendChild(head);
    group.appendChild(grid);
    frag.appendChild(group);
  });

  box.appendChild(frag);
}

    _bindWifiProblemForm() {
      const form = $("#wifiProblemForm");
      if (!form) return;
      this._bindPhoneMask("#wifiProblemPhone");
      this._bindUseMaxName("#useMaxNameWifiProblem", "#wifiProblemName");

      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = {
          requestType: "wifi_problem",
          name: clampStr($("#wifiProblemName")?.value, 140).trim(),
          phone: clampStr($("#wifiProblemPhone")?.value, 40).trim(),
          email: clampStr($("#wifiProblemEmail")?.value, 180).trim(),
          place: clampStr($("#wifiProblemPlace")?.value, 260).trim(),
          description: clampStr($("#wifiProblemDescription")?.value, 1000).trim()
        };

        const err = this._validateWifiSimple(payload);
        if (err) { this.toast(err, "danger"); this.haptic("error"); return; }

        const ok = await this.confirmModal("Подтверждение", this._renderWifiConfirm(payload), "Подтвердить", "Отмена");
        if (!ok) return;

        const report = AppData.makeReport("wifi_problem", payload, { user: this._userSnapshot() });
        const saved = await AppData.saveReport("wifi_problem", report);
        if (!saved) { this.toast("Не удалось сохранить обращение", "danger"); this.haptic("error"); return; }

        await this._notifyAdmins("wifi", report);

        this.toast("Обращение отправлено", "success");
        this.haptic("success");
        form.reset();
      });
    }

    _bindWifiNewForm() {
      const form = $("#wifiNewForm");
      if (!form) return;
      this._bindPhoneMask("#wifiNewPhone");
      this._bindUseMaxName("#useMaxNameWifiNew", "#wifiNewName");

      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = {
          requestType: "wifi_suggestion",
          name: clampStr($("#wifiNewName")?.value, 140).trim(),
          phone: clampStr($("#wifiNewPhone")?.value, 40).trim(),
          email: clampStr($("#wifiNewEmail")?.value, 180).trim(),
          place: clampStr($("#wifiNewPlace")?.value, 260).trim(),
          description: clampStr($("#wifiNewDescription")?.value, 1000).trim()
        };

        const err = this._validateWifiSimple(payload);
        if (err) { this.toast(err, "danger"); this.haptic("error"); return; }

        const ok = await this.confirmModal("Подтверждение", this._renderWifiConfirm(payload), "Подтвердить", "Отмена");
        if (!ok) return;

        const report = AppData.makeReport("wifi_suggestion", payload, { user: this._userSnapshot() });
        const saved = await AppData.saveReport("wifi_suggestion", report);
        if (!saved) { this.toast("Не удалось сохранить обращение", "danger"); this.haptic("error"); return; }

        await this._notifyAdmins("wifi", report);

        this.toast("Обращение отправлено", "success");
        this.haptic("success");
        form.reset();
      });
    }

    _validateWifiSimple(payload) {
      if (!payload.name) return "Укажите имя";
      if (!payload.phone || payload.phone.replace(/\D/g, "").length < 6) return "Укажите телефон";
      if (!payload.place) return "Укажите место/адрес";
      if (!payload.description) return "Укажите описание";
      if (!payload.email) return "Укажите email";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return "Некорректный email";
      return "";
    }

    // -------------------- Common form utilities --------------------
    _bindUseMaxName(btnSel, inputSel) {
      const btn = $(btnSel);
      const input = $(inputSel);
      if (!btn || !input) return;

      btn.addEventListener("click", () => {
        const fn = this.user?.first_name || "";
        const ln = this.user?.last_name || "";
        const full = [fn, ln].filter(Boolean).join(" ").trim();
        const name = full || this.user?.username || "";
        if (name) {
          input.value = name;
          this.toast("Имя подставлено", "success");
          this.haptic("light");
        } else {
          this.toast("Не удалось получить имя из MAX", "warning");
          this.haptic("warning");
        }
      });
    }

    _bindPhoneMask(sel) {
      const input = $(sel);
      if (!input) return;
    
      const normalize = () => {
        let digits = String(input.value || "").replace(/\D/g, "");
        if (!digits) return "";
    
        // если начинается с 8 или 7 — считаем что это РФ
        if (digits.startsWith("8") || digits.startsWith("7")) digits = digits.slice(1);
    
        // оставляем максимум 10 цифр после +7
        digits = digits.slice(0, 10);
        return "+7" + digits;
      };
    
      input.addEventListener("focus", () => {
        if (!String(input.value || "").trim()) input.value = "+7";
        if (!String(input.value || "").startsWith("+7")) input.value = normalize() || "+7";
      });
    
      input.addEventListener("input", () => {
        const v = String(input.value || "");
        if (!v.startsWith("+7")) {
          input.value = normalize() || "+7";
        } else {
          // чистим любые нецифровые кроме + в начале
          input.value = "+7" + v.slice(2).replace(/\D/g, "").slice(0, 10);
        }
      });
    
      input.addEventListener("blur", () => {
        const v = normalize();
        if (!v) return;
        input.value = v;
      });
    }

    _bindMediaPreview(inputSel, previewSel) {
      const input = $(inputSel);
      const preview = $(previewSel);
      if (!input || !preview) return;

      input.addEventListener("change", () => {
        preview.innerHTML = "";
        const files = Array.from(input.files || []).slice(0, 5);
        files.forEach((f) => {
          const item = document.createElement("div");
          item.className = "media-item";
          item.title = f.name;
          item.textContent = f.name;
          preview.appendChild(item);
        });
      });
    }

    _collectCommonPayload({ nameSel, phoneSel, emailSel, descriptionSel, location, mediaSel }) {
      const mediaInput = $(mediaSel);
      const files = Array.from(mediaInput?.files || []).slice(0, 5);

      const coords = location?.coords ? { lat: location.coords.lat, lon: location.coords.lon } : null;
      const manualAddress = clampStr(location?.manualAddress, 260).trim();

      return {
        name: clampStr($(nameSel)?.value, 140).trim(),
        phone: clampStr($(phoneSel)?.value, 40).trim(),
        email: clampStr($(emailSel)?.value, 180).trim(),
        location: {
          coordinates: coords,
          manualAddress
        },
        description: clampStr($(descriptionSel)?.value, 1000).trim(),
        media: files.map((f) => ({ name: f.name, type: f.type, size: f.size }))
      };
    }

    _validateCommon(payload, { requireLocation }) {
      if (!payload.name) return "Укажите имя";
      if (!payload.phone || payload.phone.replace(/\D/g, "").length < 6) return "Укажите телефон";
      if (!payload.email) return "Укажите email";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return "Некорректный email";
      if (requireLocation) {
        const hasCoords = !!payload.location?.coordinates;
        const hasAddr = !!payload.location?.manualAddress?.trim();
        if (!hasCoords && !hasAddr) return "Укажите местоположение (адрес или точку на карте)";
      }
      if (!payload.description) return "Укажите описание";
      return "";
    }

    _renderConfirm(payload, type) {
      const loc = payload.location || {};
      const coords = loc.coordinates ? fmtCoords(loc.coordinates) : "";
      const addr = loc.manualAddress ? loc.manualAddress : "";
      return `
        <div class="placeholder" style="white-space:normal">
          <b>${
            type === "graffiti" ? "Граффити" :
            type === "argus" ? "АРГУС" :
            "Оборона Севастополя"
          }</b><br/>
          Имя: ${esc(payload.name)}<br/>
          Телефон: ${esc(payload.phone)}<br/>
          ${payload.email ? `Email: ${esc(payload.email)}<br/>` : ""}
          ${coords ? `Координаты: ${esc(coords)}<br/>` : ""}
          ${addr ? `Адрес: ${esc(addr)}<br/>` : ""}
          <br/>
          ${esc(payload.description).replaceAll("\n", "<br/>")}
        </div>
      `;
    }

    _renderWifiConfirm(payload) {
      return `
        <div class="placeholder" style="white-space:normal">
          <b>Wi‑Fi</b><br/>
          Тип: ${payload.requestType === "wifi_problem" ? "Проблема" : "Новая точка"}<br/>
          Имя: ${esc(payload.name)}<br/>
          Телефон: ${esc(payload.phone)}<br/>
          ${payload.email ? `Email: ${esc(payload.email)}<br/>` : ""}
          Место: ${esc(payload.place)}<br/>
          <br/>
          ${esc(payload.description).replaceAll("\n", "<br/>")}
        </div>
      `;
    }

    _userSnapshot() {
      if (!this.user) return null;
      return {
        id: this.user.id ?? null,
        username: this.user.username ?? "",
        first_name: this.user.first_name ?? "",
        last_name: this.user.last_name ?? ""
      };
    }

    // -------------------- Email notify (optional) --------------------
    async _notifyAdmins(type, report) {
      try {
        if (!window.EmailService?.sendEmail) return;
        const emails = window.EmailService.getAdminEmails?.() || {};
        const to =
          type === "security" ? emails.security :
          type === "wifi" ? emails.wifi :
          type === "graffiti" ? emails.graffiti :
          "";
        if (!to) return;

        const subject =
          type === "security" ? "Новое обращение: Безопасность" :
          type === "wifi" ? "Новое обращение: Wi‑Fi" :
          "Новое обращение: Граффити";

        const text = JSON.stringify(report, null, 2);

        await window.EmailService.sendEmail({
          to,
          subject,
          text,
          html: `<pre style="white-space:pre-wrap">${esc(text)}</pre>`,
          meta: { reportType: type, reportId: report.id }
        });
      } catch (_) {
        // не блокируем UX
      }
    }
  }

  // boot (MAX-safe: DOMContentLoaded может уже пройти в WebView)
  const __boot = () => {
    try {
      if (!window.AppData) throw new Error("AppData missing");
      if (window.__MAX_APP__) return; // защита от двойного запуска
      window.__MAX_APP__ = new MaxMiniApp();
    } catch (e) {
      console.error(e);
      alert("Ошибка инициализации приложения. Проверьте файлы data.js/app.js.");
    }
  };

  // Если DOM ещё грузится — ждём, иначе стартуем сразу
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", __boot, { once: true });
  } else {
    __boot();
  }
})();
