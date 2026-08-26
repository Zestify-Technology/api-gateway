// Modul untuk simpan & ambil riwayat chat per nomor customer, pakai Vercel KV.
// Setiap nomor WA customer punya key sendiri: chat:{nomor}
// History disimpan maksimal MAX_MESSAGES terakhir supaya konteks tidak kepanjangan.

const { kv } = require("@vercel/kv");

const MAX_MESSAGES = 20; // ~10 pasang tanya-jawab terakhir
const HISTORY_TTL_SECONDS = 60 * 60 * 24 * 3; // history auto-hapus setelah 3 hari idle

function keyFor(phoneNumber) {
  return `chat:${phoneNumber}`;
}

async function getHistory(phoneNumber) {
  const data = await kv.get(keyFor(phoneNumber));
  return data || [];
}

async function appendHistory(phoneNumber, role, content) {
  const history = await getHistory(phoneNumber);
  history.push({ role, content });

  // Potong supaya tidak kepanjangan
  const trimmed = history.slice(-MAX_MESSAGES);

  await kv.set(keyFor(phoneNumber), trimmed, { ex: HISTORY_TTL_SECONDS });
  return trimmed;
}

module.exports = { getHistory, appendHistory };
