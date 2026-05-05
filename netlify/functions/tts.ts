import { Handler } from "@netlify/functions";
import axios from "axios";

export const handler: Handler = async (event) => {
  const { text, lang } = event.queryStringParameters || {};

  if (!text) {
    return { statusCode: 400, body: "Text is required" };
  }

  try {
    const fullText = String(text);
    const language = String(lang || "hi");
    
    const chunks: string[] = [];
    let remainingText = fullText;

    while (remainingText.length > 0) {
      if (remainingText.length <= 200) {
        chunks.push(remainingText);
        break;
      }

      let splitIndex = remainingText.lastIndexOf(".", 200);
      if (splitIndex === -1) splitIndex = remainingText.lastIndexOf("?", 200);
      if (splitIndex === -1) splitIndex = remainingText.lastIndexOf("।", 200);
      if (splitIndex === -1) splitIndex = remainingText.lastIndexOf(" ", 200);
      if (splitIndex === -1) splitIndex = 200;

      chunks.push(remainingText.substring(0, splitIndex).trim());
      remainingText = remainingText.substring(splitIndex).trim();
    }

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

    const finalBuffer = Buffer.concat(audioBuffers);

    return {
      statusCode: 200,
      headers: { "Content-Type": "audio/mpeg" },
      body: finalBuffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error("Netlify TTS error:", error);
    return { statusCode: 500, body: "Error generating audio" };
  }
};
