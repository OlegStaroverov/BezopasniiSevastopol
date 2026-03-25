/**
 * data.js
 * Конфигурация и справочные данные мини‑приложения.
 * Здесь хранится базовый URL сервера и параметры запроса для отправки обращений.
 */

(() => {
  "use strict";

  const STORAGE_PREFIX = "max_miniapp_";

  const safeJSON = {
    parse(str, fallback) {
      try { return JSON.parse(str); } catch (_) { return fallback; }
    },
    stringify(obj) {
      try { return JSON.stringify(obj); } catch (_) { return "null"; }
    }
  };

  const ls = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(STORAGE_PREFIX + key);
        return raw == null ? fallback : safeJSON.parse(raw, fallback);
      } catch (_) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(STORAGE_PREFIX + key, safeJSON.stringify(value));
        return true;
      } catch (_) {
        return false;
      }
    }
  };

  const nowISO = () => new Date().toISOString();

  const uid = () =>
    "RPT-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);

  const THEME_KEY = "theme";

  const theme = {
    get() {
      const t = ls.get(THEME_KEY, "dark");
      return t === "light" ? "light" : "dark";
    },
    set(next) {
      const t = next === "light" ? "light" : "dark";
      ls.set(THEME_KEY, t);
      document.documentElement.setAttribute("data-theme", t);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", "#0A84FF");
      return t;
    },
    toggle() {
      return this.set(this.get() === "dark" ? "light" : "dark");
    }
  };

   const REPORT_KEYS = {
     security: "reports_security",
     wifi: "reports_wifi",
     graffiti: "reports_graffiti",
     argus: "reports_argus",
     appointment: "reports_appointment"
   };

  const normalizeType = (type) => {
    const t = String(type || "").trim();
    if (t === "wifi_problem" || t === "wifi_suggestion") return "wifi";
    return t;
  };

  const storage = {
    async _save(key, value) {

      try {
        if (window.WebApp?.SecureStorage?.setItem) {
          await window.WebApp.SecureStorage.setItem(STORAGE_PREFIX + key, safeJSON.stringify(value));
          return true;
        }
      } catch (_) {}
      return ls.set(key, value);
    },
    async _load(key, fallback) {
      try {
        if (window.WebApp?.SecureStorage?.getItem) {
          const raw = await window.WebApp.SecureStorage.getItem(STORAGE_PREFIX + key);
          return raw == null ? fallback : safeJSON.parse(raw, fallback);
        }
      } catch (_) {}
      return ls.get(key, fallback);
    }
  };

  const Reports = {
    async get(type) {
      const t = normalizeType(type);
      const key = REPORT_KEYS[t];
      if (!key) return [];
      const list = await storage._load(key, []);
      return Array.isArray(list) ? list : [];
    },
   async save(type, report) {
     const t = normalizeType(type);
     const key = REPORT_KEYS[t];
     if (!key) return false;
   

     const list = await storage._load(key, []);
     const arr = Array.isArray(list) ? list : [];
     arr.unshift(report);
     await storage._save(key, arr);
   

     try {
       const base = window.AppConfig?.api?.baseUrl;
       const apiKey = window.AppConfig?.api?.appApiKey;
       if (!base || !apiKey) return false;
   
       const r = await fetch(`${base}/api/reports`, {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
         },
         body: JSON.stringify(report),
       });
   
       return r.ok;
     } catch (e) {
       return false;
     }
   },
    makeReport(type, payload, extra = {}) {
      const t = normalizeType(type);
      return {
        id: uid(),
        type: t,
        subtype: type !== t ? String(type) : "",
        status: "new",
        timestamp: nowISO(),
        updatedAt: nowISO(),
        user: extra.user || null,
        payload
      };
    }
  };

  const WIFI_POINTS_RAW = [
      {
        id: 1,
        name: "1-я Городская Больница 🏥",
        address: "ул. Адмирала Октябрьского, 19",
        coordinates: { lat: 44.601878, lon: 33.517227 },
        description: "65 точек доступа. Бесплатный Wi-Fi для пациентов и посетителей",
        type: "здрав"
      },
      {
        id: 2,
        name: "5-я Городская Больница",
        address: "просп. Генерала Острякова, 211Б",
        coordinates: { lat: 44.554841, lon: 33.533712 },
        description: "53 точки доступа. Wi-Fi в родильном доме и детской поликлинике",
        type: "здрав"
      },
      {
        id: 3,
        name: "9-я Городская Больница 🏥",
        address: "ул. Мира, 5",
        coordinates: { lat: 44.514211, lon: 33.598949 },
        description: "29 точек доступа в больнице и поликлиника",
        type: "здрав"
      },
      {
        id: 4,
        name: "Школа №22 🎓",
        address: "проспект Генерала Острякова, 65",
        coordinates: { lat: 44.573829, lon: 33.522198 },
        description: "2 точки доступа",
        type: "образование"
      },
      {
        id: 5,
        name: "8-я Гимназия 🎓",
        address: "ул. Хрусталёва, 45",
        coordinates: { lat: 44.577614, lon: 33.515713 },
        description: "3 точки доступа",
        type: "образование"
      },
      {
        id: 6,
        name: "ТЦ Пассаж 🛍️",
        address: "улица Щербака, 1",
        coordinates: { lat: 44.610553, lon: 33.515586 },
        description: "5 точек доступа в торговом центре",
        type: "тц"
      },
      {
        id: 7,
        name: "Матросский бульвар 🌳",
        coordinates: { lat: 44.614933, lon: 33.524172 },
        description: "4 точки доступа в парковой зоне",
        type: "парки и скверы"
      },
      {
        id: 8,
        name: "ТЦ Муссон 🛍️",
        address: "ул. Вакуленчука, 29",
        coordinates: { lat: 44.591050, lon: 33.493574 },
        description: "14 точек доступа. Крупный торговый центр",
        type: "тц"
      },
      {
        id: 9,
        name: "ДЮСШ Чайка ⚽",
        address: "Костомаровская ул., 3",
        coordinates: { lat: 44.603347, lon: 33.515374 },
        description: "3 точки доступа. Детско-юношеская спортивная школа",
        type: "спорт"
      },
      {
        id: 10,
        name: "Арт-отель 🏨",
        address: "ул. Гоголя, 2",
        coordinates: { lat: 44.600808, lon: 33.522898 },
        description: "1 точка доступа",
        type: "гостиница"
      },
      {
        id: 11,
        name: "Школа №45 🎓",
        address: "ул. Ивана Голубца, 1",
        coordinates: { lat: 44.588873, lon: 33.513280 },
        description: "7 точек доступа",
        type: "образование"
      },
      {
        id: 12,
        name: "Пляж Песочный 🏖️",
        address: "ул. Ефремова, 42",
        coordinates: { lat: 44.607704, lon: 33.481245 },
        description: "2 точки доступа в пляжной зоне",
        type: "пляж"
      },
      {
        id: 13,
        name: "Театр Луначарского 🎭",
        address: "просп. Нахимова, 6",
        coordinates: { lat: 44.614089, lon: 33.521679 },
        description: "3 точки доступа. Севастопольский академический русский драматический театр",
        type: "отдых"
      },
      {
        id: 14,
        name: "Московский государственный университет имени М. В. Ломоносова 🎓",
        address: "ул. Героев Севастополя, 7",
        coordinates: { lat: 44.608701, lon: 33.534596 },
        description: "58 точек доступа. Севастопольский филиал московского государственного университета",
        type: "образование"
      },
      {
        id: 15,
        name: "Школа №19 🎓",
        address: "ул. Истомина, 37",
        coordinates: { lat: 44.604716, lon: 33.554229 },
        description: "14 точек доступа",
        type: "образование"
      },
      {
        id: 16,
        name: "Школа №50 🎓",
        address: "ул. Генерала Жидилова, 1",
        coordinates: { lat: 44.606616, lon: 33.571139 },
        description: "9 точек доступа",
        type: "образование"
      },
      {
        id: 17,
        name: "Школа №41 🎓",
        address: "ул. Горпищенко, 39",
        coordinates: { lat: 44.597533, lon: 33.558312 },
        description: "7 точек доступа",
        type: "образование"
      },
      {
        id: 18,
        name: "Спортивно-оздоровительный лагерь 'Горизонт' 🌳",
        address: "ул. Челюскинцев, 119",
        coordinates: { lat: 44.652421, lon: 33.543481 },
        description: "6 точек доступа",
        type: "турбаза"
      },
      {
        id: 19,
        name: "Федюхины Высоты 🌳",
        address: "ул. Ясная, 45",
        coordinates: { lat: 44.547668, lon: 33.625791 },
        description: "5 точек доступа",
        type: "отдых"
      },
      {
        id: 20,
        name: "Школа №37 🎓",
        address: "просп. Октябрьской Революции, 54",
        coordinates: { lat: 44.584444, lon: 33.462598 },
        description: "6 точек доступа",
        type: "образование"
      },
      {
        id: 21,
        name: "Дом престарелых 🏥",
        address: "Фиолентовское ш., 3",
        coordinates: { lat: 44.572832, lon: 33.474797 },
        description: "25 точек доступа",
        type: "здрав"
      },
      {
        id: 22,
        name: "Остановка - Большая Морская, 15 🚌",
        coordinates: { lat: 44.607441, lon: 33.521774 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 23,
        name: "Остановка - Большая Морская, 52 🚌",
        coordinates: { lat: 44.601983, lon: 33.523376 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 24,
        name: "Остановка - Героев Севастополя 🚌",
        address: "ул. Героев Севастополя, 3",
        coordinates: { lat: 44.600093, lon: 33.531538 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 25,
        name: "ЖК Ореховый 🏘️",
        address: "ул. Горпищенко, 139",
        coordinates: { lat: 44.582454, lon: 33.576837 },
        description: "1 точка доступа",
        type: "дома"
      },
      {
        id: 26,
        name: "ЖК Ореховый №2 🏘️",
        address: "ул. Горпищенко, 139",
        coordinates: { lat: 44.582927, lon: 33.577094 },
        description: "1 точка доступа",
        type: "дома"
      },
      {
        id: 27,
        name: "Комсомольский парк имени Марии Байды 🌳",
        coordinates: { lat: 44.608947, lon: 33.519217 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 28,
        name: "Остановка - Ленина, 50 🚌",
        coordinates: { lat: 44.606914, lon: 33.527160 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 29,
        name: "Остановка - ул. Маячная, 3 (№1) 🚌",
        coordinates: { lat: 44.593059, lon: 33.451562 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 30,
        name: "Остановка - ул. Маячная, 3 (№2) 🚌",
        coordinates: { lat: 44.592737, lon: 33.451519 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 31,
        name: "Остановка - Нахимова, 1 🚌",
        coordinates: { lat: 44.615997, lon: 33.523267 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 32,
        name: "Проспект Нахимова 🌳",
        address: "просп. Нахимова, 2В",
        coordinates: { lat: 44.617383, lon: 33.522987 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 35,
        name: "Остановка - Студгородок 🚌",
        address: "ул. Вакуленчука, 36/2",
        coordinates: { lat: 44.588022, lon: 33.478976 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 36,
        name: "Остановка - пр.Генерал Острякова, 233 🚌",
        coordinates: { lat: 44.551140, lon: 33.533589 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 37,
        name: "Парк Лукоморье 🌳",
        address: "ул. Тарутинская",
        coordinates: { lat: 44.593648, lon: 33.549481 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 38,
        name: "Центральный Рынок 🛍️",
        address: "ул. Щербака, 1",
        coordinates: { lat: 44.610850, lon: 33.515783 },
        description: "Торговые ряды",
        type: "тц"
      },
      {
        id: 39,
        name: "Остановка - Маринеско 🚌",
        address: "ул. Александра Маринеско",
        coordinates: { lat: 44.574268, lon: 33.463886 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 40,
        name: "Остановка - 5 км (№1) 🚌",
        address: "5-й километр Балаклавского шоссе",
        coordinates: { lat: 44.549703, lon: 33.530960 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 41,
        name: "Остановка - 5 км (№2) 🚌",
        address: "5-й километр Балаклавского шоссе",
        coordinates: { lat: 44.549460, lon: 33.529899 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 42,
        name: "Остановка - 5 км (№3) 🚌",
        address: "5-й километр",
        coordinates: { lat: 44.550063, lon: 33.529614 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 43,
        name: "Остановка - Бухта Камышовая 🚌",
        address: "ул. Правды, 2",
        coordinates: { lat: 44.582007, lon: 33.433460 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 44,
        name: "Остановка - Школа №41 🚌",
        address: "ул. Горпищенко, 44",
        coordinates: { lat: 44.597581, lon: 33.558572 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 45,
        name: "Остановка - Омега 🚌",
        address: "просп. Героев Сталинграда, 67",
        coordinates: { lat: 44.594181, lon: 33.448148 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 46,
        name: "Остановка - Омега №2 🚌",
        address: "просп. Героев Сталинграда, 77",
        coordinates: { lat: 44.594332, lon: 33.447397 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 47,
        name: "Остановка - ул. Борисова 🚌",
        coordinates: { lat: 44.589196, lon: 33.444480 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 48,
        name: "Остановка - ул. Степаняна 🚌",
        address: "просп. Октябрьской Революции, 91А",
        coordinates: { lat: 44.587352, lon: 33.466900 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 49,
        name: "Площадь Нахимова 🌳",
        address: "пл. Нахимова, 1",
        coordinates: { lat: 44.617313, lon: 33.525112 },
        description: "1 точка доступа на центральной площади",
        type: "отдых"
      },
      {
        id: 50,
        name: "Остановка - ЦУМ 🚌",
        address: "ул. Вакуленчука, 6А",
        coordinates: { lat: 44.597175, lon: 33.488740 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 51,
        name: "Остановка - Больничный комплекс (из города) 🚌",
        address: "просп. Генерала Острякова, 248Б",
        coordinates: { lat: 44.555303, lon: 33.529416 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 52,
        name: "Остановка - Больничный комплекс (в город) 🚌",
        address: "просп. Генерала Острякова, 225Д",
        coordinates: { lat: 44.555912, lon: 33.529470 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 53,
        name: "Балаклава, пл. 1 Мая 🌊",
        coordinates: { lat: 44.501435, lon: 33.600224 },
        description: "Набережная Балаклавы",
        type: "отдых"
      },
      {
        id: 54,
        name: "Остановка - Хрюкина (№1) 🚌",
        address: "просп. Генерала Острякова, 123Б",
        coordinates: { lat: 44.567514, lon: 33.523852 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 55,
        name: "Остановка - Хрюкина (№2) 🚌",
        address: "ул. Генерала Хрюкина, 1А/1",
        coordinates: { lat: 44.567067, lon: 33.525359 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 56,
        name: "Остановка - Хрюкина (№3) 🚌",
        address: "просп. Генерала Острякова",
        coordinates: { lat: 44.565991, lon: 33.524160 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 57,
        name: "Остановка - Школа №38 🚌",
        address: "просп. Генерала Острякова",
        coordinates: { lat: 44.559369, lon: 33.527783 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 58,
        name: "Остановка - Школа №38 (№2) 🚌",
        address: "просп. Генерала Острякова",
        coordinates: { lat: 44.558919, lon: 33.527702 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 59,
        name: "Рынок 5-й километр (№1) 🛍️",
        address: "пр. Генерала Острякова, 233",
        coordinates: { lat: 44.550893, lon: 33.534332 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 60,
        name: "Рынок 5-й километр (№2) 🛍️",
        address: "пр. Генерала Острякова, 233",
        coordinates: { lat: 44.551854, lon: 33.533024 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 61,
        name: "Рынок 5-й километр (№3) 🛍️",
        address: "пр. Генерала Острякова, 233",
        coordinates: { lat: 44.550722, lon: 33.533155 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 62,
        name: "Рынок 5-й километр (№4) 🛍️",
        address: "пр. Генерала Острякова, 233",
        coordinates: { lat: 44.550560, lon: 33.531090 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 63,
        name: "Рынок 5-й километр (№5) 🛍️",
        address: "пр. Генерала Острякова, 233",
        coordinates: { lat: 44.551768, lon: 33.531022 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 64,
        name: "Рынок 5-й километр (№6) 🛍️",
        address: "пр. Генерала Острякова, 233",
        coordinates: { lat: 44.550512, lon: 33.530500 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 65,
        name: "ул. Хрусталева, 74б 🛍️",
        coordinates: { lat: 44.558628, lon: 33.520575 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 66,
        name: "пр. Генерала Острякова, 133 🛍️",
        coordinates: { lat: 44.567117, lon: 33.524603 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 67,
        name: "Остановка - Памятник Матросу Кошке 🛍️",
        address: "улица Героев Севастополя",
        coordinates: { lat: 44.605200, lon: 33.539042 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 68,
        name: "ул. Хрусталева, 67 🛍️",
        coordinates: { lat: 44.570983, lon: 33.517697 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 69,
        name: "Остановка - Улица Коли Пищенко 🚌",
        address: "ул. Коли Пищенко, 16",
        coordinates: { lat: 44.594583, lon: 33.548182 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 70,
        name: "Проспект Генерала Острякова, 98 (Океан) 🛍️",
        coordinates: { lat: 44.574275, lon: 33.519811 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 71,
        name: "Силаевский рынок 🛍️",
        address: "ул. Силаева, 8а",
        coordinates: { lat: 44.574068, lon: 33.517753 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 72,
        name: "Силаевский рынок №2 🛍️",
        address: "ул. Силаева",
        coordinates: { lat: 44.574348, lon: 33.517765 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 73,
        name: "Гоголя, 32 🌳",
        address: "ул. Гоголя, 32",
        coordinates: { lat: 44.590237, lon: 33.516437 },
        description: "1 точка доступа.",
        type: ""
      },
      {
        id: 74,
        name: "Лукоморье, Кафе 🍴",
        address: "парк Лукоморье, микрорайон Проспект Победы",
        coordinates: { lat: 44.593707, lon: 33.549996 },
        description: "1 точка доступа в кафе в парке.",
        type: "кафе"
      },
      {
        id: 75,
        name: "Склад - ул. Руднева, 1Г 🛍️",
        coordinates: { lat: 44.586203, lon: 33.512792 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 76,
        name: "проспект Генерала Острякова, 63А 🛍️",
        coordinates: { lat: 44.576072, lon: 33.520065 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 77,
        name: "Остановка - Кинотеатр Москва 🚌",
        address: "проспект Генерала Острякова",
        coordinates: { lat: 44.579733, lon: 33.518766 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 78,
        name: "Остановка - ул. Олега Кошевого 🚌",
        address: "просп. Генерала Острякова, 5Б",
        coordinates: { lat: 44.584302, lon: 33.517997 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 79,
        name: "Остановка - Улица Ревякина 🚌",
        address: "улица Героев Севастополя",
        coordinates: { lat: 44.596445, lon: 33.531544 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 80,
        name: "Остановка - Кинотеатр Москва (№2) 🚌",
        address: "просп. Генерала Острякова, 33А",
        coordinates: { lat: 44.580311, lon: 33.518996 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 82,
        name: "Остановка - Гипермаркет 🚌",
        address: "ул. Шабалина",
        coordinates: { lat: 44.578962, lon: 33.510832 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 83,
        name: "Остановка - ул. Кожанова 🚌",
        address: "ул. Гоголя, 47",
        coordinates: { lat: 44.590803, lon: 33.516765 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 84,
        name: "Остановка - Автовокзал 🚌",
        address: "Вокзальная ул., 11",
        coordinates: { lat: 44.594492, lon: 33.531659 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 85,
        name: "Сквер остановки Кинотеатр Москва 🌳",
        address: "пр. Генерала Острякова",
        coordinates: { lat: 44.580653, lon: 33.519189 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 87,
        name: "Остановка - Юность (в город) 🚌",
        address: "ул. Хрусталёва, 37А",
        coordinates: { lat: 44.578981, lon: 33.513373 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 88,
        name: "Остановка - Юность (на 5-ый) 🚌",
        address: "ул. Хрусталёва",
        coordinates: { lat: 44.578347, lon: 33.513330 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 89,
        name: "Остановка - ул. Адм. Октябрьского 🚌",
        address: "ул. Адмирала Октябрьского",
        coordinates: { lat: 44.603512, lon: 33.519294 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 90,
        name: "Остановка - Доска Почета Нахимовского района 🚌",
        address: "ул. Героев Севастополя",
        coordinates: { lat: 44.605210, lon: 33.539048 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 91,
        name: "Остановка - Памятник Героям-подводникам (из города) 🚌",
        address: "ул. Героев Севастополя",
        coordinates: { lat: 44.604632, lon: 33.538085 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 92,
        name: "Остановка - Ж/Д вокзал 🚌",
        address: "ул. Вокзальная",
        coordinates: { lat: 44.594489, lon: 33.531664 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 93,
        name: "Остановка - Автовокзал (стоянка автобусов) 🚌",
        address: "ул. Вокзальная",
        coordinates: { lat: 44.594489, lon: 33.531664 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 94,
        name: "Остановка - ул. Степаненко (из города) 🚌",
        address: "ул. Степаненко",
        coordinates: { lat: 44.593765, lon: 33.518381 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 95,
        name: "Остановка - Техническая библиотека 🚌",
        address: "просп. Генерала Острякова",
        coordinates: { lat: 44.583278, lon: 33.517870 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 96,
        name: "Умная остановка - ЖД Вокзал 🚌",
        address: "ул. Вокзальная",
        coordinates: { lat: 44.595000, lon: 33.528183 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 97,
        name: "Остановка - СевЭнерго 🚌",
        address: "ул. Хрусталёва",
        coordinates: { lat: 44.571533, lon: 33.516750 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 98,
        name: "Остановка - Воронцовский Рынок 🚌",
        address: "просп. Победы, 17А/7",
        coordinates: { lat: 44.590770, lon: 33.556107 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 99,
        name: "Улица Токарева, 18 🌳",
        coordinates: { lat: 44.580227, lon: 33.506562 },
        description: "1 точка доступа",
        type: "дома"
      },
      {
        id: 100,
        name: "Улица Токарева, 18Б 🌳",
        coordinates: { lat: 44.579538, lon: 33.507312 },
        description: "1 точка доступа",
        type: "дома"
      },
      {
        id: 101,
        name: "Улица Токарева 18В 🌳",
        coordinates: { lat: 44.579025, lon: 33.506124 },
        description: "1 точка доступа",
        type: "дома"
      },
      {
        id: 102,
        name: "Остановка - Воронцовский рынок (в город) 🚌",
        address: "просп. Победы",
        coordinates: { lat: 44.590182, lon: 33.556574 },
        description: "1 точка доступа",
        type: "транспорт"
      },
      {
        id: 103,
        name: "Улица Гоголя, 10 🌳",
        coordinates: { lat: 44.598611, lon: 33.520803 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 104,
        name: "Улица Ленина, 14 🌳",
        coordinates: { lat: 44.612481, lon: 33.525275 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 105,
        name: "Улица Ленина, 10 🌳",
        coordinates: { lat: 44.614147, lon: 33.525216 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 106,
        name: "Улица Большая Морская, 52 🌳",
        coordinates: { lat: 44.601980, lon: 33.523389 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 107,
        name: "Улица Большая Морская, 25 🌳",
        coordinates: { lat: 44.605450, lon: 33.522524 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 108,
        name: "Улица Гоголя, 25 🌳",
        coordinates: { lat: 44.597079, lon: 33.520259 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 109,
        name: "Улица Очаковцев, 36 🌳",
        coordinates: { lat: 44.604064, lon: 33.520456 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 110,
        name: "Улица Ленина, 47 🌳",
        coordinates: { lat: 44.602365, lon: 33.525761 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 111,
        name: "Улица Ленина, 33 🌳",
        coordinates: { lat: 44.605086, lon: 33.527331 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 112,
        name: "Улица Ленина, 23 🌳",
        coordinates: { lat: 44.610650, lon: 33.526253 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 113,
        name: "Улица Ленина, 40 🌳",
        coordinates: { lat: 44.608893, lon: 33.526595 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 114,
        name: "Улица Большая Морская, 35 🌳",
        coordinates: { lat: 44.603614, lon: 33.523134 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 115,
        name: "Площадь Нахимова №1 🌳",
        address: "пл. Нахимова",
        coordinates: { lat: 44.616478, lon: 33.526021 },
        description: "1 точка доступа. Центральная площадь, столб №4.",
        type: "отдых"
      },
      {
        id: 116,
        name: "Площадь Нахимова №2 🌳",
        address: "пл. Нахимова",
        coordinates: { lat: 44.617153, lon: 33.526301 },
        description: "1 точка доступа. Центральная площадь, столб №5.",
        type: "отдых"
      },
      {
        id: 117,
        name: "Улица Кулакова, 41 🌳",
        coordinates: { lat: 44.604643, lon: 33.519643 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 118,
        name: "Комсомольский парк 🌳",
        coordinates: { lat: 44.608602, lon: 33.518498 },
        description: "1 точка доступа. Парковая зона",
        type: "отдых"
      },
      {
        id: 119,
        name: "Набережная Корнилова, 2 🌳",
        coordinates: { lat: 44.614848, lon: 33.521740 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 121,
        name: "Улица Адмирала Владимирского, 24 📍",
        coordinates: { lat: 44.611412, lon: 33.509370 },
        description: "1 точка доступа",
        type: ""
      },
      {
        id: 122,
        name: "Улица Балаклавская, 3 📍",
        coordinates: { lat: 44.601090, lon: 33.522032 },
        description: "1 точка доступа",
        type: ""
      },
      {
        id: 123,
        name: "Остановка - Водоканал 🚌",
        address: "улица Адмирала Октябрьского, 4Б",
        coordinates: { lat: 44.603561, lon: 33.521586 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 124,
        name: "Остановка - Комсомольский парк 🚌",
        address: "улица Очаковцев",
        coordinates: { lat: 44.608667, lon: 33.518172 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 125,
        name: "Остановка - ул. Суворова (в город) 🚌",
        address: "улица Ленина",
        coordinates: { lat: 44.606454, lon: 33.527689 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 126,
        name: "Остановка - Улица Меньшикова 🚌",
        address: "улица Вакуленчука, 25Б",
        coordinates: { lat: 44.592432, lon: 33.487509 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 128,
        name: "Улица Генерала Петрова, 1 📍",
        coordinates: { lat: 44.611236, lon: 33.519623 },
        description: "1 точка доступа.",
        type: ""
      },
      {
        id: 129,
        name: "Улица Большая Морская, 5 📍",
        coordinates: { lat: 44.609771, lon: 33.520980 },
        description: "1 точка доступа",
        type: ""
      },
      {
        id: 130,
        name: "Проспект Нахимова, 1 📍",
        coordinates: { lat: 44.616019, lon: 33.523259 },
        description: "1 точка доступа",
        type: ""
      },
      {
        id: 131,
        name: "Улица Одесская, 19 📍",
        coordinates: { lat: 44.608939, lon: 33.519756 },
        description: "1 точка доступа",
        type: ""
      },
      {
        id: 132,
        name: "Остановка - Улица Меньшикова (из города) 🚌",
        address: "улица Вакуленчука, 18Б",
        coordinates: { lat: 44.592010, lon: 33.486125 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 133,
        name: "Проспект Нахимова, 3 📍",
        coordinates: { lat: 44.615380, lon: 33.523207 },
        description: "1 точка доступа",
        type: ""
      },
      {
        id: 134,
        name: "Остановка - Площадь 50 лет СССР 🚌",
        address: "улица Вакуленчука, 4",
        coordinates: { lat: 44.597874, lon: 33.489102 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 135,
        name: "Татьянинская церковь",
        address: "ул. Вакуленчука, 36/5",
        coordinates: { lat: 44.588302, lon: 33.477680 },
        description: "1 точка доступа.",
        type: ""
      },
      {
        id: 136,
        name: "Умная остановка - Меньшикова 🚌",
        address: "улица Вакуленчука",
        coordinates: { lat: 44.591401, lon: 33.486725 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 137,
        name: "Умная остановка - ЦУМ 🚌",
        address: "улица Вакуленчука, 6А",
        coordinates: { lat: 44.597173, lon: 33.488730 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 139,
        name: "Детский мир 🏬",
        address: "пр. Нахимова, 19",
        coordinates: { lat: 44.612372, lon: 33.520905 },
        description: "1 точка доступа.",
        type: "тц"
      },
      {
        id: 140,
        name: "Ресторан 'Черный кот' 🛍️",
        address: "ул. Маяковского, 2а",
        coordinates: { lat: 44.612073, lon: 33.519716 },
        description: "1 точка доступа.",
        type: "кафе"
      },
      {
        id: 141,
        name: "Артбухта 🎨",
        address: "набережная Корнилова",
        coordinates: { lat: 44.613698, lon: 33.519543 },
        description: "1 точка доступа.",
        type: "отдых"
      },
      {
        id: 142,
        name: "Остановка - ЦУМ (в город) 🚌",
        address: "площадь 50-летия СССР, 15",
        coordinates: { lat: 44.597662, lon: 33.489269 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 143,
        name: "Умная остановка - Нахимова 🚌",
        address: "проспект Нахимова",
        coordinates: { lat: 44.616697, lon: 33.523804 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 144,
        name: "Умная остановка - Нахимова №2 🚌",
        address: "пл. Нахимова",
        coordinates: { lat: 44.616624, lon: 33.523413 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 145,
        name: "Умная остановка - Лазарева №2 (ТЦ Детский Мир) 🚌",
        address: "проспект Нахимова, 10",
        coordinates: { lat: 44.612382, lon: 33.520458 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 146,
        name: "Площадь 300-летия РФ 1 🇷🇺",
        address: "площадь 300-летия Российского Флота, 4/2",
        coordinates: { lat: 44.612923, lon: 33.517966 },
        description: "1 точка доступа.",
        type: "отдых"
      },
      {
        id: 147,
        name: "Площадь 300-летия Российского Флота 2 🇷🇺",
        coordinates: { lat: 44.613705, lon: 33.518685 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 148,
        name: "Остановка - Пожарова (Парк) 🚌",
        address: "ул. Пожарова",
        coordinates: { lat: 44.605490, lon: 33.509698 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 149,
        name: "Остановка - Пожарова (в сторону центра) 🚌",
        address: "ул. Пожарова",
        coordinates: { lat: 44.605060, lon: 33.509128 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 150,
        name: "Остановка - Пожарова (из города) 🚌",
        address: "ул. Пожарова, 6А",
        coordinates: { lat: 44.605016, lon: 33.508286 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 151,
        name: "Остановка - ул. Репина (в город) 🚌",
        address: "проспект Юрия Гагарина",
        coordinates: { lat: 44.599107, lon: 33.491546 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 152,
        name: "Остановка - ул. Ген. Петрова 🚌",
        address: "Новороссийская улица",
        coordinates: { lat: 44.607632, lon: 33.517095 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 153,
        name: "Остановка - ул. Дмитрия Ульянова (из города) 🚌",
        address: "улица Дмитрия Ульянова, 2А",
        coordinates: { lat: 44.601123, lon: 33.494320 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 154,
        name: "Остановка - ул. Репина (в камыши) 🚌",
        address: "улица Репина, 27",
        coordinates: { lat: 44.591804, lon: 33.491763 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 155,
        name: "Останова - ул. Репина (на 5-ый км) 🚌",
        address: "улица Руднева",
        coordinates: { lat: 44.591597, lon: 33.491253 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 156,
        name: "Остановка - кинотеатр Россия (в город) 🚌",
        address: "площадь 50-летия СССР",
        coordinates: { lat: 44.599392, lon: 33.488631 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 157,
        name: "Остановка - кинотеатр Россия (из города) 🚌",
        address: "площадь 50-летия СССР",
        coordinates: { lat: 44.599717, lon: 33.488797 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 158,
        name: "Остановка - Центр занятости (в камыши) 🚌",
        address: "улица Руднева, 40",
        coordinates: { lat: 44.591698, lon: 33.488755 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 159,
        name: "Остановка - Бухта Стрелецкая (конечная) 🚌",
        address: "квартал Стрелка",
        coordinates: { lat: 44.601697, lon: 33.479028 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 160,
        name: "Остановка - Братское кладбище (с пл. Захарова) 🚌",
        address: "улица Богданова, 30",
        coordinates: { lat: 44.635070, lon: 33.552203 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 161,
        name: "Остановка - ул. Суздальская (в город) 🚌",
        address: "улица Героев Севастополя",
        coordinates: { lat: 44.608004, lon: 33.550369 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 162,
        name: "Остановка - ул. Чехова (с пл. Захарова) 🚌",
        address: "улица Богданова, 16/3",
        coordinates: { lat: 44.636333, lon: 33.547298 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 163,
        name: "Остановка - Больница №4 🚌",
        address: "улица Леваневского",
        coordinates: { lat: 44.630529, lon: 33.539290 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 164,
        name: "Остановка - ул. Истомина 🚌",
        address: "ул. Истомина",
        coordinates: { lat: 44.604917, lon: 33.550857 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 165,
        name: "Умная остановка - Проспект Победы 🚌",
        address: "пр. Победы",
        coordinates: { lat: 44.584318, lon: 33.564085 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 166,
        name: "Остановка - ул. Чехова (на пл. Захарова) 🚌",
        address: "ул. Чехова",
        coordinates: { lat: 44.636387, lon: 33.548009 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 167,
        name: "Бар 🍻",
        address: "пл. Генерала Захарова, 5",
        coordinates: { lat: 44.628134, lon: 33.536535 },
        description: "1 точка доступа.",
        type: "отдых"
      },
      {
        id: 168,
        name: "Остановка - кинотеатр Моряк (на Захарова) 🚌",
        address: "улица Леваневского, 35",
        coordinates: { lat: 44.632693, lon: 33.540939 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 169,
        name: "Остановка - Братское Кладбище (на пл. Захарова) 🚌",
        address: "улица Богданова, 33",
        coordinates: { lat: 44.635431, lon: 33.551901 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 170,
        name: "Остановка - Кинотеатр 'Спутник' (в город) 🚌",
        address: "улица Горпищенко",
        coordinates: { lat: 44.595256, lon: 33.561991 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 171,
        name: "Остановка - Кинотеатр 'Спутник' (из города) 🚌",
        address: "улица Горпищенко, 72",
        coordinates: { lat: 44.594524, lon: 33.562686 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 172,
        name: "Остановка - ул. 2-я Бастионная 🚌",
        address: "улица Истомина",
        coordinates: { lat: 44.605327, lon: 33.550535 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 173,
        name: "Остановка - кинотеатр Моряк (с Захарова) 🚌",
        address: "улица Челюскинцев",
        coordinates: { lat: 44.632877, lon: 33.541326 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 174,
        name: "пл. Захарова 🌳",
        address: "набережная Достоевского",
        coordinates: { lat: 44.626683, lon: 33.536307 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 175,
        name: "Остановка - ул. Будищева (в город) 🚌",
        address: "Брестская улица",
        coordinates: { lat: 44.600545, lon: 33.541286 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 176,
        name: "Улица Брестская, 18 📍",
        coordinates: { lat: 44.602498, lon: 33.540319 },
        description: "1 точка доступа",
        type: ""
      },
      {
        id: 177,
        name: "Остановка - ул. Будищева (из города) 🚌",
        address: "улица Багрия, 2А",
        coordinates: { lat: 44.599876, lon: 33.541430 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 178,
        name: "Площадь Захарова №2 🌳",
        coordinates: { lat: 44.626664, lon: 33.535857 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 180,
        name: "Остановка - Юмашева (в город) 🚌",
        address: "проспект Октябрьской Революции, 44к3",
        coordinates: { lat: 44.589724, lon: 33.461189 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 181,
        name: "Проспект Октябрьской Революции, 57 📍",
        coordinates: { lat: 44.591079, lon: 33.460120 },
        description: "1 точка доступа",
        type: ""
      },
      {
        id: 182,
        name: "Проспект Октябрьской Революции, 43 📍",
        coordinates: { lat: 44.592441, lon: 33.457808 },
        description: "1 точка доступа",
        type: ""
      },
      {
        id: 183,
        name: "Проспект Октябрьской Революции, 22/5 📍",
        coordinates: { lat: 44.592947, lon: 33.454948 },
        description: "1 точка доступа",
        type: ""
      },
      {
        id: 184,
        name: "Бухта Омега 🌊",
        coordinates: { lat: 44.597241, lon: 33.444018 },
        description: "1 точка доступа. Набережная",
        type: "отдых"
      },
      {
        id: 185,
        name: "Фадеева, 1 ТД №1 🛍️",
        coordinates: { lat: 44.596623, lon: 33.459418 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 187,
        name: "Юмашевский Рынок 🛍️",
        address: "ул. Юмашева, 26",
        coordinates: { lat: 44.591608, lon: 33.463670 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 188,
        name: "Улица Шевченко, 17 📍",
        coordinates: { lat: 44.578655, lon: 33.462806 },
        description: "1 точка доступа",
        type: ""
      },
      {
        id: 189,
        name: "Проспект Октябрьской Революции, 26 📍",
        address: " ",
        coordinates: { lat: 44.592359, lon: 33.456329 },
        description: "1 точка доступа",
        type: ""
      },
      {
        id: 190,
        name: "Детско-юношеский клуб 'Румб') 🎓",
        address: "Проспект Октябрьской Революции, 89",
        coordinates: { lat: 44.588023, lon: 33.467291 },
        description: "1 точка доступа.",
        type: "образование"
      },
      {
        id: 192,
        name: "Бар 🍻",
        address: "Проспект Октябрьской Революции, 50В",
        coordinates: { lat: 44.588533, lon: 33.460624 },
        description: "1 точка доступа.",
        type: "кафе"
      },
      {
        id: 193,
        name: "Юмашевский рынок 🛍️",
        address: "ул. Юмашева",
        coordinates: { lat: 44.590902, lon: 33.463065 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 195,
        name: "Улица Тараса Шевченко, 19а 🛍️",
        coordinates: { lat: 44.578504, lon: 33.461612 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 196,
        name: "Улица Комбрига Потапова, 29 📍",
        coordinates: { lat: 44.567933, lon: 33.464470 },
        description: "1 точка доступа",
        type: ""
      },
      {
        id: 197,
        name: "Юмашевский рынок (администрация рынка) 🛍️",
        address: "ул. Юмашева",
        coordinates: { lat: 44.590056, lon: 33.462011 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 198,
        name: "Юмашевский рынок (администрация рынка 2) 🛍️",
        address: "ул. Юмашева",
        coordinates: { lat: 44.590148, lon: 33.462610 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 199,
        name: "Юмашевский рынок 🛍️",
        address: "ул. Юмашева",
        coordinates: { lat: 44.591789, lon: 33.464065 },
        description: "1 точка доступа.",
        type: "торговля"
      },
      {
        id: 200,
        name: "Остановка - Колобова 🚌",
        address: "ул. Колобова",
        coordinates: { lat: 44.582669, lon: 33.459237 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 201,
        name: "Остановка - Парк Победы 🚌",
        address: "Проспект Октябрьской Революции",
        coordinates: { lat: 44.594450, lon: 33.453160 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 202,
        name: "Остановка - Проспект Октябрьской Революции (из города) 🚌",
        address: "проспект Октябрьской Революции, 43Д",
        coordinates: { lat: 44.592001, lon: 33.457730 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 203,
        name: "Остановка - Апельсин (со стороны ТЦ) 🚌",
        address: "проспект Героев Сталинграда",
        coordinates: { lat: 44.584309, lon: 33.438014 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 204,
        name: "Остановка - Кинотеатр 'Океан' 🚌",
        address: "улица Правды, 11",
        coordinates: { lat: 44.580837, lon: 33.434939 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 205,
        name: "Остановка - Проспект Октябрьской Революции (из города) 🚌",
        address: "проспект Октябрьской Революции, 32В",
        coordinates: { lat: 44.591650, lon: 33.457940 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 206,
        name: "Остановка - ул. Бориса Михайлова (из города) 🚌",
        address: "ул. Бориса Михайлова",
        coordinates: { lat: 44.578135, lon: 33.442817 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 207,
        name: "Остановка - Портовая поликлиника (из города) 🚌",
        address: "ул. Бориса Миайлова",
        coordinates: { lat: 44.581802, lon: 33.441468 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 208,
        name: "Остановка - Портовая поликлиника (в город) 🚌",
        address: "улица Бориса Михайлова, 5А",
        coordinates: { lat: 44.582271, lon: 33.441663 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 209,
        name: "Остановка - Юмашева (из города) 🚌",
        address: "проспект Октябрьской Революции, 57А",
        coordinates: { lat: 44.590137, lon: 33.460972 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 210,
        name: "Остановка - ул. Юмашева №2 (из города) 🚌",
        address: "проспект Октябрьской Революции, 57А",
        coordinates: { lat: 44.590134, lon: 33.461319 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 211,
        name: "Улица Комбрига Потапова, 31 📍",
        coordinates: { lat: 44.568443, lon: 33.464459 },
        description: "1 точка доступа",
        type: ""
      },
      {
        id: 212,
        name: "Остановка - ул. Шевченко 🚌",
        address: "5-й микрорайон, ул. Косарева",
        coordinates: { lat: 44.578251, lon: 33.462468 },
        description: "1 точка доступа.",
        type: "транспорт"
      },
      {
        id: 213,
        name: "35 Батарея (монитор) 📍",
        coordinates: { lat: 44.559969, lon: 33.406429 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 214,
        name: "35 Батарея (охрана) 📍",
        coordinates: { lat: 44.560002, lon: 33.406824 },
        description: "1 точка доступа",
        type: "отдых"
      },
      {
        id: 215,
        name: "Парк Победы 🌳",
        address: "набережная Парк Победы, 7",
        coordinates: { lat: 44.608609, lon: 33.455818 },
        description: "1 точка доступа.",
        type: "отдых"
      },
      {
        id: 216,
        name: "МФЦ - Вокзальная 🏢",
        address: "ул. Вокзальная, д. 10",
        coordinates: { lat: 44.594299, lon: 33.532275 },
        description: "Многофункциональный центр предоставления услуг",
        type: "МФЦ"
      },
      {
        id: 217,
        name: "МФЦ - Острякова 🏢",
        address: "пр. Генерала Острякова, д. 15",
        coordinates: { lat: 44.582145, lon: 33.519467 },
        description: "Многофункциональный центр предоставления услуг",
        type: "МФЦ"
      },
      {
        id: 218,
        name: "МФЦ - Леваневского 🏢",
        address: "ул. Леваневского, д. 24",
        coordinates: { lat: 44.631102, lon: 33.540194 },
        description: "Многофункциональный центр предоставления услуг",
        type: "МФЦ"
      },
      {
        id: 219,
        name: "МФЦ - Героев Сталинграда 🏢",
        address: "пр. Героев Сталинграда, д. 64",
        coordinates: { lat: 44.592218, lon: 33.447196 },
        description: "Многофункциональный центр предоставления услуг",
        type: "МФЦ"
      },
      {
        id: 220,
        name: "МФЦ - Инкерман 🏢",
        address: "г. Инкерман, ул. Умрихина, д. 1",
        coordinates: { lat: 44.613838, lon: 33.609672 },
        description: "Многофункциональный центр предоставления услуг",
        type: "МФЦ"
      },
      {
        id: 221,
        name: "МФЦ - Орлиное 🏢",
        address: "с. Орлиное, ул. Тюкова, д. 60А",
        coordinates: { lat: 44.446667, lon: 33.773219 },
        description: "Многофункциональный центр предоставления услуг",
        type: "МФЦ"
      },
      {
        id: 222,
        name: "МФЦ - Верхнесадовое 🏢",
        address: "с. Верхнесадовое, ул. Севастопольская, д.82",
        coordinates: { lat: 44.687819, lon: 33.696099 },
        description: "Многофункциональный центр предоставления услуг",
        type: "МФЦ"
      },
      {
        id: 223,
        name: "МФЦ - Балаклава 🏢",
        address: "ул. Новикова, д. 4 (Балаклава)",
        coordinates: { lat: 44.507712, lon: 33.599082 },
        description: "Многофункциональный центр предоставления услуг",
        type: "МФЦ"
      },
      {
        id: 224,
        name: "МФЦ - Бориса Михайлова 🏢",
        address: "ул. Бориса Михайлова, д.6",
        coordinates: { lat: 44.581447, lon: 33.439657 },
        description: "Многофункциональный центр предоставления услуг",
        type: "МФЦ"
      },
      {
        id: 225,
        name: "МФЦ - Рабочая 🏢",
        address: "ул. Рабочая, д. 4",
        coordinates: { lat: 44.610923, lon: 33.541094 },
        description: "Многофункциональный центр предоставления услуг",
        type: "МФЦ"
      },
      {
        id: 226,
        name: "МФЦ - Павла Корчагина 🏢",
        address: "ул. Павла Корчагина, д. 34",
        coordinates: { lat: 44.588720, lon: 33.437425 },
        description: "Многофункциональный центр предоставления услуг",
        type: "МФЦ"
      },
      {
        id: 227,
        name: "МФЦ - Горпищенко 🏢",
        address: "ул. Горпищенко, д. 44",
        coordinates: { lat: 44.597669, lon: 33.558103 },
        description: "Многофункциональный центр предоставления услуг",
        type: "МФЦ"
      },
      {
        id: 228,
        name: "Улица Парковая, 11 📍",
        coordinates: { lat: 44.606549, lon: 33.460730 },
        description: "1 точка доступа интернет-провайдера ЮБС.",
        type: ""
      },
      {
        id: 229,
        name: "Улица Шевченко, 8Б/3, пом.3 📍",
        coordinates: { lat: 44.580306, lon: 33.459021 },
        description: "1 точка доступа интернет-провайдера ЮБС.",
        type: ""
      },
      {
        id: 230,
        name: "Улица Руднева, 39В (Диализный центр) 🏥",
        coordinates: { lat: 44.591388, lon: 33.492410 },
        description: "1 точка доступа интернет-провайдера ЮБС.",
        type: "здрав"
      },
      {
        id: 231,
        name: "Спуск Шестакова, 1 📍",
        coordinates: { lat: 44.610595, lon: 33.521263 },
        description: "1 точка доступа",
        type: "1 точка доступа интернет-провайдера ЮБС."
      },
      {
        id: 232,
        name: "Улица Летчиков, 5 📍",
        coordinates: { lat: 44.598052, lon: 33.449799 },
        description: "1 точка доступа",
        type: "1 точка доступа интернет-провайдера ЮБС."
      },
      {
        id: 233,
        name: "Улица Руднева, 39В (офис) 📍",
        coordinates: { lat: 44.591276, lon: 33.492543 },
        description: "1 точка доступа в офисе интернет-провайдера ЮБС.",
        type: ""
      },
      {
        id: 234,
        name: "Столетовский проспект, 17А 📍",
        coordinates: { lat: 44.582319, lon: 33.455824 },
        description: "1 точка доступа интернет-провайдера ЮБС.",
        type: ""
      },
      {
        id: 235,
        name: "АЗС - Симферопольское ш., 18А ⛽",
        coordinates: { lat: 44.615055, lon: 33.604233 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 236,
        name: "АЗС - Верхнесадовский ⛽",
        coordinates: { lat: 44.683891, lon: 33.646176 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 237,
        name: "АЗС - Качинское ш. ⛽",
        address: "Качинское ш., вл2",
        coordinates: { lat: 44.674368, lon: 33.566459 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 238,
        name: "АЗС - Семипалатинская ⛽",
        address: "Семипалатинская ул., 2Б",
        coordinates: { lat: 44.593969, lon: 33.551884 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 239,
        name: "АЗС - Героев Севастополя ⛽",
        address: "ул. Героев Севастополя",
        coordinates: { lat: 44.595743, lon: 33.531527 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 240,
        name: "АЗС - Горпищенко, 155 ⛽",
        coordinates: { lat: 44.575638, lon: 33.581175 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 241,
        name: "АЗС - Генерала Мельника, 148 ⛽",
        address: "ул. Генерала Мельника, 148",
        coordinates: { lat: 44.574635, lon: 33.567255 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 242,
        name: "АЗС - Балаклавское ш., 12 ⛽",
        coordinates: { lat: 44.548256, lon: 33.535520 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 243,
        name: "АЗС - Новикова, 51Б ⛽",
        coordinates: { lat: 44.519925, lon: 33.582854 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 244,
        name: "АЗС - Дрыгина, 16 ⛽",
        coordinates: { lat: 44.467271, lon: 33.704453 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 245,
        name: "АЗС - Олега Кошевого, 1А ⛽",
        coordinates: { lat: 44.587090, lon: 33.516911 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 246,
        name: "АЗС - Льва Толстого, 51А ⛽",
        coordinates: { lat: 44.587842, lon: 33.509240 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 247,
        name: "АЗС - Хрусталёва, 62А ⛽",
        coordinates: { lat: 44.562828, lon: 33.519882 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 248,
        name: "АЗС - Хрусталёва, 74Г ⛽",
        coordinates: { lat: 44.557832, lon: 33.521588 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 249,
        name: "АЗС - Камышовое ш., 12А ⛽",
        coordinates: { lat: 44.554136, lon: 33.513478 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 250,
        name: "АЗС - Камышовое ш., 7В ⛽",
        coordinates: { lat: 44.549992, lon: 33.515496 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 251,
        name: "АЗС - Карантинная, 51 ⛽",
        address: "Карантинная ул., 51",
        coordinates: { lat: 44.605432, lon: 33.510985 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 252,
        name: "АЗС - Руднева, 44 ⛽",
        coordinates: { lat: 44.591839, lon: 33.486882 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 253,
        name: "АЗС - Вакуленчука, 35Б/2 ⛽",
        coordinates: { lat: 44.587741, lon: 33.479820 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 254,
        name: "АЗС - Фиолентовское ш., 4А ⛽",
        coordinates: { lat: 44.582257, lon: 33.470242 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 255,
        name: "АЗС - Столетовский просп., 5 ⛽",
        coordinates: { lat: 44.586354, lon: 33.450435 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 256,
        name: "АЗС - Камышовое ш., 2 ⛽",
        coordinates: { lat: 44.572851, lon: 33.441266 },
        description: "Автозаправочная станция",
        type: "АЗС"
      },
      {
        id: 257,
        name: "АЗС - Камышовое ш., 32 ⛽",
        coordinates: { lat: 44.565912, lon: 33.472050 },
        description: "Автозаправочная станция",
        type: "АЗС"
      }
    ];

  const normalizeWifiPoint = (p, idx) => {
    const obj = p && typeof p === "object" ? p : {};
    const coords = obj.coordinates && typeof obj.coordinates === "object" ? obj.coordinates : {};
    return {
      id: Number.isFinite(Number(obj.id)) ? Number(obj.id) : (idx + 1),
      name: String(obj.name || "").trim(),
      address: String(obj.address || "").trim(),
      coordinates: {
        lat: Number(coords.lat) || 0,
        lon: Number(coords.lon) || 0
      },
      description: String(obj.description || "").trim(),
      type: String(obj.type || "").trim()
    };
  };

  const WIFI_POINTS = WIFI_POINTS_RAW.map(normalizeWifiPoint).filter((p) => p.name);

  window.AppData = window.AppData || {};
  window.AppData.getTheme = () => theme.get();
  window.AppData.setTheme = (t) => theme.set(t);
  window.AppData.toggleTheme = () => theme.toggle();

   const apiBase = () => String(window.AppConfig?.api?.baseUrl || "").replace(/\/+$/, "");
   
   async function apiFetch(path, opts = {}) {
     const base = apiBase();
     if (!base) throw new Error("API baseUrl not set");
   
     const url = base + path;
     const res = await fetch(url, {
       ...opts,
       headers: {
         "Content-Type": "application/json",
         ...(opts.headers || {})
       }
     });
   

     if (!res.ok) {
       const t = await res.text().catch(() => "");
       throw new Error(`API ${res.status}: ${t}`);
     }
     return res.json();
   }
   

   window.AppData.getReports = async (type) => {
     try {
       const token = window.AppConfig?.api?.adminToken || "";
       const q = type ? `?type=${encodeURIComponent(type)}` : "";
       const json = await apiFetch(`/api/reports${q}`, {
         method: "GET",
         headers: { "X-Admin-Token": token }
       });
       return Array.isArray(json.list) ? json.list : [];
     } catch (e) {

       return Reports.get(type);
     }
   };
   

   window.AppData.saveReport = async (type, report) => {
     try {
       const json = await apiFetch(`/api/reports`, {
         method: "POST",
         body: JSON.stringify({ report })
       });
       if (json && json.ok) return true;
       return false;
     } catch (e) {

       return Reports.save(type, report);
     }
   };
   

   window.AppData.setReportStatus = async (id, status) => {
     const token = window.AppConfig?.api?.adminToken || "";
     const json = await apiFetch(`/api/reports/${encodeURIComponent(id)}/status`, {
       method: "PATCH",
       headers: { "X-Admin-Token": token },
       body: JSON.stringify({ status })
     });
     return !!json?.ok;
   };
   
  window.AppData.makeReport = (type, payload, extra) => Reports.makeReport(type, payload, extra);

  window.AppData._save = (key, value) => storage._save(key.replace(STORAGE_PREFIX, ""), value);
  window.AppData._load = (key, fallback) => storage._load(key.replace(STORAGE_PREFIX, ""), fallback);

  window.wifiPoints = WIFI_POINTS;
})();
