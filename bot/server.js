
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const { Bot, Keyboard } = require("@maxhub/max-bot-api");
require("dotenv").config();

// -------------------- Config --------------------
const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = Number(process.env.PORT || 3001);
const DB_FILE = process.env.DB_FILE || "./requests.sqlite";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

// ---- Supabase Sync (pull reports from Supabase -> local sqlite) ----
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || "reports";
const SYNC_INTERVAL_SEC = Number(process.env.SYNC_INTERVAL_SEC || 10);
const SUPABASE_RETENTION_MIN = Number(process.env.SUPABASE_RETENTION_MIN || 60); // delete synced rows older than N minutes
const ADMIN_IDS = (process.env.ADMIN_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Optional routing by type: WIFI_ADMINS="id1,id2" etc.
function adminsForType(type) {
  const key = `${String(type || "").toUpperCase()}_ADMINS`;
  const env = process.env[key];
  const list = (env || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : ADMIN_IDS;
}

function supabaseRestUrl(path) {
  return `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`;
}

async function supabaseFetch(path, { method = "GET", query = "", body = null, headers = {} } = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  }
  const url = supabaseRestUrl(path) + (query ? `?${query}` : "");
  const res = await fetch(url, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  if (!res.ok) {
    const msg = typeof json === "string" ? json : JSON.stringify(json);
    throw new Error(`Supabase ${method} ${url} -> ${res.status}: ${msg}`);
  }
  return json;
}

// -------------------- Bot --------------------
if (!BOT_TOKEN || BOT_TOKEN === "PASTE_YOUR_TOKEN_HERE") {
  console.error("ОШИБКА: Токен бота не задан!");
  console.error("Добавьте токен в файл .env: BOT_TOKEN=ваш_токен_бота");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);
const seenUsers = new Set();

function getSearchKey(ctx) {
  // самый стабильный ключ для “следующего сообщения” — чат
  // (в MAX текст и кнопки чаще всего приходят в одном chat_id)
  return String(ctx?.chat_id || ctx?.from?.id || ctx?.user?.user_id || "");
}

const adminState = new Map(); 
// adminState.set(userId, { mode: "search" })

const SERVICE_TEXT =
  "Безопасный Севастополь — официальный сервис для приёма обращений жителей города.\n\n" +
  "Через мини-приложение вы можете:\n" +
  "• сообщить о подозрительных предметах, событиях и ситуациях, которые могут представлять угрозу безопасности;\n" +
  "• отправить обращение по системе видеонаблюдения «АРГУС»;\n" +
  "• найти ближайшие точки публичного Wi-Fi;\n" +
  "• сообщить о проблемах с работой Wi-Fi или предложить новую точку доступа;\n" +
  "• сообщить о граффити, надписях и изображениях, портящих облик города;\n" +
  "• оставить заявку на запись на приём в Департамент цифрового развития города Севастополя.\n\n" +
  "В обращениях можно указать адрес вручную или выбрать точку на карте.\n" +
  "Также доступно определение текущего местоположения.\n\n" +
  "Все обращения регистрируются и передаются ответственным специалистам.\n" +
  "Ответ будет направлен на указанный вами email.\n\n" +
  "Чтобы воспользоваться сервисом, перейдите в мини-приложение.\n" +
  "Кнопка для перехода находится внизу экрана и выделена синим цветом.";

async function getTicketNoById(id) {
  const rows = await dbAll(`SELECT ticket_no FROM reports WHERE id = ? LIMIT 1`, [id]);
  return rows.length ? rows[0].ticket_no : null;
}

function getUserId(ctx) {
  const id = ctx?.from?.id ?? ctx?.user?.user_id;
  return id ? String(id) : "";
}

function formatReportForAdmin(report) {
  const typeMap = {
    security: { title: "🛡 Обращение — Безопасность" },
    wifi: { title: "🌐 Обращение — Wi-Fi" },
    graffiti: { title: "🎨 Обращение — Граффити" },
    argus: { title: "📷 Обращение — Аргус" },
    appointment: { title: "📅 Обращение — Запись на приём" },
  };

  const statusMap = {
    new: "🆕 Новое",
    in_progress: "🛠 В работе",
    closed: "✅ Закрыто",
  };

  const p = report.payload || {};

  // --- вытаскиваем контакты из разных возможных ключей ---
  const name =
    p.name || p.fullName || p.fio || p.username || "";
  const phone =
    p.phone || p.tel || p.contactPhone || "";
  const email =
    p.email || p.mail || p.contactEmail || "";

  // --- время ---
  const rawTime = p.datetime || p.dateTime || report.created_at || report.timestamp || "";
  const timeLine = rawTime ? formatDateTimeHuman(rawTime) : "";
  
  // --- место: адрес / гео / оба ---
  const address = p.address || p.addr || p.locationAddress || "";
  const lat =
    p.lat ?? p.latitude ?? (p.geo && p.geo.lat);
  const lng =
    p.lng ?? p.longitude ?? (p.geo && p.geo.lng);

  const geoLine =
    (lat !== undefined && lng !== undefined)
      ? `📡 Геолокация: ${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`
      : "";

  // --- описание ---
  const description =
    p.description || p.problem || p.text || p.message || "";

  // --- медиа (пока только подсчёт по метаданным) ---
  const media = Array.isArray(p.media) ? p.media : [];
  const photos = media.filter((m) => String(m.type || "").startsWith("image/")).length;
  const videos = media.filter((m) => String(m.type || "").startsWith("video/")).length;

  // --- заголовки ---
  const header = (typeMap[report.type]?.title) || `📝 Обращение — ${String(report.type || "Другое")}`;
  const statusTitle = statusMap[report.status] || ""; // чтобы не показывать "undefined"

  const lines = [];

  lines.push(header);
  if (statusTitle) lines.push(`📊 Статус: ${statusTitle}`);
  lines.push(""); // пустая строка

  // Контакты
  if (name) lines.push(`👤 ${name}`);
  if (phone) lines.push(`📞 ${phone}`);
  if (email) lines.push(`✉️ ${email}`);
  if (name || phone || email) lines.push("");

  // Время
  if (timeLine) {
    lines.push(`🕒 ${timeLine}`);
    lines.push("");
  }

  // Для записи на приём — выбранная дата
  if (report.type === "appointment") {
    const apptDate = p.appointmentDate || p.appointment_date || p.date || p.selectedDate || p.visitDate || "";
    if (apptDate) {
      lines.push(`📅 Запись на дату: ${formatDateOnlyHuman(apptDate)}`);
      lines.push("");
    }
  }
  
  // Местоположение
  if (address || geoLine) {
    lines.push("📍 Местоположение:");
    if (address) lines.push(address);
    if (geoLine) lines.push(geoLine);
    lines.push("");
  }

  // Описание
  if (description) {
    lines.push("📝 Описание:");
    lines.push(description);
    lines.push("");
  }

  // Медиа
  if (photos || videos) {
    lines.push("📎 Медиа:");
    if (photos) lines.push(`📷 Фото (${photos})`);
    if (videos) lines.push(`🎥 Видео (${videos})`);
    lines.push("");
  }

  // ID (всегда)
  if (report.ticket_no) lines.push(`🆔 ${report.ticket_no}`);
  
  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

function isGlobalAdmin(ctx) {
  const uid = String(ctx.user?.user_id || ctx.from?.id || "");
  return uid && ADMIN_IDS.includes(uid);
}

function formatDateTimeHuman(isoOrAny) {
  // Если пришло ISO типа 2026-01-11T20:04:49.182678+00:00
  const d = new Date(isoOrAny);
  if (Number.isNaN(d.getTime())) return String(isoOrAny);

  const pad = (n) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const mon = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${hh}:${mm} ${day}.${mon}.${year}`;
}

function formatDateOnlyHuman(any) {
  const d = new Date(any);
  if (Number.isNaN(d.getTime())) return String(any);

  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function displayAdminName(ctx) {
  const u = ctx.user || ctx.from || {};
  return u.name || u.username || u.first_name || `ID ${u.user_id || u.id || "?"}`;
}

async function notifyStatusChange(ctx, reportId, newStatus) {
  const rows = await dbAll(`SELECT id, ticket_no, type FROM reports WHERE id = ? LIMIT 1`, [reportId]);
  if (!rows.length) return;

  const r = rows[0];
  const statusText = { in_progress: "взял(а) в работу", closed: "закрыл(а)" }[newStatus] || newStatus;
  const adminName = displayAdminName(ctx);

  // получатели: профильные + общий
  const targets = new Set([...adminsForType(r.type), ...ADMIN_IDS].map(String));

  // не слать самому себе
  const selfId = String(ctx.user?.user_id || ctx.from?.id || "");
  if (selfId) targets.delete(selfId);

  const msg = `🧑‍💼 ${adminName} ${statusText} обращение 🆔 ${r.ticket_no}`;

  for (const id of targets) {
    const uid = Number(id);
    if (!Number.isFinite(uid)) continue;
    try {
      await bot.api.sendMessageToUser(uid, msg);
    } catch (e) {
      const m = String(e.message || "");
      if (m.includes("403")) continue;
      console.error("notifyStatusChange error:", e.message);
    }
  }
}

bot.on("message_new", async (ctx) => {
  const t = (ctx.message?.text || "").trim();
  if (t) console.log("message_new:", t);
});

bot.on("bot_started", async (ctx) => {
  const userId = ctx.user?.user_id;
  const chatId = ctx.chat_id;

  if (userId && !seenUsers.has(userId)) seenUsers.add(userId);

  try {
    // админам — сразу меню, без простыней
    if (isBotAdmin(ctx)) {
      await sendAdminMenu(ctx);
      return;
    }

    // обычным — как было
    await ctx.reply(SERVICE_TEXT);
  } catch (error) {
    console.error("Ошибка при отправке:", error.message);
  }
});

bot.command("start", async (ctx) => {
  const userId = ctx.from?.id;
  if (userId && !seenUsers.has(userId)) seenUsers.add(userId);

  try {
    if (isBotAdmin(ctx)) {
      await sendAdminMenu(ctx);
      return;
    }

    await ctx.reply(SERVICE_TEXT);
  } catch (error) {
    console.error("Ошибка:", error.message);
  }
});

bot.command("id", async (ctx) => {
  const uid = ctx.user?.user_id || ctx.from?.id;
  await ctx.reply(`Ваш ID: ${uid ?? "не определён"}`);
});

// -------------------- Admin UI in bot --------------------
function isBotAdmin(ctx) {
  const uid = ctx.user?.user_id || ctx.from?.id;
  return uid && ADMIN_IDS.includes(String(uid));
}

async function sendAdminMenu(ctx) {
  const keyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback("🚨 Безопасность", "adm:type:security")],
    [Keyboard.button.callback("📶 Wi-Fi", "adm:type:wifi")],
    [Keyboard.button.callback("🎨 Граффити", "adm:type:graffiti")],
    [Keyboard.button.callback("📷 Аргус", "adm:type:argus")],
    [Keyboard.button.callback("📅 Запись", "adm:type:appointment")],
    [Keyboard.button.callback("📦 Все категории", "adm:type:all")],
  ]);
  await ctx.reply("Админ-панель. Выберите категорию:", { attachments: [keyboard] });
}

bot.action("adm:search:start", async (ctx) => {
  if (!isBotAdmin(ctx)) return;

  const key = getSearchKey(ctx);
  adminState.set(key, { mode: "search" });

  await ctx.reply(
    "🔎 Поиск\n\n" +
    "Напишите одним сообщением что искать: номер 🆔, имя, телефон, email или текст.\n" +
    "Для выхода из поиска - отмена"
  );
});

bot.action(/adm:type:(.+)/, async (ctx) => {
  if (!isBotAdmin(ctx)) return;
  const type = String(ctx.match?.[1] || "all");

  const kb = Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback("🆕 Новые", `adm:list:${type}:new:0`),
      Keyboard.button.callback("🛠 В работе", `adm:list:${type}:in_progress:0`),
      Keyboard.button.callback("✅ Закрытые", `adm:list:${type}:closed:0`),
    ],
  ]);

  await ctx.reply("Выберите статус:", { attachments: [kb] });
});

async function sendReportCard(ctx, id) {
  const rows = await dbAll(`SELECT * FROM reports WHERE id = ?`, [id]);
  if (!rows.length) return ctx.reply("Не найдено.");

  const r = rows[0];
  const payload = r.payload_json ? safeParse(r.payload_json) : null;
  const user = r.user_json ? safeParse(r.user_json) : null;

  const report = {
    id: r.id,
    type: r.type,
    subtype: r.subtype,
    status: r.status,
    created_at: r.timestamp,
    ticket_no: r.ticket_no,
    payload,
    user,
  };

  const text = formatReportForAdmin(report);

  // Кнопки зависят от статуса
  let kbRows = [];

  if (r.status === "new") {
    kbRows = [
      [Keyboard.button.callback(`✅ Взять в работу 🆔 ${r.ticket_no}`, `adm:take:${r.id}`)],
    ];
  } else if (r.status === "in_progress") {
    kbRows = [
      [Keyboard.button.callback(`🏁 Закрыть 🆔 ${r.ticket_no}`, `adm:close:${r.id}`)],
    ];
  } else if (r.status === "closed") {
    kbRows = [
      [Keyboard.button.callback(`🗑 Удалить 🆔 ${r.ticket_no}`, `adm:del:ask:${r.id}`)],
    ];
  } else {
    kbRows = [
      [Keyboard.button.callback(`🏁 Закрыть 🆔 ${r.ticket_no}`, `adm:close:${r.id}`)],
    ];
  }

  const kb = Keyboard.inlineKeyboard(kbRows);

  await ctx.reply(text, { attachments: [kb] });
}

bot.command("admin", async (ctx) => {
  if (!isBotAdmin(ctx)) return ctx.reply("Нет доступа.");
  return sendAdminMenu(ctx);
});

bot.action(/adm:list:([^:]+):([^:]+):(\d+)/, async (ctx) => {
  if (!isBotAdmin(ctx)) return;

  const type = String(ctx.match?.[1] || "all");
  const status = String(ctx.match?.[2] || "new");
  const page = Number(ctx.match?.[3] || 0);
  const pageSize = 10;
  const offset = page * pageSize;

  const statusTitle = { new: "🆕 Новые", in_progress: "🛠 В работе", closed: "✅ Закрытые" }[status] || status;
  const typeTitle = (t) => ({
    security: "🚨 Безопасность",
    wifi: "📶 Wi-Fi",
    graffiti: "🎨 Граффити",
    argus: "📷 Аргус",
    appointment: "📅 Запись",
    all: "📦 Все категории",
  }[t] || t);

  let where = "WHERE status = ?";
  const params = [status];

  if (type !== "all") {
    where += " AND type = ?";
    params.push(type);
  }

  const rowsPlus = await dbAll(
    `SELECT id,ticket_no,type,subtype,status,timestamp,payload_json
     FROM reports ${where}
     ORDER BY timestamp DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize + 1, offset]
  );
  
  const hasNext = rowsPlus.length > pageSize;
  const rows = rowsPlus.slice(0, pageSize);

  if (!rows.length) return ctx.reply("Пусто.");

  const lines = rows.map((r, i) => {
    const p = r.payload_json ? safeParse(r.payload_json) : null;
    const name = (p?.name || p?.fullName || p?.fio || p?.username || "").trim();
    const email = (p?.email || p?.mail || p?.contactEmail || "").trim();
    const dt = formatDateTimeHuman(r.timestamp);
  
    const parts = [];
    parts.push(`${offset + i + 1}. 🆔 ${r.ticket_no}`);
    if (name) parts.push(`👤 ${name}`);
    if (email) parts.push(`✉️ ${email}`);
    parts.push(`🕒 ${dt}`);
    return parts.join("\n");
  });

  const nav = [];
  if (page > 0) nav.push(Keyboard.button.callback("⬅️ Назад", `adm:list:${type}:${status}:${page - 1}`));
  if (hasNext) nav.push(Keyboard.button.callback("➡️ Далее", `adm:list:${type}:${status}:${page + 1}`));

  const kbRows = rows.map((r) => [
    Keyboard.button.callback(`👀 Открыть №${r.ticket_no ?? "?"}`, `adm:open:${r.id}`)
  ]);
  
  const kb = Keyboard.inlineKeyboard([
    ...kbRows,
    ...(nav.length ? [nav] : []),
  ]);

  await ctx.reply(`${typeTitle(type)} / ${statusTitle}\nСтраница: ${page + 1}\n\n${lines.join("\n\n")}`, { attachments: [kb] });
});

bot.action(/adm:open:(.+)/, async (ctx) => {
  if (!isBotAdmin(ctx)) return;
  const id = String(ctx.match?.[1] || "");
  if (!id) return;
  await sendReportCard(ctx, id);
});

async function setLocalStatus(id, status) {
  const updatedAt = new Date().toISOString();
  await dbRun(`UPDATE reports SET status = ?, updatedAt = ? WHERE id = ?`, [status, updatedAt, id]);
}

bot.action(/adm:take:(.+)/, async (ctx) => {
  if (!isBotAdmin(ctx)) return;
  const id = String(ctx.match?.[1] || "");
  if (!id) return;

  await setLocalStatus(id, "in_progress");
  await notifyStatusChange(ctx, id, "in_progress");
  const tno = await getTicketNoById(id);
  await ctx.reply(`✅ Взято в работу: 🆔 ${tno ?? "?"}`);
  await sendAdminMenu(ctx);
});

bot.action(/adm:close:(.+)/, async (ctx) => {
  if (!isBotAdmin(ctx)) return;
  const id = String(ctx.match?.[1] || "");
  if (!id) return;

  await setLocalStatus(id, "closed");
  await notifyStatusChange(ctx, id, "closed");
  const tno = await getTicketNoById(id);
  await ctx.reply(`🏁 Закрыто: 🆔 ${tno ?? "?"}`);
  await sendAdminMenu(ctx);
});

bot.action(/adm:del:ask:(.+)/, async (ctx) => {
  if (!isBotAdmin(ctx)) return;
  const id = String(ctx.match?.[1] || "");
  if (!id) return;

  const tno = await getTicketNoById(id);

  const kb = Keyboard.inlineKeyboard([
    [Keyboard.button.callback(`❌ Нет`, `adm:del:cancel:${id}`)],
    [Keyboard.button.callback(`✅ Да, удалить 🆔 ${tno ?? "?"}`, `adm:del:do:${id}`)],
  ]);

  await ctx.reply(`Удалить обращение 🆔 ${tno ?? "?"}?`, { attachments: [kb] });
});

bot.action(/adm:del:cancel:(.+)/, async (ctx) => {
  if (!isBotAdmin(ctx)) return;
  await ctx.reply("Ок, не удаляю.");
});

bot.action(/adm:del:do:(.+)/, async (ctx) => {
  if (!isBotAdmin(ctx)) return;
  const id = String(ctx.match?.[1] || "");
  if (!id) return;

  const tno = await getTicketNoById(id);

  await dbRun(`DELETE FROM reports WHERE id = ?`, [id]);
  await ctx.reply(`🗑 Удалено обращение 🆔 ${tno ?? "?"}`);
});

bot.on("message_created", async (ctx) => {
  const text = (ctx.message?.text || "").trim();
  if (!text) return;

  console.log("message_created:", { text, key: getSearchKey(ctx), state: adminState.get(getSearchKey(ctx)) });

  // команды не трогаем
  if (text.startsWith("/")) return;

  const key = getSearchKey(ctx);

  // если админ в режиме поиска — это запрос
  const st = adminState.get(key);
  if (st?.mode === "search" && isBotAdmin(ctx)) {
    const q = text;

    if (q.toLowerCase() === "отмена") {
      adminState.delete(key);
      await ctx.reply("Ок, поиск отменён.");
      await sendAdminMenu(ctx);
      return;
    }

    adminState.delete(key);

    await runSearchAndReply(ctx, q);
    await sendAdminMenu(ctx);
    return;
  }

  // админ — меню
  if (isBotAdmin(ctx)) {
    await sendAdminMenu(ctx);
    return;
  }

  // обычный пользователь — подсказка
  await ctx.reply(
    "Основные функции сервиса доступны в мини-приложении.\n\n" +
    "Перейдите в него по синей кнопке внизу экрана."
  );
});

bot.command("help", async (ctx) => {
  try {
    await ctx.reply(SERVICE_TEXT);
  } catch (error) {
    console.error("Ошибка:", error.message);
  }
});

bot.command("app", async (ctx) => {
  try {
    await ctx.reply(
      "Мини-приложение «Безопасный Севастополь».\n\n" +
      "Чтобы открыть сервис, нажмите на синюю кнопку внизу."
    );
  } catch (error) {
    console.error("Ошибка:", error.message);
  }
});

bot.catch((error, ctx) => {
  console.error("Ошибка в боте:", error);
  if (ctx && ctx.chat) {
    ctx.reply("Произошла ошибка. Попробуйте позже.").catch(() => {});
  }
});

// -------------------- SQLite --------------------
const dbPath = path.resolve(process.cwd(), DB_FILE);
const db = new sqlite3.Database(dbPath);

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}


async function upsertLocalReport(report) {

  const exists = await dbAll(`SELECT ticket_no FROM reports WHERE id = ? LIMIT 1`, [String(report.id)]);
  const currentTicket = exists.length ? exists[0].ticket_no : null;
  const ticketNo = currentTicket || (await nextTicketNo());
  
  const row = {
    id: String(report.id),
    type: String(report.type),
    subtype: report.subtype ? String(report.subtype) : "",
    status: report.status ? String(report.status) : "new",
    timestamp: String(report.timestamp || report.created_at || new Date().toISOString()),
    updatedAt: String(report.updatedAt || report.timestamp || report.created_at || new Date().toISOString()),
    user_json: report.user ? JSON.stringify(report.user) : null,
    payload_json: report.payload ? JSON.stringify(report.payload) : null,
    ticket_no: ticketNo,
  };

  // SQLite UPSERT
  await dbRun(
    `INSERT INTO reports (id,type,subtype,status,timestamp,updatedAt,user_json,payload_json, ticket_no)
     VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       type=excluded.type,
       subtype=excluded.subtype,
       status=excluded.status,
       timestamp=excluded.timestamp,
       updatedAt=excluded.updatedAt,
       user_json=excluded.user_json,
       payload_json=excluded.payload_json`,
    [row.id, row.type, row.subtype, row.status, row.timestamp, row.updatedAt, row.user_json, row.payload_json, row.ticket_no]
  );
  return row;
}

function formatReportShort(r) {
  const p = r.payload || {};
  const title = p.title || p.problem || p.text || "";
  const addr = p.address || p.addr || "";
  return [
    `🆕 Новое обращение: ${r.type}${r.subtype ? "/" + r.subtype : ""}`,
    `ID: ${r.id}`,
    addr ? `Адрес: ${addr}` : "",
    title ? `Текст: ${String(title).slice(0, 400)}` : "",
    `Время: ${r.timestamp}`,
  ].filter(Boolean).join("\n");
}

async function notifyAdmins(report) {
  const ids = adminsForType(report.type);
  if (!ids.length) return;

  const p = report.payload || {};
  const name = (p.name || p.fullName || p.fio || p.username || "пользователя").trim();

  const keyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback("👀 Открыть", `adm:open:${report.id}`)],
  ]);

  const text = `📩 Поступило новое обращение от ${name}`;

  for (const id of ids) {
    const userId = Number(id);
    if (!Number.isFinite(userId)) continue;
    try {
      await bot.api.sendMessageToUser(userId, text, { attachments: [keyboard] });
    } catch (e) {
      const msg = String(e.message || "");
      if (msg.includes("403")) continue;
      console.error("notifyAdmins error:", e.message);
    }
  }
}

async function pullFromSupabaseOnce() {
  // 1) взять новые
  const rows = await supabaseFetch(SUPABASE_TABLE, {
    method: "GET",
    query: "select=*&sync_status=eq.new&order=created_at.asc&limit=50",
  });

  if (!Array.isArray(rows) || rows.length === 0) return 0;

  for (const r of rows) {
    // 2) пометить processing (чтобы не схватить дважды, если будет второй воркер)
    try {
      await supabaseFetch(SUPABASE_TABLE, {
        method: "PATCH",
        query: `id=eq.${encodeURIComponent(r.id)}`,
        headers: { Prefer: "return=minimal" },
        body: { sync_status: "processing", processing_at: new Date().toISOString() },
      });
    } catch (e) {
      console.error("mark processing failed:", e.message);
      continue;
    }

    // 3) сохранить локально
    try {
      const local = await upsertLocalReport({
        ...r,
        timestamp: r.timestamp || r.created_at,
        updatedAt: r.updated_at || r.created_at,
      });

      // 4) уведомить админов
      await notifyAdmins({
        id: local.id,
        ticket_no: local.ticket_no,
        type: local.type,
        subtype: local.subtype,
        status: local.status,            
        created_at: local.timestamp,     
        payload: r.payload ?? (r.payload_json ? JSON.parse(r.payload_json) : null),
        user: r.user ?? null,
      });        

      // 5) пометить synced
      await supabaseFetch(SUPABASE_TABLE, {
        method: "PATCH",
        query: `id=eq.${encodeURIComponent(r.id)}`,
        headers: { Prefer: "return=minimal" },
        body: { sync_status: "synced", synced_at: new Date().toISOString() },
      });
    } catch (e) {
      console.error("sync one report failed:", e.message);
      try {
        await supabaseFetch(SUPABASE_TABLE, {
          method: "PATCH",
          query: `id=eq.${encodeURIComponent(r.id)}`,
          headers: { Prefer: "return=minimal" },
          body: { sync_status: "failed", last_error: String(e.message).slice(0, 800) },
        });
      } catch (_) {}
    }
  }

  return rows.length;
}

async function cleanupSupabaseOnce() {
  if (!SUPABASE_RETENTION_MIN || SUPABASE_RETENTION_MIN < 1) return 0;
  const cutoff = new Date(Date.now() - SUPABASE_RETENTION_MIN * 60 * 1000).toISOString();

  // сначала получим ids на удаление
  const rows = await supabaseFetch(SUPABASE_TABLE, {
    method: "GET",
    query: `select=id&sync_status=eq.synced&synced_at=lt.${encodeURIComponent(cutoff)}&limit=200`,
  });

  if (!Array.isArray(rows) || rows.length === 0) return 0;

  // удаляем пачкой через OR: id=in.(...)
  const ids = rows.map((x) => x.id).filter(Boolean);
  const inList = ids.map((x) => `"${String(x).replace(/"/g, '\"')}"`).join(",");
  await supabaseFetch(SUPABASE_TABLE, {
    method: "DELETE",
    query: `id=in.(${encodeURIComponent(inList)})`,
    headers: { Prefer: "return=minimal" },
  });
  return ids.length;
}

function startSupabaseSyncLoops() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("Supabase sync disabled: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
    return;
  }
  // Pull loop
  setInterval(async () => {
    try {
      await pullFromSupabaseOnce();
    } catch (e) {
      console.error("pullFromSupabaseOnce error:", e.message);
    }
  }, Math.max(2, SYNC_INTERVAL_SEC) * 1000);

  // Cleanup loop (раз в 10 минут)
  setInterval(async () => {
    try {
      const deleted = await cleanupSupabaseOnce();
      if (deleted) console.log(`Supabase cleanup deleted: ${deleted}`);
    } catch (e) {
      console.error("cleanupSupabaseOnce error:", e.message);
    }
  }, 10 * 60 * 1000);
}
async function initDb() {
  await dbRun(`PRAGMA journal_mode=WAL;`);
  await dbRun(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      subtype TEXT,
      status TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      user_json TEXT,
      payload_json TEXT,
      ticket_no INTEGER
    );
  `);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_reports_type_time ON reports(type, timestamp);`);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS counters (
      name TEXT PRIMARY KEY,
      value INTEGER NOT NULL
    );
  `);

  await dbRun(`CREATE INDEX IF NOT EXISTS idx_reports_ticket_no ON reports(ticket_no);`);
}

async function nextTicketNo() {
  // гарантируем строку счётчика
  await dbRun(`INSERT OR IGNORE INTO counters (name, value) VALUES ('ticket_no', 0)`);

  // атомарно увеличиваем
  await dbRun(`UPDATE counters SET value = value + 1 WHERE name = 'ticket_no'`);

  // читаем новое значение
  const rows = await dbAll(`SELECT value FROM counters WHERE name = 'ticket_no'`);
  return Number(rows?.[0]?.value || 0);
}

// -------------------- Express API --------------------
const app = express();
app.use(express.json({ limit: "1mb" }));

// CORS (без доп. библиотек)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Token");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/health", (req, res) => res.json({ ok: true }));

function requireAdmin(req, res, next) {
  // ВАЖНО: список заявок обычно тоже админский
  // Если хочешь сделать GET публичным — просто убери requireAdmin на GET ниже.
  if (!ADMIN_TOKEN) return res.status(500).json({ ok: false, error: "ADMIN_TOKEN not set" });
  const token = req.get("X-Admin-Token") || "";
  if (token !== ADMIN_TOKEN) return res.status(401).json({ ok: false, error: "unauthorized" });
  next();
}

// 1) Создать обращение (вызывается mini-app пользователем)
app.post("/api/reports", async (req, res) => {
  try {
    const report = req.body?.report || req.body; // принимаем и {report:{...}} и просто {...}
    if (!report || !report.id || !report.type || !report.timestamp) {
      return res.status(400).json({ ok: false, error: "bad report payload" });
    }

    const row = {
      id: String(report.id),
      type: String(report.type),
      subtype: report.subtype ? String(report.subtype) : "",
      status: report.status ? String(report.status) : "new",
      timestamp: String(report.timestamp),
      updatedAt: String(report.updatedAt || report.timestamp),
      user_json: report.user ? JSON.stringify(report.user) : null,
      payload_json: report.payload ? JSON.stringify(report.payload) : null
    };

    // INSERT OR IGNORE чтобы повторная отправка не дублила (по id)
    await dbRun(
      `INSERT OR IGNORE INTO reports (id,type,subtype,status,timestamp,updatedAt,user_json,payload_json)
       VALUES (?,?,?,?,?,?,?,?)`,
      [row.id, row.type, row.subtype, row.status, row.timestamp, row.updatedAt, row.user_json, row.payload_json]
    );

    res.json({ ok: true, id: row.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "server error" });
  }
});

// 2) Прочитать обращения (админка)
// Если хочешь — можно убрать requireAdmin и читать без токена, но я не советую.
app.get("/api/reports", requireAdmin, async (req, res) => {
  try {
    const type = String(req.query.type || "").trim(); // security/wifi/graffiti/argus/appointment
    const limit = Math.min(Number(req.query.limit || 200), 500);
    const offset = Math.max(Number(req.query.offset || 0), 0);

    const where = type ? "WHERE type = ?" : "";
    const params = type ? [type, limit, offset] : [limit, offset];

    const rows = await dbAll(
      `SELECT * FROM reports ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
      params
    );

    const list = rows.map((r) => ({
      id: r.id,
      type: r.type,
      subtype: r.subtype || "",
      status: r.status,
      timestamp: r.timestamp,
      updatedAt: r.updatedAt,
      user: r.user_json ? safeParse(r.user_json) : null,
      payload: r.payload_json ? safeParse(r.payload_json) : null
    }));

    res.json({ ok: true, list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "server error" });
  }
});

// 3) Поменять статус (админка)
app.patch("/api/reports/:id/status", requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || "");
    const status = String(req.body?.status || "").trim();
    if (!id || !status) return res.status(400).json({ ok: false, error: "bad params" });

    const updatedAt = new Date().toISOString();
    const result = await dbRun(
      `UPDATE reports SET status = ?, updatedAt = ? WHERE id = ?`,
      [status, updatedAt, id]
    );

    res.json({ ok: true, changed: result.changes || 0, updatedAt });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "server error" });
  }
});

function safeParse(s) {
  try { return JSON.parse(s); } catch (_) { return null; }
}

async function runSearchAndReply(ctx, q) {
  const uid = getUserId(ctx);
  const isGlobal = ADMIN_IDS.includes(uid);

  let typeFilter = null;
  if (!isGlobal) {
    const possibleTypes = ["security", "wifi", "graffiti", "argus", "appointment"];
    const myTypes = possibleTypes.filter((t) => {
      const env = process.env[`${t.toUpperCase()}_ADMINS`] || "";
      return env.split(",").map(s => s.trim()).filter(Boolean).includes(uid);
    });
    if (myTypes.length) typeFilter = myTypes;
  }

  const like = `%${q}%`;

  let where = `
    (
      CAST(ticket_no AS TEXT) = ?
      OR id LIKE ?
      OR payload_json LIKE ?
      OR user_json LIKE ?
    )
  `;
  const params = [String(q), like, like, like];

  if (typeFilter && typeFilter.length) {
    where = `(${where}) AND type IN (${typeFilter.map(() => "?").join(",")})`;
    params.push(...typeFilter);
  }

  const rows = await dbAll(
    `SELECT id, ticket_no, type, status, timestamp, payload_json
     FROM reports
     WHERE ${where}
     ORDER BY timestamp DESC
     LIMIT 10`,
    params
  );

  if (!rows.length) {
    await ctx.reply("Ничего не найдено.");
    return;
  }

  const statusTitle = (s) => ({ new: "🆕 Новое", in_progress: "🛠 В работе", closed: "✅ Закрыто" }[s] || s);

  const lines = rows.map((r, i) => {
    const p = r.payload_json ? safeParse(r.payload_json) : null;
    const name = (p?.name || p?.fullName || p?.fio || p?.username || "").trim();
    const email = (p?.email || p?.mail || p?.contactEmail || "").trim();
    const dt = formatDateTimeHuman(r.timestamp);

    const parts = [];
    parts.push(`${i + 1}. 🆔 ${r.ticket_no} — ${statusTitle(r.status)}`);
    if (name) parts.push(`👤 ${name}`);
    if (email) parts.push(`✉️ ${email}`);
    parts.push(`🕒 ${dt}`);
    return parts.join("\n");
  });

  const kb = Keyboard.inlineKeyboard(
    rows.map((r) => [Keyboard.button.callback(`👀 Открыть 🆔 ${r.ticket_no}`, `adm:open:${r.id}`)])
  );

  await ctx.reply(`Результаты поиска (до 10):\n\n${lines.join("\n\n")}`, { attachments: [kb] });
}

// -------------------- Start everything --------------------
(async () => {
  await initDb();
  startSupabaseSyncLoops();

  app.listen(PORT, () => {
    console.log(`[API] listening on http://0.0.0.0:${PORT}`);
    console.log(`[DB]  file: ${dbPath}`);
  });

  console.log("Запуск бота...");
  bot.start()
    .then(() => console.log("Бот запущен"))
    .catch((error) => {
      console.error("Не удалось запустить бота:", error);
      process.exit(1);
    });
})();

// Завершение
process.once("SIGINT", () => {
  console.log("Остановка...");
  try { db.close(); } catch (_) {}
  process.exit(0);
});
process.once("SIGTERM", () => {
  console.log("Остановка...");
  try { db.close(); } catch (_) {}
  process.exit(0);
});
