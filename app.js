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

      this.map = null;
      this.mapMarker = null;
      this.mapSelected = null;
      this.mapContext = null;

      // locations
      this.securityLocation = { coords: null, manualAddress: "" };
      this.graffitiLocation = { coords: null, manualAddress: "" };

      this._init();
    }

    async _init() {
      try { this.WebApp?.ready?.(); } catch (_) {}

      // theme
      try { AppData?.setTheme?.(AppData.getTheme()); } catch (_) {}
      this._syncThemeIcon();

      // user/admin
      this.user = this.WebApp?.initDataUnsafe?.user || null;
      this.isAdmin = this._isAdminUser(this.user);
      this._syncAdminNav();

      // binds
      this._bindTheme();
      this._bindNavigation();
      this._bindModalSystem();
      this._bindMapModal();

      this._bindSecurityForm();
      this._bindWifiTabs();
      this._bindWifiSearch();
      this._bindWifiProblemForm();
      this._bindWifiNewForm();
      this._bindGraffitiForm();

      // initial render
      this.switchSection("security", { silent: true });
      this.switchWifiTab("search", { silent: true });
      this.renderWifiResults(window.wifiPoints || []);

      // start admin panel if exists
      // admin-panel.js сам инициализируется, если доступен.

      this.toast("Готово к работе", "success");
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

    // -------------------- Navigation --------------------
    _bindNavigation() {
      $$(".bottom-nav .nav-item").forEach((btn) => {
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

      modal.addEventListener("click", (e) => {
        const close = e.target?.closest?.("[data-close]");
        if (close && close.getAttribute("data-close") === "modal") this.closeModal();
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") this.closeModal();
      });
    }

   openModal({ title = "Подтверждение", bodyHTML = "", actions = [] } = {}) {
  const modal = $("#modal");
  if (!modal) return;

  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = bodyHTML;

  const actionsRoot = $("#modalActions");
  actionsRoot.innerHTML = "";
  actions.forEach((a) => actionsRoot.appendChild(a));

  modal.setAttribute("aria-hidden", "false");
  modal.classList.add("is-open");

  this._syncModalLock();
}

closeModal() {
  const modal = $("#modal");
  if (!modal) return;
  modal.setAttribute("aria-hidden", "true");
  modal.classList.remove("is-open");

  this._syncModalLock();
}

_syncModalLock() {
  const anyOpen =
    $("#modal")?.getAttribute("aria-hidden") === "false" ||
    $("#mapModal")?.getAttribute("aria-hidden") === "false";

  document.documentElement.classList.toggle("is-modal-open", !!anyOpen);
  document.body.classList.toggle("is-modal-open", !!anyOpen);
}

    confirmModal(title, bodyHTML, okText = "ОК", cancelText = "Отмена") {
      return new Promise((resolve) => {
        const okBtn = document.createElement("button");
        okBtn.type = "button";
        okBtn.className = "btn btn-primary btn-wide";
        okBtn.innerHTML = `<i class="fas fa-check"></i><span>${esc(okText)}</span>`;
        okBtn.addEventListener("click", () => {
          this.closeModal();
          resolve(true);
        });

        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "btn btn-secondary btn-wide";
        cancelBtn.innerHTML = `<i class="fas fa-times"></i><span>${esc(cancelText)}</span>`;
        cancelBtn.addEventListener("click", () => {
          this.closeModal();
          resolve(false);
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

      // init map once
      const init = async () => {
        if (!window.ymaps?.ready) throw new Error("YM_NOT_READY");
        await new Promise((res) => window.ymaps.ready(res));

        const cfg = window.AppConfig?.maps || {};
        const center = cfg.defaultCenter || { lat: 55.751244, lon: 37.618423 };
        const zoom = cfg.zoom || 14;

        if (!this.map) {
          this.map = new window.ymaps.Map("yandexMap", {
            center: [center.lat, center.lon],
            zoom
          });

          this.map.events.add("click", (e) => {
            const coords = e.get("coords");
            const lat = coords?.[0];
            const lon = coords?.[1];
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

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
          });
        } else {
          // resize fix when reopening modal
          try { this.map.container.fitToViewport(); } catch (_) {}
        }
      };

      init().catch(() => {
        this.toast("Карта недоступна (проверьте подключение/ключ)", "warning");
        this.haptic("warning");
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
        this._syncLocationUI("security");
      } else if (context === "graffiti") {
        this.graffitiLocation.coords = location.coords;
        this._syncLocationUI("graffiti");
      } else if (context === "wifi_nearby") {
        this._renderWifiNearestFromCoords(location.coords);
      }
    }

    // -------------------- Location UI sync --------------------
    _setAddressInputVisible(prefix, visible) {
      const wrap =
        prefix === "security" ? $("#securityAddressWrap") :
        prefix === "graffiti" ? $("#graffitiAddressWrap") :
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
      const state = prefix === "security" ? this.securityLocation : this.graffitiLocation;

      const hint =
        prefix === "security" ? $("#locationHint") :
        $("#graffitiLocationHint");

      const coordsInput =
        prefix === "security" ? $("#securityCoordinates") :
        $("#graffitiCoordinates");

      const lines = [];
      if (state.coords) lines.push(`Координаты: ${fmtCoords(state.coords)}`);
      if (state.manualAddress?.trim()) lines.push(`Адрес: ${state.manualAddress.trim()}`);

      if (hint) hint.textContent = lines.length ? lines.join(" • ") : "Укажите местоположение (адрес или точку на карте)";
      if (coordsInput) coordsInput.value = state.coords ? fmtCoords(state.coords) : "";
    }

    async _useCurrentLocation(prefix = "security") {
      const state = prefix === "security" ? this.securityLocation : this.graffitiLocation;

      if (!navigator.geolocation) {
        this.toast("Геолокация недоступна", "warning");
        this.haptic("warning");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos?.coords?.latitude;
          const lon = pos?.coords?.longitude;
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            this.toast("Не удалось получить координаты", "warning");
            this.haptic("warning");
            return;
          }
          state.coords = { lat, lon };
          this._syncLocationUI(prefix);
          this.toast("Координаты добавлены", "success");
          this.haptic("success");
        },
        () => {
          this.toast("Нет доступа к геолокации", "warning");
          this.haptic("warning");
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
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
          n === "search" ? "Поиск точек доступа интернета по Севастополю" :
          n === "problem" ? "Сообщите о проблеме с точкой доступа Wi-Fi" :
          "Предложите новую точку доступа";
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

    _bindWifiSearch() {
      const input = $("#wifiSearch");
      const btn = $("#findNearby");

      if (input) {
        const onInput = () => {
          const q = input.value.trim().toLowerCase();
          $("#wifiLoading") && ($("#wifiLoading").style.display = "none");
          const list = (window.wifiPoints || []).filter((p) => {
            const hay = `${p.name} ${p.address} ${p.description} ${p.type}`.toLowerCase();
            return !q || hay.includes(q);
          });
          this.renderWifiResults(list);
        };
        input.addEventListener("input", onInput);
      }

      btn?.addEventListener("click", () => {
        if (!navigator.geolocation) {
          this.toast("Геолокация недоступна", "warning");
          this.haptic("warning");
          return;
        }
        this.toast("Выберите точку на карте или разрешите геолокацию", "info");
        // используем геолокацию как приоритет
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos?.coords?.latitude;
            const lon = pos?.coords?.longitude;
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
              this._renderWifiNearestFromCoords({ lat, lon });
            } else {
              this.openMap("wifi_nearby");
            }
          },
          () => {
            this.openMap("wifi_nearby");
          },
          { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
        );
      });
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

      this.renderWifiResults(list, { withDistance: true });
      this.toast(list.length ? "Показаны ближайшие точки" : "Рядом точек не найдено", list.length ? "success" : "warning");
      this.haptic(list.length ? "success" : "warning");
    }

    renderWifiResults(list, opts = {}) {
      const root = $("#wifiResults");
      const empty = $("#wifiEmpty");
      const count = $("#wifiCount");
      if (!root) return;

      const arr = Array.isArray(list) ? list : [];
      if (count) count.textContent = String(arr.length);

      root.innerHTML = "";
      if (empty) empty.style.display = arr.length ? "none" : "";

      arr.forEach((p) => {
        const card = document.createElement("div");
        card.className = "glass-card card";
        const addr = p.address ? `<div class="meta">${esc(p.address)}</div>` : "";
        const desc = p.description ? `<div class="card-desc">${esc(p.description)}</div>` : "";
        const dist = opts.withDistance && p._dist != null ? `<div class="meta">${Math.round(p._dist)} м</div>` : "";

        card.innerHTML = `
          <div class="card-head">
            <div class="card-title" title="${esc(p.name)}">${esc(p.name)}</div>
            ${dist}
          </div>
          ${addr}
          ${desc}
        `;
        root.appendChild(card);
      });
    }

    _bindWifiProblemForm() {
      const form = $("#wifiProblemForm");
      if (!form) return;
      this._bindPhoneMask("#wifiProblemPhone");

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
      if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return "Некорректный email";
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

      input.addEventListener("focus", () => {
        if (!input.value.trim()) input.value = "+7";
      });

      input.addEventListener("input", () => {
        const v = input.value;
        if (!v.startsWith("+7")) {
          const digits = v.replace(/\D/g, "");
          if (digits.startsWith("8") || digits.startsWith("7")) input.value = "+7" + digits.slice(1);
          else input.value = "+7" + digits;
        }
      });

      input.addEventListener("blur", () => {
        const digits = input.value.replace(/\D/g, "");
        if (!digits) return;
        if (digits.startsWith("7") || digits.startsWith("8")) input.value = "+7" + digits.slice(1);
        else input.value = "+7" + digits;
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
      if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return "Некорректный email";
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
          <b>${type === "graffiti" ? "Граффити" : "Безопасность"}</b><br/>
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

  // boot
  document.addEventListener("DOMContentLoaded", () => {
    try {
      if (!window.AppData) throw new Error("AppData missing");
      window.__MAX_APP__ = new MaxMiniApp();
    } catch (e) {
      // fallback hard error message
      console.error(e);
      alert("Ошибка инициализации приложения. Проверьте файлы data.js/app.js.");
    }
  });
})();
