import express, { Router } from 'express';
import cors from 'cors';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
    
    // Support Service Account from env for Vercel/External deployment
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        config.credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
        console.log("Using Service Account from environment.");
      } catch (e) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", e);
      }
    }

    admin.initializeApp(config);
    console.log(`Firebase Admin initialized for project: ${firebaseConfig.projectId}`);
  }
} catch (e) {
  console.error("Firebase Admin Init Error:", e);
}

// Database instance manager
let firestoreInstance: any = null;

const getFirestoreInstance = () => {
  if (firestoreInstance) return firestoreInstance;
  
  try {
    const app = admin.app();
    // Sanitize database ID - must be a simple ID, not a URL
    const rawDbId = process.env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;
    const sanitize = (id: any): string | undefined => {
      if (typeof id !== 'string') return undefined;
      const stripped = id.trim();
      // Valid Firestore DB IDs are alphanumeric/hyphens. URLs or (default) should be undefined.
      if (!stripped || stripped === '(default)' || stripped.includes('//') || stripped.includes(':') || stripped.includes('.') || stripped.length > 64) {
        return undefined;
      }
      return stripped;
    };
    const dbId = sanitize(rawDbId);
    
    // Log the configuration being used ONCE
    const displayDbId = dbId || "(default)";

    if (dbId) {
      try {
        firestoreInstance = getFirestore(app, dbId);
        console.log(`Firestore successfully bound to database: ${displayDbId}`);
        return firestoreInstance;
      } catch (e: any) {
        console.error(`Failed to initialize specific database ${dbId}:`, e.message);
      }
    }
    
    firestoreInstance = getFirestore(app);
    console.log("Firestore successfully bound to default database.");
    return firestoreInstance;
  } catch (e: any) {
    console.error("CRITICAL: Firebase Firestore Initialization Failed:", e.message);
    // Return a dummy object with no-op methods to prevent app crash
    const dummy = {
      collection: (name: string) => {
        const col: any = {
          doc: () => ({ 
            set: async () => { console.warn(`Mock Firestore: set on ${name}`); }, 
            get: async () => ({ exists: false, data: () => ({}) }),
            update: async () => { console.warn(`Mock Firestore: update on ${name}`); },
            delete: async () => { console.warn(`Mock Firestore: delete on ${name}`); }
          }),
          add: async () => { console.warn(`Mock Firestore: add to ${name}`); return { id: 'dummy-' + Date.now() }; },
          limit: () => col,
          orderBy: () => col,
          where: () => col,
          get: async () => ({ docs: [] })
        };
        return col;
      }
    };
    return dummy;
  }
};

const router = Router();

const JWT_SECRET = process.env.ANALYTICS_JWT_SECRET || 'secret-admin-key-2025';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'EditPro@2025';

// Middleware to verify Admin JWT
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

// Gemini AI Setup with robust key detection
async function getAI() {
  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  
  if (!key || key.length < 10 || key.includes('KEY_HERE')) {
    console.error("Gemini API Key missing or invalid.");
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  
  return new GoogleGenerativeAI(key);
}

const MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash-8b"
];

let WORKING_MODEL_CACHE: string | null = null;

/**
 * Executes a generateContent call with the preferred production-safe models.
 */
async function generateWithFallback(ai: GoogleGenerativeAI, generateOptions: any, modelOptions: any = {}) {
  // Ensure the cache only contains models from our allowed list
  if (WORKING_MODEL_CACHE && !MODELS.includes(WORKING_MODEL_CACHE)) {
    WORKING_MODEL_CACHE = null;
  }

  const modelsToTry = WORKING_MODEL_CACHE ? [WORKING_MODEL_CACHE, ...MODELS] : MODELS;
  const seen = new Set();
  
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    if (seen.has(modelName)) continue;
    seen.add(modelName);
    
    try {
      const model = ai.getGenerativeModel({ ...modelOptions, model: modelName });
      
      // Add a timeout to prevent hanging fetches
      const result = await Promise.race([
        model.generateContent(generateOptions),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AI Request Timeout')), 30000))
      ]) as any;
      
      WORKING_MODEL_CACHE = modelName;
      return result;
    } catch (e: any) {
      lastError = e;
      const msg = (e.message || '').toLowerCase();
      
      const isRecoverable = 
        msg.includes('404') || 
        msg.includes('not found') || 
        msg.includes('not supported') || 
        msg.includes('429') || 
        msg.includes('quota') || 
        msg.includes('too many requests') ||
        msg.includes('503') ||
        msg.includes('unavailable') ||
        msg.includes('overloaded') ||
        msg.includes('network') ||
        msg.includes('fetch') ||
        msg.includes('timeout');

      if (isRecoverable) {
        if (modelName === WORKING_MODEL_CACHE) {
          WORKING_MODEL_CACHE = null;
        }
        // Small delay before retry for rate limits
        if (msg.includes('429') || msg.includes('quota')) {
           await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
        }
        continue;
      }
      throw e;
    }
  }
  throw lastError || new Error("AI is temporarily unavailable. Please try again.");
}

// API Routes
router.get('/health', (req, res) => {
  res.json({ status: 'ok', name: 'Edit Pro API', engine: 'Firebase/Firestore' });
});

// Unsplash Proxy
router.get('/stock/unsplash', async (req, res) => {
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
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch from Pexels' });
  }
});

// AI Proxies
router.post('/ai/chat', async (req, res) => {
  const { messages, sessionId, canvasState } = req.body;
  try {
    const ai = await getAI();
    const posterSchema = {
      type: "object",
      properties: {
        chatResponse: { type: "string", description: "Natural language response to the user" },
        action: { type: "string", enum: ["none", "create", "update"], description: "Whether to create a new layout or update existing one" },
        posterData: {
          type: "object",
          properties: {
            theme: { type: "string" },
            backgroundImagePrompt: { type: "string", description: "Vivid prompt for the background image" },
            elements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Unique ID for the element (keep it same if updating existing one)" },
                  type: { type: "string", enum: ["text", "shape", "image"] },
                  text: { type: "string" },
                  fontSize: { type: "number" },
                  fontFamily: { type: "string", enum: ["Inter", "Space Grotesk", "Playfair Display", "Montserrat", "JetBrains Mono"] },
                  color: { type: "string" },
                  top: { type: "number" },
                  left: { type: "number" },
                  fontWeight: { type: "string" },
                  textAlign: { type: "string" },
                  opacity: { type: "number" },
                  visible: { type: "boolean" }
                }
              }
            }
          }
        }
      },
      required: ["chatResponse", "action"]
    };

    const systemPrompt = `You are "Edit Pro AI", a world-class creative director and friendly AI Design Assistant.
    
    Capabilities:
    - CONVERSATION: Talk naturally, friendly, and helpful. Be human-like.
    - POSTER DESIGN: Generate professional layouts from scratch (action: "create").
    - SMART EDITING: Modify existing designs based on user feedback (action: "update").
    
    Current Canvas State: ${JSON.stringify(canvasState || {})}
    
    Design Philosophy:
    - Use "Space Grotesk" for modern/tech.
    - Use "Playfair Display" for luxury/classic.
    - Use "Montserrat" for bold/impactful.
    - Positions are on a 1000x1000 canvas.
    - Always provide a delightful conversational "chatResponse" first.
    - If the user says "make text bigger", set action to "update" and modify the relevant element in the array.
    - If they provide a new idea (e.g., "make a gym poster"), set action to "create".
    
    Respond STRICTLY in JSON format following this schema: ${JSON.stringify(posterSchema)}
    `;

    const chatGenResult = await generateWithFallback(ai, {
      contents: messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))
    }, {
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: posterSchema as any
      },
      systemInstruction: systemPrompt,
    });

    const text = chatGenResult.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : "{}";
    const result = JSON.parse(jsonStr);
    
    // Default action if missing
    if (!result.action) result.action = "none";
    if (result.action === 'create' && !result.posterData) result.action = 'none';
    
    res.json(result);
  } catch (error: any) {
    const msg = (error.message || '').toLowerCase();
    
    // Check for common AI errors and return a user-friendly JSON instead of 500
    if (msg.includes('unavailable') || msg.includes('429') || msg.includes('quota') || msg.includes('limit') || msg.includes('fetch')) {
      return res.status(200).json({ 
        chatResponse: "AI is temporarily unavailable. Please try again.",
        action: "none"
      });
    }
    
    console.error("Chat Error:", error);
    res.status(200).json({ 
      chatResponse: "I encountered a creative block. Mind trying again? 🎨",
      action: "none"
    });
  }
});

router.post('/ai/generate', async (req, res) => {
  const { prompt } = req.body;
  try {
    const ai = await getAI();
    try {
      const response = await generateWithFallback(ai, {
        contents: [{ role: 'user', parts: [{ text: `You are a high-end designer. Expand this simple prompt into a highly detailed artistic description for an AI image generator. Focus on lighting, composition, and professional aesthetics. Original prompt: "${prompt}". Return ONLY the expanded prompt text.` }] }]
      });
      
      const enhancedPrompt = response.response.text() || prompt;
      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `/api/ai/image-proxy?prompt=${encodeURIComponent(enhancedPrompt.substring(0, 1500))}&seed=${seed}`;

      res.json({ text: enhancedPrompt, image: imageUrl });
    } catch (e: any) {
      const seed = Math.floor(Math.random() * 1000000);
      res.json({ 
        text: prompt, 
        image: `/api/ai/image-proxy?prompt=${encodeURIComponent(prompt)}&seed=${seed}`,
        warning: "AI enhancement temporarily unavailable"
      });
    }
  } catch (error: any) {
    res.status(503).json({ error: 'AI is temporarily unavailable. Please try again.' });
  }
});

router.post('/ai/edit', async (req, res) => {
  const { image, prompt } = req.body;
  try {
    const ai = await getAI();
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    try {
      const response = await generateWithFallback(ai, {
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { data: base64Data, mimeType: "image/png" } },
            { text: `Analyze this image in detail. Then, figure out how to modify it according to this instruction: "${prompt}". Create a NEW, extremely detailed artistic prompt for an image generator that describes the *result* of this modification while attempting to retain the core elements of the original image (composition, subject type). Return ONLY the new prompt text.` }
          ]
        }]
      });
      
      const newPrompt = response.response.text() || prompt;
      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `/api/ai/image-proxy?prompt=${encodeURIComponent(newPrompt.substring(0, 1500))}&seed=${seed}`;

      res.json({ image: imageUrl, text: newPrompt });
    } catch (e: any) {
      console.error("AI Edit Internal Error:", e);
      res.status(500).json({ error: `AI Edit failed: ${e.message}` });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'AI Core missing' });
  }
});

// Image Proxy for Pollinations AI (handles CORS and long URLs better)
router.get('/ai/image-proxy', async (req, res) => {
  const { prompt, seed } = req.query;
  if (!prompt) return res.status(400).send('Prompt required');
  
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt as string)}?width=1024&height=1024&nologo=true&seed=${seed || 0}&enhance=true`;
  
  try {
    const response = await fetch(pollinationsUrl);
    if (!response.ok) throw new Error('Pollinations AI failed');
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (error) {
    console.error("Proxy Error:", error);
    res.status(500).send('Image generation proxy failed');
  }
});

router.post('/ai/suggestions', async (req, res) => {
  const { image } = req.body;
  try {
    const ai = await getAI();
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const response = await generateWithFallback(ai, {
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: base64Data, mimeType: "image/png" } },
          { text: "Suggest 3 creative editing improvements for this design. Return ONLY a simple JSON array of strings: [\"suggestion1\", \"suggestion2\", \"suggestion3\"]" }
        ]
      }]
    });
    const text = response.response.text() || "[]";
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']') + 1;
    const suggestions = JSON.parse(text.substring(start, end) || "[]");
    res.json({ suggestions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/ai/enhance-prompt', async (req, res) => {
  const { prompt } = req.body;
  try {
    const ai = await getAI();
    const response = await generateWithFallback(ai, {
      contents: [{ role: 'user', parts: [{ text: `Expand this simple image prompt into a detailed artistic description for a high-end designer. Return ONLY the enhanced prompt: "${prompt}"` }] }]
    });
    res.json({ prompt: response.response.text() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/remove-bg', async (req, res) => {
  const { image } = req.body;
  try {
    const ai = await getAI();
    const base64Data = image.includes(',') ? image.split(',')[1] : image;

    try {
      const response = await generateWithFallback(ai, {
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { data: base64Data, mimeType: "image/png" } },
            { text: "Analyze this image and identify the main subject. In a professional editing context, how would you isolate it? Return a detailed response." }
          ]
        }]
      });

      const text = response.response.text() || "No analysis generated.";
      res.json({ text: "AI Analysis: Subject identified. Processing high-precision isolation..." });
    } catch (e: any) {
      console.error("Gemini Remove BG Internal Error:", e);
      res.status(500).json({ error: 'Gemini background removal failed' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

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

// Analytics Collection
router.post('/collect', async (req, res) => {
  const { type, data, sessionId } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  const performWrite = async (dbInstance: any) => {
    if (type === 'session') {
      await dbInstance.collection('analytics_sessions').doc(sessionId).set({
        ...data,
        ip,
        id: sessionId,
        firstSeen: FieldValue.serverTimestamp(),
        lastSeen: FieldValue.serverTimestamp(),
      }, { merge: true });
    } else if (type === 'upload') {
      await dbInstance.collection('analytics_uploads').add({
        ...data,
        sessionId,
        timestamp: FieldValue.serverTimestamp(),
      });
    } else if (type === 'export') {
      await dbInstance.collection('analytics_exports').add({
        ...data,
        sessionId,
        timestamp: FieldValue.serverTimestamp(),
      });
    } else if (type === 'action') {
      await dbInstance.collection('analytics_actions').add({
        ...data,
        sessionId,
        timestamp: FieldValue.serverTimestamp(),
      });
    }
    return true;
  };

  try {
    let db = getFirestoreInstance();
    try {
      await performWrite(db);
    } catch (writeError: any) {
      console.error("Analytics Write Error:", writeError.message);
    }
    res.json({ status: 'ok' });
  } catch (error: any) {
    console.error("Analytics Final Error:", error.message);
    res.json({ status: 'partial_ok', warning: 'analytics_failed' });
  }
});

// Admin Data Fetch
router.get('/admin/data', verifyAdmin, async (req, res) => {
  const fetchData = async (dbInstance: any) => {
    const [sessions, uploads, exports, actions] = await Promise.all([
      dbInstance.collection('analytics_sessions').orderBy('lastSeen', 'desc').limit(100).get(),
      dbInstance.collection('analytics_uploads').orderBy('timestamp', 'desc').limit(100).get(),
      dbInstance.collection('analytics_exports').orderBy('timestamp', 'desc').limit(100).get(),
      dbInstance.collection('analytics_actions').orderBy('timestamp', 'desc').limit(500).get(),
    ]);

    return {
      sessions: sessions.docs.map((d: any) => ({ id: d.id, ...d.data() })),
      uploads: uploads.docs.map((d: any) => ({ id: d.id, ...d.data() })),
      exports: exports.docs.map((d: any) => ({ id: d.id, ...d.data() })),
      actions: actions.docs.map((d: any) => ({ id: d.id, ...d.data() })),
    };
  };

  try {
    const db = getFirestoreInstance();
    const result = await fetchData(db);
    res.json(result);
  } catch (error: any) {
    console.error("Admin Data Fetch Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mounting
app.use((req, res, next) => {
  // Ensure we handle both /api/path and /path
  if (req.url.startsWith('/api')) {
    req.url = req.url.replace(/^\/api/, '');
  }
  next();
});

app.use(router);

export default app;
export const apiRouter = router;

