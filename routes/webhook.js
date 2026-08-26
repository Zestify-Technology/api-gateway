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

/**
 * Ekstrak pesan masuk dari payload webhook Kirimdev.
 *
 * Struktur asli mengikuti format WhatsApp Cloud API, nested di dalam
 * entry[].changes[].value, PLUS ada objek tambahan "kirim" di root
 * yang berisi metadata dari sisi platform Kirimdev (contact_id,
 * conversation_id, dll).
 *
 * Return null kalau payload tidak berisi pesan teks yang bisa diproses
 * (misalnya event status delivered/read, atau tipe pesan non-teks
 * seperti image/audio/sticker).
 */
function extractIncomingMessage(payload) {
  const value = payload?.entry?.[0]?.changes?.[0]?.value;
  const msg = value?.messages?.[0];

  if (!msg) {
    // Bisa jadi ini event status (sent/delivered/read), bukan pesan masuk.
    // Belum kita proses sekarang, jadi return null saja.
    return null;
  }

  // Untuk sekarang cuma handle pesan bertipe teks.
  // Tipe lain (image, audio, sticker, reaction, dll) belum di-support.
  if (msg.type !== "text" || !msg.text?.body) {
    return null;
  }

  return {
    fromNumber: msg.from, // format: "6288289158984", tanpa "+"
    messageText: msg.text.body,
    profileName: value?.contacts?.[0]?.profile?.name,
    messageId: msg.id,
    timestamp: msg.timestamp,
    // metadata tambahan dari objek "kirim", kalau perlu dipakai nanti
    conversationId: payload?.kirim?.conversation_id,
    contactId: payload?.kirim?.contact_id,
  };
}

router.post("/", express.raw({ type: "*/*" }), async (req, res) => {
  const rawBody = req.body.toString("utf8");

  // 1) Verifikasi signature webhook
  try {
    verifyWebhookSignature(rawBody, req.headers["x-kirim-signature"], [
      WEBHOOK_SECRET_CURRENT,
      WEBHOOK_SECRET_PREVIOUS,
    ]);
  } catch (err) {
    console.error("Webhook signature invalid:", err.message);
    return res.status(401).json({ error: "Invalid signature" });
  }

  const payload = JSON.parse(rawBody);
  const eventType = req.headers["x-kirim-event"];

  // 2) Cuma proses event pesan masuk
  if (eventType !== "message.received") {
    return res.status(200).json({ ok: true, skipped: eventType });
  }

  const extracted = extractIncomingMessage(payload);
  if (!extracted) {
    return res
      .status(200)
      .json({ ok: true, warning: "unsupported payload shape" });
  }

  // Acknowledgment langsung ke Kirimdev agar webhook tidak timeout
  res.status(200).json({ ok: true });

  // 3) Proses pesan secara asinkron di background
  (async () => {
    try {
      const { fromNumber, messageText } = extracted;

      const history = await appendHistory(fromNumber, "user", messageText);
      const replyText = await generateReply(history);
      await appendHistory(fromNumber, "assistant", replyText);
      await sendWhatsAppMessage(fromNumber, replyText);
    } catch (err) {
      console.error("Gagal proses pesan di background:", err);
    }
  })();
});
module.exports = router;
