// Route: POST /api/webhook
// Ini yang didaftarkan sebagai Webhook URL di Dashboard Kirimdev.
//
// PENTING: butuh raw body buat verifikasi HMAC, jadi route ini pakai
// express.raw() sendiri, bukan express.json() global.

const express = require("express");
const { verifyWebhookSignature } = require("../lib/verify-webhook");
const { appendHistory } = require("../lib/history");
const { generateReply } = require("../lib/groq");
const { sendWhatsAppMessage } = require("../lib/kirimdev");

const router = express.Router();

const WEBHOOK_SECRET_CURRENT = process.env.KIRIMDEV_WEBHOOK_SECRET_CURRENT;
const WEBHOOK_SECRET_PREVIOUS = process.env.KIRIMDEV_WEBHOOK_SECRET_PREVIOUS; // opsional, buat rotasi secret

router.post("/", express.raw({ type: "*/*" }), async (req, res) => {
  const rawBody = req.body.toString("utf8");

  // 1) Verifikasi signature webhook
  try {
    verifyWebhookSignature(
      rawBody,
      req.headers["x-kirim-signature"],
      [WEBHOOK_SECRET_CURRENT, WEBHOOK_SECRET_PREVIOUS]
    );
  } catch (err) {
    console.error("Webhook signature invalid:", err.message);
    return res.status(401).json({ error: "Invalid signature" });
  }

  const payload = JSON.parse(rawBody);
  const eventType = req.headers["x-kirim-event"];

  // 2) Kita cuma proses event pesan masuk
  if (eventType !== "message.received") {
    return res.status(200).json({ ok: true, skipped: eventType });
  }

  try {
    console.log("Payload webhook diterima:", JSON.stringify(payload, null, 2));

    const fromNumber = payload.from || payload.data?.from;
    const messageText =
      payload.text?.body || payload.data?.text?.body || payload.message;

    if (!fromNumber || !messageText) {
      console.warn("Tidak bisa ekstrak nomor/isi pesan dari payload, cek struktur di atas.");
      return res.status(200).json({ ok: true, warning: "unrecognized payload shape" });
    }

    // 3) Simpan pesan user ke history, ambil history lengkap
    const history = await appendHistory(fromNumber, "user", messageText);

    // 4) Generate balasan dari Groq (bisa manggil tool di tengah jalan)
    const replyText = await generateReply(history);

    // 5) Simpan balasan AI ke history juga
    await appendHistory(fromNumber, "assistant", replyText);

    // 6) Kirim balasan ke customer via Kirimdev
    await sendWhatsAppMessage(fromNumber, replyText);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Gagal proses pesan:", err);
    return res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
