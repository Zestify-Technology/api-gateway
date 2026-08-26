// Modul untuk generate balasan AI pakai Groq Cloud API,
// dengan dukungan tool/function calling (lihat folder /tools).

const Groq = require("groq-sdk");
const { SYSTEM_PROMPT } = require("./system-prompt");
const { toolDefinitions, executeTool } = require("../tools");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const MAX_TOOL_ITERATIONS = 5; // jaga-jaga biar gak infinite loop kalau model keras kepala manggil tool terus

async function generateReply(history) {
  // history = [{ role: "user"|"assistant", content: "..." }, ...]
  const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...history];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 500,
      messages,
      ...(toolDefinitions.length > 0 && {
        tools: toolDefinitions,
        tool_choice: "auto",
      }),
    });

    const message = response.choices[0]?.message;
    if (!message) break;

    // Kalau model gak minta manggil tool, ini balasan final
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return (message.content || "").trim();
    }

    // Model minta manggil satu/lebih tool → jalankan semua, lalu loop lagi
    // supaya model bisa nyusun balasan pakai hasil tool tersebut.
    messages.push(message);

    for (const call of message.tool_calls) {
      const result = await executeTool(call.function.name, call.function.arguments);

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: typeof result === "string" ? result : JSON.stringify(result),
      });
    }
  }

  return "Maaf kak, saya lagi kesulitan memproses ini. Nanti dibantu tim admin ya.";
}

module.exports = { generateReply };
