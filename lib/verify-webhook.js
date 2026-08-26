// Verifikasi signature webhook Kirimdev (format Stripe-style)
// Header: X-Kirim-Signature: t=<timestamp>,v1=<hex>,v1=<hex>...
// Docs: https://kirimdev.com/features/webhooks/

const crypto = require("crypto");

const MAX_TIMESTAMP_SKEW_SECONDS = 5 * 60; // 5 menit, sama seperti default Kirimdev

function verifyWebhookSignature(rawBody, signatureHeader, secrets) {
  if (!signatureHeader) {
    throw new Error("Header X-Kirim-Signature tidak ada");
  }

  const parts = signatureHeader.split(",").reduce((acc, part) => {
    const [key, value] = part.split("=");
    if (key === "t") {
      acc.timestamp = value;
    } else if (key === "v1") {
      acc.signatures.push(value);
    }
    return acc;
  }, { timestamp: null, signatures: [] });

  if (!parts.timestamp || parts.signatures.length === 0) {
    throw new Error("Format X-Kirim-Signature tidak valid");
  }

  // Cek replay attack: timestamp gak boleh terlalu lama
  const now = Math.floor(Date.now() / 1000);
  const skew = Math.abs(now - parseInt(parts.timestamp, 10));
  if (skew > MAX_TIMESTAMP_SKEW_SECONDS) {
    throw new Error("Timestamp webhook kadaluarsa (kemungkinan replay attack)");
  }

  const signedPayload = `${parts.timestamp}.${rawBody}`;

  const isValid = secrets.some((secret) => {
    if (!secret) return false;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(signedPayload)
      .digest("hex");

    return parts.signatures.some((sig) => {
      try {
        return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
      } catch {
        return false; // panjang beda -> otomatis gak cocok
      }
    });
  });

  if (!isValid) {
    throw new Error("Signature webhook tidak cocok / tidak valid");
  }

  return true;
}

module.exports = { verifyWebhookSignature };
