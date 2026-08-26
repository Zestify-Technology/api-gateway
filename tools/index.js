// Registry tool untuk function calling.
//
// CARA NAMBAH TOOL BARU:
// 1. Bikin file baru di folder ini, misal `tools/cek-stok.js`
// 2. Ikuti format contoh di `tools/_contoh-cek-harga.js`
// 3. Selesai — file otomatis ke-load, gak perlu daftarin manual di sini.

const fs = require("fs");
const path = require("path");

const IGNORED_FILES = ["index.js"];

function loadTools() {
  const files = fs
    .readdirSync(__dirname)
    .filter((f) => f.endsWith(".js") && !IGNORED_FILES.includes(f));

  const tools = new Map();

  for (const file of files) {
    const tool = require(path.join(__dirname, file));

    if (!tool?.name || typeof tool.execute !== "function") {
      console.warn(`[tools] Lewati ${file}: harus punya "name" dan "execute()"`);
      continue;
    }

    if (tools.has(tool.name)) {
      console.warn(`[tools] Nama tool "${tool.name}" dobel (file: ${file}), yang belakangan menang.`);
    }

    tools.set(tool.name, tool);
  }

  return tools;
}

const tools = loadTools();

// Format definitions sesuai skema tool calling Groq/OpenAI-compatible
const toolDefinitions = Array.from(tools.values()).map((tool) => ({
  type: "function",
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters || { type: "object", properties: {} },
  },
}));

async function executeTool(name, rawArgs) {
  const tool = tools.get(name);

  if (!tool) {
    return { error: `Tool "${name}" tidak ditemukan` };
  }

  let args = {};
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch (err) {
    return { error: `Argumen tool tidak valid (bukan JSON): ${err.message}` };
  }

  try {
    return await tool.execute(args);
  } catch (err) {
    console.error(`[tools] Error saat jalanin "${name}":`, err);
    return { error: `Gagal menjalankan tool "${name}": ${err.message}` };
  }
}

module.exports = { toolDefinitions, executeTool };
