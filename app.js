// app.js — MAX Mini App
(() => {
  "use strict";

  // -------------------- Helpers --------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const safe = async (fn) => { try { return await fn(); } catch (e) { console.error(e); return null; } };

  const clampStr = (v, max = 1500) => {
    const s = String(v ?? "");
    return s.length > max ? s.slice(0, max) : s;
  };

  const show = (el) => { if (el) el.classList.remove("is-hidden"); };
  const hide = (el) => { if (el) el.classList.add("is-hidden"); };

  // -------------------- Theme --------------------
  function applyTheme(theme) {
    const t = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", t);
    try { document.body && document.body.setAttribute("data-theme", t); } catch (_) {}
  }

  function syncThemeIcon() {
    const t = document.documentElement.getAttribute("data-theme") || "dark";
    const icon = $("#themeToggle i");
    if (!icon) return;
    icon.className = t === "light" ? "fas fa-sun" : "fas fa-moon";
  }

  // -------------------- Modal --------------------
  function openModal({ title = "Готово", body = "", actions = [] } = {}) {
    const modal = $("#modal");
    if (!modal) return;

    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = body;

    const a = $("#modalActions");
    a.innerHTML = "";
    actions.forEach((btn) => a.appendChild(btn));

    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");
  }

  function closeModal() {
    const modal = $("#modal");
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("is-open");
  }

  function makeButton(label, { primary = false, onClick = null } = {}) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = primary ? "btn btn-primary btn-wide" : "btn btn-soft btn-wide";
    b.innerHTML = `<span>${label}</span>`;
    b.addEventListener("click", () => { try { onClick && onClick(); } catch (_) {} });
    return b;
  }

  function openLoading(title = "Отправляем…") {
    openModal({
      title,
      body: `<div class="loading-row"><div class="spinner"></div><div class="loading-text">Пожалуйста, подождите</div></div>`,
      actions: []
    });
  }

  // -------------------- Navigation --------------------
  function switchSection(section) {
    const target = String(section || "home");
    $$(".content-section").forEach((s) => {
      const is = s.getAttribute("data-section") === target;
      s.classList.toggle("is-active", is);
    });

    $$(".bottom-nav .nav-item").forEach((b) => {
      b.classList.toggle("is-active", b.getAttribute("data-section") === target);
    });

    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (_) {}
  }

  // -------------------- Location state --------------------
  const loc = {
    security: { lat: null, lng: null, address: "" },
    graffiti: { lat: null, lng: null, address: "" },
    argus: { lat: null, lng: null, address: "" },
  };

  function setLoc(kind, { lat = null, lng = null, address = "" } = {}) {
    loc[kind] = { lat, lng, address: String(address || "") };

    const hintId = kind === "security" ? "#locationHint" :
                   kind === "graffiti" ? "#graffitiLocationHint" :
                   "#argusLocationHint";
    const coordsId = kind === "security" ? "#coordinates" :
                     kind === "graffiti" ? "#graffitiCoordinates" :
                     "#argusCoordinates";

    const hint = $(hintId);
    const coords = $(coordsId);

    if (hint) hint.textContent = address ? `📍 ${address}` : (lat && lng ? "📍 Местоположение выбрано" : "");
    if (coords) coords.textContent = (lat && lng) ? `Координаты: ${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}` : "";
  }

  async function getBrowserGeo() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 12000 }
      );
    });
  }

  // -------------------- Map modal (Yandex) --------------------
  let mapInited = false;
  let yMap = null;
  let yPlacemark = null;
  let mapPickTarget = null;

  function openMap(kind) {
    mapPickTarget = kind;
    const modal = $("#mapModal");
    if (!modal) return;
    modal.setAttribute("aria-hidden", "false");
    modal.classList.add("is-open");

    const title = $("#mapModalTitle");
    if (title) title.textContent = "Выберите точку на карте";

    if (mapInited) return;

    const init = () => {
      try {
        // eslint-disable-next-line no-undef
        ymaps.ready(() => {
          yMap = new ymaps.Map("yandexMap", {
            center: [44.61665, 33.52536],
            zoom: 12,
            controls: ["zoomControl", "geolocationControl"]
          });

          yMap.events.add("click", (e) => {
            const coords = e.get("coords");
            const lat = coords[0];
            const lng = coords[1];

            if (!yPlacemark) {
              yPlacemark = new ymaps.Placemark(coords, {}, { draggable: true });
              yMap.geoObjects.add(yPlacemark);
              yPlacemark.events.add("dragend", () => {
                const c = yPlacemark.geometry.getCoordinates();
                setLoc(mapPickTarget, { lat: c[0], lng: c[1], address: "" });
              });
            } else {
              yPlacemark.geometry.setCoordinates(coords);
            }

            setLoc(mapPickTarget, { lat, lng, address: "" });
          });

          mapInited = true;
        });
      } catch (e) {
        console.error(e);
      }
    };

    init();
  }

  function closeMap() {
    const modal = $("#mapModal");
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("is-open");
  }

  // -------------------- Form common --------------------
  function getMaxUser() {
    try {
      const w = window.WebApp || window.MAX?.WebApp || null;
      const u = w?.initDataUnsafe?.user || null;
      return u ? { id: u.id, first_name: u.first_name, last_name: u.last_name, username: u.username } : null;
    } catch (_) {
      return null;
    }
  }

  function fillMaxName(inputId) {
    const u = getMaxUser();
    const el = $(inputId);
    if (!el || !u) return;
    const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
    if (name) el.value = name;
  }

  async function submitForm(type, payload, wantMedia = false) {
    const user = getMaxUser();
    const report = window.AppData?.makeReport?.(type, payload, { user }) || { id: String(Date.now()), type, payload, user };

    if (wantMedia) {
      report.status = "draft";
      report.sync_status = "draft_media";
      report.payload = report.payload || {};
      report.payload.wantMedia = true;
    }

    openLoading("Сохраняем обращение…");
    const r = await window.AppData?.submitReport?.(report);
    if (!r || !r.ok) {
      closeModal();
      openModal({
        title: "Не удалось сохранить",
        body: `<div class="modal-text">Попробуйте ещё раз. Если ошибка повторяется — проверьте интернет и перезапустите мини‑приложение.</div>`,
        actions: [makeButton("ОК", { primary: true, onClick: closeModal })]
      });
      return false;
    }

    closeModal();
    openModal({
      title: "Обращение отправлено",
      body: `<div class="modal-text">Спасибо! Мы зарегистрировали ваше обращение.</div>`,
      actions: [makeButton("ОК", { primary: true, onClick: () => { closeModal(); switchSection("home"); } })]
    });
    return true;
  }

  function bindCharCounter(textareaSel, counterSel) {
    const ta = $(textareaSel);
    const c = $(counterSel);
    if (!ta || !c) return;
    const upd = () => { c.textContent = String((ta.value || "").length); };
    ta.addEventListener("input", upd);
    upd();
  }

  // -------------------- Wi‑Fi (basic) --------------------
  function bindWifi() {
    const tabs = $$(".wifi-tabs .tab");
    const panels = {
      search: $("#tab-search"),
      problem: $("#tab-problem"),
      newpoint: $("#tab-newpoint"),
    };

    const setTab = (t) => {
      tabs.forEach((b) => b.classList.toggle("is-active", b.dataset.tab === t));
      Object.entries(panels).forEach(([k, el]) => el && el.classList.toggle("is-hidden", k !== t));
    };

    tabs.forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab || "search")));
    setTab("search");
  }

  // -------------------- Bind all --------------------
  function bindAll() {
    // Theme
    const themeBtn = $("#themeToggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        const next = window.AppData?.toggleTheme?.() || "dark";
        applyTheme(next);
        syncThemeIcon();
      });
    }
    applyTheme(window.AppData?.getTheme?.() || "dark");
    syncThemeIcon();

    // Close modal
    $$("[data-close]").forEach((x) => x.addEventListener("click", () => {
      const id = x.getAttribute("data-close");
      if (id === "modal") closeModal();
      if (id === "mapModal") closeMap();
    }));

    // Bottom nav
    $$(".bottom-nav .nav-item").forEach((b) => {
      b.addEventListener("click", () => switchSection(b.getAttribute("data-section")));
    });

    // Home cards
    $$("[data-go]").forEach((b) => b.addEventListener("click", () => switchSection(b.getAttribute("data-go"))));

    // Map modal confirm
    const confirm = $("#confirmMapSelection");
    if (confirm) confirm.addEventListener("click", () => closeMap());

    // Security location buttons
    const secUse = $("#useCurrentLocation");
    if (secUse) secUse.addEventListener("click", async () => {
      const g = await getBrowserGeo();
      if (!g) return;
      setLoc("security", { lat: g.lat, lng: g.lng, address: "" });
    });
    const secMap = $("#selectOnMap");
    if (secMap) secMap.addEventListener("click", () => openMap("security"));
    const secAddrBtn = $("#showAddressInput");
    if (secAddrBtn) secAddrBtn.addEventListener("click", () => show($("#securityAddressWrap")));
    const secAddr = $("#addressInput");
    if (secAddr) secAddr.addEventListener("input", () => setLoc("security", { ...loc.security, address: secAddr.value }));

    // Graffiti location buttons
    const gUse = $("#graffitiUseCurrentLocation");
    if (gUse) gUse.addEventListener("click", async () => {
      const g = await getBrowserGeo();
      if (!g) return;
      setLoc("graffiti", { lat: g.lat, lng: g.lng, address: "" });
    });
    const gMap = $("#graffitiSelectOnMap");
    if (gMap) gMap.addEventListener("click", () => openMap("graffiti"));
    const gAddrBtn = $("#graffitiShowAddressInput");
    if (gAddrBtn) gAddrBtn.addEventListener("click", () => show($("#graffitiAddressWrap")));
    const gAddr = $("#graffitiAddressInput");
    if (gAddr) gAddr.addEventListener("input", () => setLoc("graffiti", { ...loc.graffiti, address: gAddr.value }));

    // Argus location buttons
    const aUse = $("#argusUseCurrentLocation");
    if (aUse) aUse.addEventListener("click", async () => {
      const g = await getBrowserGeo();
      if (!g) return;
      setLoc("argus", { lat: g.lat, lng: g.lng, address: "" });
    });
    const aMap = $("#argusSelectOnMap");
    if (aMap) aMap.addEventListener("click", () => openMap("argus"));
    const aAddrBtn = $("#argusShowAddressInput");
    if (aAddrBtn) aAddrBtn.addEventListener("click", () => show($("#argusAddressWrap")));
    const aAddr = $("#argusAddressInput");
    if (aAddr) aAddr.addEventListener("input", () => setLoc("argus", { ...loc.argus, address: aAddr.value }));

    // Fill name buttons
    const useMaxName = $("#useMaxName");
    if (useMaxName) useMaxName.addEventListener("click", () => fillMaxName("#securityName"));
    const useMaxNameG = $("#useMaxNameGraffiti");
    if (useMaxNameG) useMaxNameG.addEventListener("click", () => fillMaxName("#graffitiName"));
    const useMaxNameW1 = $("#useMaxNameWifiProblem");
    if (useMaxNameW1) useMaxNameW1.addEventListener("click", () => fillMaxName("#wifiProblemName"));
    const useMaxNameW2 = $("#useMaxNameWifiNew");
    if (useMaxNameW2) useMaxNameW2.addEventListener("click", () => fillMaxName("#wifiNewName"));
    const useMaxNameA = $("#useMaxNameArgus");
    if (useMaxNameA) useMaxNameA.addEventListener("click", () => fillMaxName("#argusName"));
    const useMaxNameAppt = $("#useMaxNameAppt");
    if (useMaxNameAppt) useMaxNameAppt.addEventListener("click", () => fillMaxName("#apptName"));

    // Counters
    bindCharCounter("#securityDescription", "#securityCharCount");
    bindCharCounter("#graffitiDescription", "#graffitiCharCount");
    bindCharCounter("#argusDescription", "#argusCharCount");
    bindCharCounter("#apptDescription", "#apptCharCount");

    // Forms
    const securityForm = $("#securityForm");
    if (securityForm) securityForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const p = {
        name: $("#securityName")?.value || "",
        phone: $("#securityPhone")?.value || "",
        email: $("#securityEmail")?.value || "",
        address: (loc.security.address || ""),
        lat: loc.security.lat,
        lng: loc.security.lng,
        description: clampStr($("#securityDescription")?.value || "")
      };
      if (!p.address && !(p.lat && p.lng)) {
        openModal({ title: "Укажите место", body: `<div class="modal-text">Выберите местоположение: «Моё местоположение», «На карте» или введите адрес.</div>`, actions: [makeButton("ОК", { primary: true, onClick: closeModal })] });
        return;
      }
      await submitForm("security", p);
      securityForm.reset();
      setLoc("security", { lat: null, lng: null, address: "" });
    });

    const graffitiForm = $("#graffitiForm");
    if (graffitiForm) graffitiForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const p = {
        name: $("#graffitiName")?.value || "",
        phone: $("#graffitiPhone")?.value || "",
        email: $("#graffitiEmail")?.value || "",
        address: (loc.graffiti.address || ""),
        lat: loc.graffiti.lat,
        lng: loc.graffiti.lng,
        description: clampStr($("#graffitiDescription")?.value || "")
      };
      if (!p.address && !(p.lat && p.lng)) {
        openModal({ title: "Укажите место", body: `<div class="modal-text">Выберите местоположение: «Моё местоположение», «На карте» или введите адрес.</div>`, actions: [makeButton("ОК", { primary: true, onClick: closeModal })] });
        return;
      }
      await submitForm("graffiti", p);
      graffitiForm.reset();
      setLoc("graffiti", { lat: null, lng: null, address: "" });
    });

    const argusForm = $("#argusForm");
    if (argusForm) argusForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const p = {
        name: $("#argusName")?.value || "",
        phone: $("#argusPhone")?.value || "",
        email: $("#argusEmail")?.value || "",
        address: (loc.argus.address || ""),
        lat: loc.argus.lat,
        lng: loc.argus.lng,
        description: clampStr($("#argusDescription")?.value || "")
      };
      if (!p.address && !(p.lat && p.lng)) {
        openModal({ title: "Укажите место", body: `<div class="modal-text">Выберите местоположение: «Моё местоположение», «На карте» или введите адрес.</div>`, actions: [makeButton("ОК", { primary: true, onClick: closeModal })] });
        return;
      }
      await submitForm("argus", p);
      argusForm.reset();
      setLoc("argus", { lat: null, lng: null, address: "" });
    });

    const apptForm = $("#appointmentForm");
    if (apptForm) apptForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const p = {
        name: $("#apptName")?.value || "",
        phone: $("#apptPhone")?.value || "",
        email: $("#apptEmail")?.value || "",
        appointmentDate: $("#apptDate")?.value || "",
        description: clampStr($("#apptDescription")?.value || "")
      };
      await submitForm("appointment", p);
      apptForm.reset();
    });

    const wifiProblemForm = $("#wifiProblemForm");
    if (wifiProblemForm) wifiProblemForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const p = {
        name: $("#wifiProblemName")?.value || "",
        phone: $("#wifiProblemPhone")?.value || "",
        email: $("#wifiProblemEmail")?.value || "",
        place: $("#wifiProblemPlace")?.value || "",
        description: clampStr($("#wifiProblemDescription")?.value || "")
      };
      await submitForm("wifi", { subtype: "problem", ...p });
      wifiProblemForm.reset();
    });

    const wifiNewForm = $("#wifiNewForm");
    if (wifiNewForm) wifiNewForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const p = {
        name: $("#wifiNewName")?.value || "",
        phone: $("#wifiNewPhone")?.value || "",
        email: $("#wifiNewEmail")?.value || "",
        place: $("#wifiNewPlace")?.value || "",
        description: clampStr($("#wifiNewDescription")?.value || "")
      };
      await submitForm("wifi", { subtype: "new_point", ...p });
      wifiNewForm.reset();
    });

    // Wi‑Fi tabs
    bindWifi();

    // initial
    switchSection("home");
  }

  // -------------------- Start --------------------
  document.addEventListener("DOMContentLoaded", () => {
    bindAll();
  });
})();
