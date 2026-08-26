# WA AI Bot — Auto Reply 24 Jam (Kirimdev + Claude + Vercel)

Bot admin WhatsApp otomatis pakai AI. Terima pesan lewat webhook Kirimdev,
generate balasan pakai Claude, kirim balik otomatis.

## Struktur project

```
wa-ai-bot/
├── api/
│   └── webhook.js        ← endpoint yang didaftarkan ke Kirimdev
├── lib/
│   ├── system-prompt.js  ← EDIT INI: isi info bisnis kamu
│   ├── claude.js         ← panggil Claude API
│   ├── kirimdev.js       ← kirim balasan WA
│   ├── history.js        ← simpan riwayat chat (Vercel KV)
│   └── verify-webhook.js ← verifikasi keamanan webhook
├── package.json
└── .env.example
```

## Setup step-by-step

### 1. Isi system prompt sesuai bisnis kamu
Buka `lib/system-prompt.js`, edit bagian `[NAMA BISNIS KAMU]`, layanan, area,
jam operasional, dan skema harga. Ini bagian paling penting — kualitas
jawaban AI sangat tergantung dari sini.

### 2. Install dependencies
```bash
cd wa-ai-bot
npm install
npm install -g vercel   # kalau belum ada Vercel CLI
```

### 3. Buat project di Vercel & connect KV
```bash
vercel login
vercel link
```
Lalu di **Vercel Dashboard > Storage**, buat **KV database** baru dan
connect ke project ini. Env variable `KV_*` akan otomatis terisi.

### 4. Isi Environment Variables
Di Vercel Dashboard > Settings > Environment Variables, isi:
- `KIRIMDEV_API_KEY` — dari Kirimdev Dashboard > Developers > API Keys
- `KIRIMDEV_PHONE_ID` — dari Kirimdev Dashboard > WhatsApp > Accounts
- `KIRIMDEV_WEBHOOK_SECRET_CURRENT` — signing secret webhook (dikasih saat
  kamu daftarkan webhook di step 6)
- `ANTHROPIC_API_KEY` — dari console.anthropic.com

(Bisa juga isi lokal dulu di file `.env` buat testing, copy dari `.env.example`)

### 5. Deploy
```bash
vercel --prod
```
Kamu akan dapat URL, misal: `https://wa-ai-bot-kamu.vercel.app`

### 6. Daftarkan webhook di Kirimdev
Di Kirimdev Dashboard > Webhooks, tambahkan endpoint:
```
https://wa-ai-bot-kamu.vercel.app/api/webhook
```
Subscribe ke event `message.received`. Kirimdev akan kasih signing secret —
masukkan itu ke env var `KIRIMDEV_WEBHOOK_SECRET_CURRENT`, lalu redeploy
(`vercel --prod`) supaya env baru terpakai.

### 7. Test
Chat ke nomor WA bisnis kamu dari HP lain. Cek:
- Balasan AI muncul di WA
- Kalau ada masalah, cek log di `vercel logs` atau tab **Logs** di dashboard
  Vercel — ada `console.log` payload webhook untuk bantu debug

## Catatan penting

- **Struktur payload webhook**: kode di `api/webhook.js` menebak struktur
  payload `message.received` berdasarkan dokumentasi umum Kirimdev. Saat
  testing pertama kali, cek log payload asli (sudah ada `console.log`
  bawaan) dan sesuaikan path field `fromNumber`/`messageText` kalau ternyata
  strukturnya beda dari yang diasumsikan di kode.
- **Biaya**: Kirimdev charge biaya platform bulanan (lihat kirimdev.com/pricing).
  Kirim pesan dalam window 24 jam gratis dari Meta; template pesan (marketing/
  utility) ditagih terpisah oleh Meta.
- **Handoff ke admin manusia**: saat ini bot akan selalu balas otomatis.
  Kalau mau ada kondisi "berhenti auto-reply kalau admin sudah ambil alih",
  itu perlu logic tambahan (misal cek status chat di Kirimdev inbox) — bilang
  aja kalau kamu butuh fitur ini, bisa ditambahkan.
- **Rate limit / biaya AI**: setiap pesan masuk = 1 API call ke Claude.
  Pantau penggunaan di console.anthropic.com biar gak kaget tagihan.
