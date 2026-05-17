import express, { Router } from 'express';
import cors from 'cors';
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase Admin
try {
  if (!admin.apps.length) {
    const config: any = {
      projectId: firebaseConfig.projectId,
    };
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        config.credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
      } catch (e) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", e);
      }
    }

    admin.initializeApp(config);
  }
} catch (e) {
  console.error("Firebase Admin Init Error:", e);
}

let firestoreInstance: any = null;

const getFirestoreInstance = () => {
  if (firestoreInstance) return firestoreInstance;
  try {
    const app = admin.app();
    const rawDbId = process.env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;
    const sanitize = (id: any): string | undefined => {
      if (typeof id !== 'string') return undefined;
      const stripped = id.trim();
      if (!stripped || stripped === '(default)' || stripped.includes('//') || stripped.includes(':') || stripped.includes('.') || stripped.length > 64) {
        return undefined;
      }
      return stripped;
    };
    const dbId = sanitize(rawDbId);
    firestoreInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
    return firestoreInstance;
  } catch (e: any) {
    console.error("CRITICAL: Firebase Firestore Initialization Failed:", e.message);
    return { collection: () => ({ doc: () => ({ set: async () => {}, get: async () => ({ exists: false, data: () => ({}) }), update: async () => {}, delete: async () => {} }), add: async () => ({ id: 'dummy' }), limit: () => ({ get: async () => ({ docs: [] }) }), orderBy: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }), where: () => ({ get: async () => ({ docs: [] }) }) }) };
  }
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const router = Router();
const JWT_SECRET = process.env.ANALYTICS_JWT_SECRET || 'secret-admin-key-2025';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'EditPro@2025';

// Admin Login
router.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

const verifyAdmin = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Gemini AI Setup with modern SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '',
  httpOptions: {
    headers: { 'User-Agent': 'aistudio-build' }
  }
});

const MODELS = {
  TEXT: "gemini-2.0-flash",
  PRO: "gemini-2.0-flash",
  IMAGE: "gemini-2.0-flash",
  FALLBACK: "gemini-3-flash-preview"
};

/**
 * Utility for exponential backoff delay
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Utility to strip markdown code blocks from AI strings
 */
function cleanJsonResponse(text: string) {
  if (!text) return "";
  return text.trim().replace(/^```json/, '').replace(/```$/, '').trim();
}

/**
 * Modern SDK uses ai.models.generateContent directly.
 * Implements fallback and retry logic.
 */
async function generateContent(params: any, attempt = 1): Promise<any> {
  try {
    return await ai.models.generateContent(params);
  } catch (error: any) {
    const isQuotaError = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    
    if (isQuotaError && attempt <= 3) {
      console.warn(`Gemini Quota Exceeded (Attempt ${attempt}). Retrying...`);
      
      // If primary model failed, try fallback model
      if (params.model !== MODELS.FALLBACK) {
        console.log(`Switching to fallback model: ${MODELS.FALLBACK}`);
        return await generateContent({ ...params, model: MODELS.FALLBACK }, attempt + 1);
      }
      
      // Exponential backoff: 2s, 4s, 8s
      const waitTime = Math.pow(2, attempt) * 1000;
      await delay(waitTime);
      return await generateContent(params, attempt + 1);
    }
    
    console.error(`Gemini API Error (Final):`, error?.message || error);
    throw error;
  }
}

// API Routes
router.get('/health', (req, res) => {
  res.json({ status: 'ok', name: 'Edit Pro AI', engine: 'Gemini 3.1 & Firebase' });
});

router.get('/stock/unsplash', async (req, res) => {
  const { query, page = 1 } = req.query;
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return res.status(500).json({ error: 'Unsplash key missing' });
  try {
    const response = await fetch(`https://api.unsplash.com/search/photos?query=${query}&page=${page}&per_page=20&client_id=${accessKey}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

router.get('/stock/pexels', async (req, res) => {
  const { query, page = 1 } = req.query;
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Pexels key missing' });
  try {
    const response = await fetch(`https://api.pexels.com/v1/search?query=${query}&page=${page}&per_page=20`, {
      headers: { Authorization: apiKey as string }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

router.post('/ai/chat', async (req, res) => {
  const { messages, canvasState } = req.body;
  try {
    const posterSchema = {
      type: "object",
      properties: {
        chatResponse: { type: "string" },
        action: { type: "string", enum: ["none", "create", "update"] },
        posterData: {
          type: "object",
          properties: {
            theme: { type: "string" },
            backgroundImagePrompt: { type: "string" },
            elements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  type: { type: "string", enum: ["text", "shape", "image"] },
                  text: { type: "string" },
                  imagePrompt: { type: "string" },
                  shapeType: { type: "string", enum: ["rect", "circle", "triangle"] },
                  fontSize: { type: "number" },
                  fontFamily: { type: "string" },
                  color: { type: "string" },
                  top: { type: "number" },
                  left: { type: "number" },
                  width: { type: "number" },
                  height: { type: "number" },
                  fontWeight: { type: "string" },
                  textAlign: { type: "string" }
                }
              }
            }
          }
        }
      },
      required: ["chatResponse", "action"]
    };

    const systemPrompt = `You are "Edit Pro AI", a brilliant, witty, and human-like creative companion. 
    Think of yourself as a mix between a professional art director and a friendly ChatGPT conversation.
    
    TONE & PERSONALITY:
    - Warm, helpful, and slightly artistic.
    - Use emojis occasionally but professionally.
    - Be proactive! If a user asks for something, don't just do it—suggest a style that makes it pop.
    
    CAPABILITIES:
    - You handle a design canvas. You can "create" new designs or "update" existing ones.
    - Current Design Layout: ${JSON.stringify(canvasState || {})}
    
    GUIDELINES:
    1. If the user wants to change the design, set action to "update" and provide the new posterData.
    2. If creating from scratch, set action to "create".
    3. posterData should contain the FULL set of elements for the final state.
    4. Elements can be "text", "shape", or "image".
    5. For "image" elements, you MUST provide an "imagePrompt". A high-quality image will be generated based on this prompt.
    6. For "text", specify fontSize (pixels), fontFamily (e.g., 'Inter', 'Space Grotesk'), color (hex), fontWeight ('bold' or 'normal'), textAlign.
    7. Use relative positioning/sizing (numbers roughly based on a 1000x1000 canvas).
    8. ChatResponse should be your verbal response to the user.
    
    Always respond in strictly valid JSON matching the schema.`;

    const response = await generateContent({
      model: MODELS.TEXT,
      contents: messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json"
      }
    });

    const resultText = response.text || "";
    const cleaned = cleanJsonResponse(resultText);
    const result = JSON.parse(cleaned || "{}");
    res.json(result);
  } catch (error) {
    console.error("Chat API Error:", error);
    res.status(200).json({ chatResponse: "I'm having a small creative block. Mind trying again? 🎨", action: "none" });
  }
});

router.post('/ai/enhance-prompt', async (req, res) => {
  const { prompt } = req.body;
  try {
    const response = await generateContent({
      model: MODELS.TEXT,
      contents: [{ parts: [{ text: `Expand this image prompt into a detailed, high-quality artistic description: "${prompt}". Return only the expanded prompt text.` }] }]
    });
    res.json({ prompt: response.text });
  } catch (error) {
    res.json({ prompt });
  }
});

router.post('/remove-bg', async (req, res) => {
  const { image } = req.body;
  try {
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const response = await generateContent({
      model: MODELS.TEXT,
      contents: [
        { inlineData: { data: base64Data, mimeType: "image/png" } },
        { text: "Remove the background from this image. Output only the foreground object on a transparent or neutral background." }
      ]
    });

    const part = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (part) {
      res.json({ image: `data:image/png;base64,${part.inlineData.data}` });
    } else {
      res.status(500).json({ error: "BG Removal Failed" });
    }
  } catch (error) {
    res.status(500).json({ error: "AI Busy" });
  }
});

router.post('/ai/generate', async (req, res) => {
  const { prompt } = req.body;
  try {
    // For now, Pollinations is more reliable for direct image gen in this environment
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}&enhance=true`;
    
    // We proxy it to avoid CORS issues if needed, but here we can just return the URL
    // since Pollinations is CORS-friendly usually.
    res.json({ image: imageUrl });
  } catch (error) {
    res.status(503).json({ error: "Image generation service is busy. Please try again." });
  }
});

router.post('/ai/edit', async (req, res) => {
  const { image, prompt } = req.body;
  try {
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    
    // Try to get an edited result from Gemini 2.0 (if possible)
    // For editing, we often use prompt expansion + new generation with reference
    const response = await generateContent({
      model: MODELS.TEXT,
      contents: [
        { role: 'user', parts: [
          { inlineData: { data: base64Data, mimeType: "image/png" } },
          { text: `Analyze this image and the request: "${prompt}". Provide a highly detailed, expanded prompt for an image generator that will create the modified version of this image. Return ONLY the new prompt text.` }
        ]}
      ]
    });

    const newPrompt = response.text || prompt;
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(newPrompt)}?width=1024&height=1024&nologo=true&seed=${seed}&enhance=true`;

    res.json({ image: imageUrl, text: newPrompt });
  } catch (error) {
    res.status(500).json({ error: "AI Editing is temporarily unavailable." });
  }
});

router.post('/ai/suggestions', async (req, res) => {
  const { image } = req.body;
  try {
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const response = await generateContent({
      model: MODELS.TEXT,
      contents: [{
        parts: [
          { inlineData: { data: base64Data, mimeType: "image/png" } },
          { text: "Suggest 3 creative editing improvements for this image. Return a JSON array of strings ONLY." }
        ]
      }],
      config: { responseMimeType: "application/json" }
    });
    const textResult = response.text || "";
    const cleaned = cleanJsonResponse(textResult);
    res.json({ suggestions: JSON.parse(cleaned || "[]") });
  } catch (error) {
    res.status(500).json({ error: "Analysis failed" });
  }
});

router.post('/ai/detect-style', async (req, res) => {
  const { image } = req.body;
  try {
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const response = await generateContent({
      model: MODELS.TEXT,
      contents: [{
        parts: [
          { inlineData: { data: base64Data, mimeType: "image/png" } },
          { text: "Analyze the primary typography style in this image. Return a JSON object with: fontFamily (closest from ['Inter', 'Space Grotesk', 'Playfair Display', 'JetBrains Mono', 'Outfit']), fontSize (roughly in pixels for a 1000x1000 canvas), fontWeight ('bold' or 'normal'), color (hex code), and textAlign ('center', 'left', 'right')." }
        ]
      }],
      config: { responseMimeType: "application/json" }
    });
    const textPayload = response.text || "";
    const cleaned = cleanJsonResponse(textPayload);
    res.json(JSON.parse(cleaned || "{}"));
  } catch (error: any) {
    console.error("Gemini API Error Detail:", error?.message || error);
    res.status(500).json({ error: "Style analysis failed: " + (error?.message || "Unknown error") });
  }
});

// Admin & Analytics
router.post('/collect', async (req, res) => {
  const { type, data, sessionId } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    const db = getFirestoreInstance();
    const colName = type === 'session' ? 'analytics_sessions' : `analytics_${type}s`;
    if (type === 'session') {
      await db.collection(colName).doc(sessionId).set({ ...data, ip, id: sessionId, lastSeen: FieldValue.serverTimestamp() }, { merge: true });
    } else {
      await db.collection(colName).add({ ...data, sessionId, timestamp: FieldValue.serverTimestamp() });
    }
    res.json({ status: 'ok' });
  } catch (error) {
    res.json({ status: 'fail' });
  }
});

router.get('/admin/data', verifyAdmin, async (req, res) => {
  try {
    const db = getFirestoreInstance();
    const [sessions, uploads, exports, actions] = await Promise.all([
      db.collection('analytics_sessions').orderBy('lastSeen', 'desc').limit(50).get(),
      db.collection('analytics_uploads').orderBy('timestamp', 'desc').limit(50).get(),
      db.collection('analytics_exports').orderBy('timestamp', 'desc').limit(50).get(),
      db.collection('analytics_actions').orderBy('timestamp', 'desc').limit(100).get(),
    ]);
    res.json({
      sessions: sessions.docs.map((d: any) => ({ id: d.id, ...d.data() })),
      uploads: uploads.docs.map((d: any) => ({ id: d.id, ...d.data() })),
      exports: exports.docs.map((d: any) => ({ id: d.id, ...d.data() })),
      actions: actions.docs.map((d: any) => ({ id: d.id, ...d.data() })),
    });
  } catch (error) {
    res.status(500).json({ error: "Fetch failed" });
  }
});

// Fallback for unmatched API routes
router.all('*', (req, res) => {
  console.log(`[API 404] Unmatched route: ${req.method} ${req.url}`);
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found on API router` });
});

app.use('/', router);

export const apiRouter = router;
export default app;

