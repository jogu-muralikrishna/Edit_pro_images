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
  
  if (!accessKey) {
    console.error('UNSPLASH_ACCESS_KEY is not set');
    return res.status(500).json({ error: 'Unsplash API key is missing. Please check your environment variables.' });
  }

  try {
    const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query as string)}&page=${page}&per_page=20&client_id=${accessKey}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Unsplash API Error:', errorText);
      return res.status(response.status).json({ error: 'Unsplash API returned an error' });
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('Unsplash Proxy Error:', error);
    res.status(500).json({ error: 'Failed to fetch from Unsplash' });
  }
});

// Pexels Proxy
app.get('/api/stock/pexels', async (req, res) => {
  const { query, page = 1 } = req.query;
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    console.error('PEXELS_API_KEY is not set');
    return res.status(500).json({ error: 'Pexels API key is missing. Please check your environment variables.' });
  }

  try {
    const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query as string)}&page=${page}&per_page=20`, {
      headers: { Authorization: apiKey as string }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pexels API Error:', errorText);
      return res.status(response.status).json({ error: 'Pexels API returned an error' });
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('Pexels Proxy Error:', error);
    res.status(500).json({ error: 'Failed to fetch from Pexels' });
  }
});

// Gemini AI Proxy
import { GoogleGenerativeAI as GoogleGenAI } from '@google/generative-ai';

async function getAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not configured on the server. Please add it to your environment variables.');
  return new GoogleGenAI(key);
}

app.post('/api/ai/generate', async (req, res) => {
  const { prompt } = req.body;
  try {
    const ai = await getAI();
    // Use gemini-1.5-flash for maximum reliability and speed
    const model = ai.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: "You are an elite AI artist. While you primarily process text and images, you can create vivid, detailed descriptions. If specifically asked to generate an image, explain that you are enhancing the prompt for visual excellence. (Note: standard Gemini doesn't return raw image bytes in this mode, so we use the text response to guide the UI)."
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Since standard Gemini 1.5 doesn't return images via generateContent in most regions,
    // we return the enhanced description or a specific error if we can't do it.
    // However, I'll keep the logic to check for inlineData just in case.
    const candidates = result.response.candidates || [];
    for (const cand of candidates) {
      for (const part of cand.content.parts) {
        if (part.inlineData) {
          return res.json({ image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` });
        }
      }
    }

    // If no image, return the text which often contains the "AI thinking" or an error
    res.json({ text });
  } catch (error: any) {
    console.error("Generate Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/edit', async (req, res) => {
  const { image, prompt } = req.body;
  try {
    const ai = await getAI();
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const model = ai.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: "You are a professional image editor. Analyze the provided image and describe the changes accurately, or return the edited image data if available."
    });

    const result = await model.generateContent([
      { inlineData: { data: base64Data, mimeType: "image/png" } },
      { text: prompt }
    ]);
    
    const candidates = result.response.candidates || [];
    for (const cand of candidates) {
      for (const part of cand.content.parts) {
        if (part.inlineData) {
          return res.json({ image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` });
        }
      }
    }
    res.json({ text: result.response.text() });
  } catch (error: any) {
    console.error("Edit Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/suggestions', async (req, res) => {
  const { image } = req.body;
  try {
    const ai = await getAI();
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      { text: "Suggest 3 creative editing improvements for this design. Return ONLY a simple JSON array of strings: [\"suggestion1\", \"suggestion2\", \"suggestion3\"]" },
      { inlineData: { data: base64Data, mimeType: "image/png" } }
    ]);
    
    const text = result.response.text();
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']') + 1;
    const suggestions = JSON.parse(text.substring(start, end) || "[]");
    res.json({ suggestions });
  } catch (error: any) {
    console.error("Suggestions Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/enhance-prompt', async (req, res) => {
  const { prompt } = req.body;
  try {
    const ai = await getAI();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`Expand this simple image prompt into a detailed artistic description. Return ONLY the enhanced prompt: "${prompt}"`);
    res.json({ prompt: result.response.text() });
  } catch (error: any) {
    console.error("Enhance Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/remove-bg', async (req, res) => {
  const { image } = req.body;
  try {
    const ai = await getAI();
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const model = ai.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: "HIGH PRECISION BACKGROUND REMOVAL. You must identify the main subject and isolate it perfectly. If you can return an image, return it with the background replaced by pure white. If you cannot return an image, describe the isolation process."
    });

    const result = await model.generateContent([
      { inlineData: { data: base64Data, mimeType: "image/png" } },
      { text: "Isolate the main subject cleanly. Remove everything else." }
    ]);

    const candidates = result.response.candidates || [];
    for (const cand of candidates) {
      for (const part of cand.content.parts) {
        if (part.inlineData) {
          return res.json({ image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` });
        }
      }
    }
    res.status(500).json({ error: 'Gemini 1.5 Flash vision processed the request but did not return updated image data. This may be due to regional restrictions on image generation/output in the Gemini API.' });
  } catch (error: any) {
    console.error("Remove BG Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
