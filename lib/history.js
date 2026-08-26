// Modul untuk simpan & ambil riwayat chat per nomor customer, pakai Upstash Redis.
// Setiap nomor WA customer punya key sendiri: chat:{nomor}
// History disimpan maksimal MAX_MESSAGES terakhir supaya konteks tidak kepanjangan.

const { Redis } = require("@upstash/redis");

// Inisialisasi client (otomatis membaca UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN
// atau KV_REST_API_URL & KV_REST_API_TOKEN dari Environment Variables Vercel)
const redis = Redis.fromEnv();

const MAX_MESSAGES = 20; // ~10 pasang tanya-jawab terakhir
const HISTORY_TTL_SECONDS = 60 * 60 * 24 * 3; // history auto-hapus setelah 3 hari idle

function keyFor(phoneNumber) {
  return `chat:${phoneNumber}`;
}

async function getHistory(phoneNumber) {
  const data = await redis.get(keyFor(phoneNumber));
  return data || [];
}

async function appendHistory(phoneNumber, role, content) {
  const history = await getHistory(phoneNumber);
  history.push({ role, content });

  // Potong supaya tidak kepanjangan
  const trimmed = history.slice(-MAX_MESSAGES);

  // Set nilai baru dengan Opsi TTL (ex = expire in seconds)
  await redis.set(keyFor(phoneNumber), trimmed, { ex: HISTORY_TTL_SECONDS });
  return trimmed;
}

module.exports = { getHistory, appendHistory };
