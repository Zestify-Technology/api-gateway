// Entry point API gateway.
// Nambah endpoint baru? Bikin route baru di /routes lalu app.use() di sini.

require("dotenv").config();

const express = require("express");
const webhookRouter = require("./routes/webhook");

const app = express();

app.get("/", (req, res) => {
  res.json({ ok: true, service: "wa-ai-bot gateway" });
});

app.use("/api/webhook", webhookRouter);

// Tambah route baru di sini, contoh:
// const notifRouter = require("./routes/notif");
// app.use("/api/notif", notifRouter);

// Vercel jalanin file ini sebagai serverless function (import `app`),
// jadi listen() cuma jalan kalau di-run langsung (lokal / server sendiri).
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`wa-ai-bot gateway jalan di http://localhost:${PORT}`);
  });
}

module.exports = app;
