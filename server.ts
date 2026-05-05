import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for real TTS audio generation (for download functionality)
  app.get("/api/tts", async (req, res) => {
    const { text, lang } = req.query;

    if (!text) {
      return res.status(400).send("Text is required");
    }

    try {
      const fullText = String(text);
      const language = String(lang || "hi");
      
      // Google Translate TTS has a 200 character limit.
      // We divide long text into smaller segments to generate a long audio file.
      const chunks: string[] = [];
      let remainingText = fullText;

      while (remainingText.length > 0) {
        if (remainingText.length <= 200) {
          chunks.push(remainingText);
          break;
        }

        // Search for a suitable split point (punctuation or space)
        let splitIndex = remainingText.lastIndexOf(".", 200);
        if (splitIndex === -1) splitIndex = remainingText.lastIndexOf("?", 200);
        if (splitIndex === -1) splitIndex = remainingText.lastIndexOf("।", 200); // Hindi full stop
        if (splitIndex === -1) splitIndex = remainingText.lastIndexOf(" ", 200);
        if (splitIndex === -1) splitIndex = 200;

        chunks.push(remainingText.substring(0, splitIndex).trim());
        remainingText = remainingText.substring(splitIndex).trim();
      }

      console.log(`Processing ${chunks.length} chunks for a long voice generation...`);

      const audioBuffers: Buffer[] = [];
      for (const chunk of chunks) {
        if (!chunk) continue;
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
          chunk
        )}&tl=${language}&client=tw-ob`;

        const response = await axios.get(url, {
          responseType: "arraybuffer",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          }
        });
        audioBuffers.push(Buffer.from(response.data));
      }

      const mergedAudio = Buffer.concat(audioBuffers);

      res.set("Content-Type", "audio/mpeg");
      res.send(mergedAudio);
    } catch (error) {
      console.error("Long TTS generation failed:", error);
      res.status(500).send("Error generating speech audio");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
