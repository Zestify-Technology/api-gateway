// Modul untuk kirim pesan balasan ke customer lewat Kirimdev API

const KIRIMDEV_API_KEY = process.env.KIRIMDEV_API_KEY; // format: kdv_live_...
const KIRIMDEV_PHONE_ID = process.env.KIRIMDEV_PHONE_ID;

async function sendWhatsAppMessage(toNumber, text) {
  const url = `https://api.kirimdev.com/v1/phone-numbers/${KIRIMDEV_PHONE_ID}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KIRIMDEV_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: toNumber,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal kirim pesan ke Kirimdev: ${res.status} ${errText}`);
  }

  return res.json();
}

module.exports = { sendWhatsAppMessage };
