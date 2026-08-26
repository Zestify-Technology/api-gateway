// CONTOH TOOL — hapus/ganti sesuai kebutuhan bisnis kamu.
// File diawali "_" biar gampang dibedain dari tool asli, tapi tetap ke-load.
// Nama file bebas, yang penting field "name" di bawah unik.

module.exports = {
  name: "cek_harga_layanan",
  description:
    "Cek harga untuk satu jenis layanan yang ditawarkan bisnis. Panggil ini kalau customer nanya harga spesifik.",

  // JSON Schema untuk parameter — ini yang dibaca model buat tau argumen apa yang harus dikirim
  parameters: {
    type: "object",
    properties: {
      layanan: {
        type: "string",
        description: "Nama layanan yang ditanyakan, misal 'service AC' atau 'cuci sofa'",
      },
    },
    required: ["layanan"],
  },

  // Fungsi asli yang jalan waktu tool dipanggil model.
  // Ganti isinya dengan query ke database/API kamu.
  async execute({ layanan }) {
    const daftarHarga = {
      "service ac": "Rp 150.000 - Rp 300.000 tergantung jenis AC",
      "cuci sofa": "Rp 100.000 per meter",
    };

    const key = layanan.toLowerCase();
    const harga = daftarHarga[key];

    if (!harga) {
      return { ditemukan: false, pesan: `Harga untuk "${layanan}" belum ada di data, arahkan ke admin.` };
    }

    return { ditemukan: true, layanan, harga };
  },
};
