import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'Edit Pro API', engine: 'Firebase/Firestore' });
});

// Unsplash Proxy
app.get('/api/stock/unsplash', async (req, res) => {
  const { query, page = 1 } = req.query;
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  
  if (!accessKey) return res.status(500).json({ error: 'Unsplash key missing' });

  try {
    const response = await fetch(`https://api.unsplash.com/search/photos?query=${query}&page=${page}&per_page=20&client_id=${accessKey}`);
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch from Unsplash' });
  }
});

// Pexels Proxy
app.get('/api/stock/pexels', async (req, res) => {
  const { query, page = 1 } = req.query;
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'Pexels key missing' });

  try {
    const response = await fetch(`https://api.pexels.com/v1/search?query=${query}&page=${page}&per_page=20`, {
      headers: { Authorization: apiKey as string }
    });
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch from Pexels' });
  }
});

// Gemini AI Proxy
import { GoogleGenAI } from '@google/genai';

async function getAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY missing');
  return new GoogleGenAI({ apiKey: key });
}

app.post('/api/ai/generate', async (req, res) => {
  const { prompt } = req.body;
  try {
    const ai = await getAI();
    const result = await ai.models.generateContent({ 
      model: "gemini-2.5-flash-image",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "You are an elite AI artist. Generate stunning, high-definition images. Expand simple prompts into detailed descriptions. Always return image data if possible."
      }
    });
    const parts = result.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        return res.json({ image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` });
      }
    }
    res.json({ text: result.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/edit', async (req, res) => {
  const { image, prompt } = req.body;
  try {
    const ai = await getAI();
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const result = await ai.models.generateContent({ 
      model: "gemini-2.5-flash-image",
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: base64Data, mimeType: "image/png" } },
            { text: prompt }
          ]
        }
      ],
      config: {
        systemInstruction: "You are a professional image editor. Cleanly modify the provided image based on the prompt. For background removal, isolate the subject perfectly."
      }
    });
    const parts = result.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        return res.json({ image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` });
      }
    }
    res.json({ text: result.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/suggestions', async (req, res) => {
  const { image } = req.body;
  try {
    const ai = await getAI();
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const result = await ai.models.generateContent({ 
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: 'user',
          parts: [
            { text: "Suggest 3 creative editing improvements for this design. Return ONLY a simple JSON array of strings: [\"suggestion1\", \"suggestion2\", \"suggestion3\"]" },
            { inlineData: { data: base64Data, mimeType: "image/png" } }
          ]
        }
      ]
    });
    const text = result.text || "";
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']') + 1;
    const suggestions = JSON.parse(text.substring(start, end) || "[]");
    res.json({ suggestions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/enhance-prompt', async (req, res) => {
  const { prompt } = req.body;
  try {
    const ai = await getAI();
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Expand this simple image prompt into a detailed artistic description. Return ONLY the enhanced prompt: "${prompt}"`
    });
    res.json({ prompt: result.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/remove-bg', async (req, res) => {
  const { image } = req.body;
  try {
    const ai = await getAI();
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const result = await ai.models.generateContent({ 
      model: "gemini-2.5-flash-image",
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: base64Data, mimeType: "image/png" } },
            { text: "Remove background completely. Isolate the main subject cleanly on a pure white background." }
          ]
        }
      ],
      config: {
        systemInstruction: "Isolate the main subject from the background cleanly. Return the isolated subject on a pure white background with no shadows. High precision required."
      }
    });
    const parts = result.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        return res.json({ image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` });
      }
    }
    res.status(500).json({ error: 'Failed to remove background' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
