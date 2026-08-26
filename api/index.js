// Entry point khusus Vercel. Vercel treat setiap file di /api sebagai
// serverless function — di sini kita cuma re-export Express app dari
// server.js (yang gak manggil listen() pas di-import kayak gini).
module.exports = require("../server");
