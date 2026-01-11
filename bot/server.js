const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const { Bot } = require("@maxhub/max-bot-api");
require("dotenv").config();

// -------------------- Config --------------------
const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = Number(process.env.PORT || 3001);
const DB_FILE = process.env.DB_FILE || "./requests.sqlite";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

// -------------------- Bot (ваш код почти без изменений) --------------------
if (!BOT_TOKEN || BOT_TOKEN === "PASTE_YOUR_TOKEN_HERE") {
  console.error("ОШИБКА: Токен бота не задан!");
  console.error("Добавьте токен в файл .env: BOT_TOKEN=ваш_токен_бота");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);
const seenUsers = new Set();

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

bot.on("bot_started", async (ctx) => {
  const userId = ctx.user?.user_id;
  const chatId = ctx.chat_id;

  if (userId && !seenUsers.has(userId)) seenUsers.add(userId);

  try {
    await ctx.reply(SERVICE_TEXT);
    console.log(`Ответ на кнопку "Начать" отправлен в чат ${chatId}`);
  } catch (error) {
    console.error("Ошибка при отправке:", error.message);
  }
});

bot.command("start", async (ctx) => {
  const userId = ctx.from?.id;
  if (userId && !seenUsers.has(userId)) seenUsers.add(userId);

  try {
    await ctx.reply(SERVICE_TEXT);
    console.log(`Команда /start от пользователя ${userId}`);
  } catch (error) {
    console.error("Ошибка:", error.message);
  }
});

bot.on("message_created", async (ctx) => {
  const messageText = ctx.message?.text;

  if (messageText && messageText.startsWith("/")) return;

  try {
    await ctx.reply(
      "Основные функции сервиса доступны в мини-приложении.\n\n" +
      "Перейдите в него по синей кнопке внизу экрана."
    );
  } catch (error) {
    console.error("Ошибка:", error.message);
  }
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
      payload_json TEXT
    );
  `);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_reports_type_time ON reports(type, timestamp);`);
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

// -------------------- Start everything --------------------
(async () => {
  await initDb();

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
