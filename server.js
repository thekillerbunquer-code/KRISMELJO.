

const express = require("express");
const path = require("path");

const app = express();

app.set("trust proxy", 1);
app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

// Protección por IP
const requests = new Map();
const MINUTE_LIMIT = 10;
const DAY_LIMIT = 100;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function rateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();

  let record = requests.get(ip);

  if (!record || now - record.dayStart >= DAY_MS) {
    record = {
      minuteStart: now,
      minuteCount: 0,
      dayStart: now,
      dayCount: 0
    };
    requests.set(ip, record);
  }

  if (now - record.minuteStart >= MINUTE_MS) {
    record.minuteStart = now;
    record.minuteCount = 0;
  }

  if (
    record.minuteCount >= MINUTE_LIMIT ||
    record.dayCount >= DAY_LIMIT
  ) {
    return res.status(429).json({
      error: "Límite de consultas alcanzado. Inténtalo más tarde."
    });
  }

  record.minuteCount++;
  record.dayCount++;
  next();
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", app: "KRISMELJO GLOBAL" });
});

app.post("/api/chat", rateLimit, async (req, res) => {
  try {
    const message = String(req.body.message || "").trim();

    if (!message) {
      return res.status(400).json({ error: "Escribe una consulta." });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        error: "La consulta supera el máximo de 2.000 caracteres."
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Falta configurar OPENAI_API_KEY en Render."
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        instructions: "Eres KRISMELJO AI, asistente de KRISMELJO GLOBAL. Responde en español, con precisión y respeto.",
        input: message,
        max_output_tokens: 700
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI:", data);
      return res.status(response.status).json({
        error: data.error?.message || "Error de conexión con OpenAI."
      });
    }

    const reply = data.output
      ?.flatMap(item => item.content || [])
      .find(content => content.type === "output_text")?.text
      || "No se recibió respuesta.";

    res.json({ reply });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error interno del servidor."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`KRISMELJO GLOBAL funcionando en puerto ${PORT}`);
});
