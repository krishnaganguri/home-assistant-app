import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { spawn } from "child_process";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function startServer() {
  const app = express();
  const PORT = 3000;
  const EXPO_PORT = 8081;

  app.use(express.json({ limit: '10mb' }));

  // API Route: OCR for Appliance Labels
  app.post("/api/ocr", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) return res.status(400).json({ error: "No image provided" });

      const modelName = "gemini-3-flash-preview";
      const prompt = `Extract appliance details from this label image. 
      Return JSON with fields: brand, model, serialNumber, type (e.g., Refrigerator, Washing Machine, HVAC, Dishwasher, Oven).
      If a field is not found, use null.`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: image.split(',')[1] } }
          ]
        },
        config: { responseMimeType: "application/json" }
      });

      res.json(JSON.parse(response.text));
    } catch (error) {
      console.error("OCR Error:", error);
      res.status(500).json({ error: "Failed to process image" });
    }
  });

  // API Route: Generate Maintenance Tasks
  app.post("/api/generate-tasks", async (req, res) => {
    try {
      const { type, brand, model } = req.body;
      if (!type) return res.status(400).json({ error: "Appliance type is required" });

      const modelName = "gemini-3-flash-preview";
      const prompt = `Generate a list of recommended maintenance tasks for a ${brand || ''} ${type} (Model: ${model || 'unknown'}).
      For each task, provide:
      - title: Short title
      - description: Brief explanation
      - instructions: Step-by-step guide
      - intervalMonths: Recommended frequency in months (integer)
      - initialDueDate: Suggested first due date in YYYY-MM-DD format (relative to today)
      
      Return as a JSON array of objects.`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      res.json(JSON.parse(response.text));
    } catch (error) {
      console.error("Task Generation Error:", error);
      res.status(500).json({ error: "Failed to generate tasks" });
    }
  });

  // Expo middleware for development
  if (process.env.NODE_ENV !== "production") {
    // Start Expo in the background
    const expo = spawn("npx", ["expo", "start", "--web", "--port", EXPO_PORT.toString()], {
      stdio: "inherit",
      shell: true
    });

    app.use("/", createProxyMiddleware({
      target: `http://localhost:${EXPO_PORT}`,
      changeOrigin: true,
      ws: true,
    }));
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
