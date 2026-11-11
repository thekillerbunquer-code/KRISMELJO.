
const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({ status: "ok", app: "VELTRIQ GLOBAL" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body.message || "").trim();

    if (!message) {
      return res.status(400).json({ error: "Escribe un mensaje." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "Falta configurar OPENAI_API_KEY en Render."
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        instructions:
          "Eres VELTRIQ GLOBAL AI, un asistente profesional en español especializado en ingeniería, tecnología, energía, petróleo y proyectos empresariales. Responde con precisión y no inventes datos.",
        input: message
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI:", data);
      return res.status(response.status).json({
        error: data.error?.message || "Error de conexión con OpenAI."
      });
    }

    const reply =
      data.output?.flatMap(item => item.content || [])
        .find(content => content.type === "output_text")?.text ||
      "No se recibió respuesta.";

    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`VELTRIQ GLOBAL funcionando en puerto ${PORT}`);
});

