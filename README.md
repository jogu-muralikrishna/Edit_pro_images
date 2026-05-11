# Edit Pro - Advanced AI Media Editor

A professional-grade AI design tool with deep Gemini integration, Unsplash/Pexels support, and cloud syncing via Firebase.

## 🚀 Deployment to Vercel (Step-by-Step)

If you see a **Black Page** or **Firebase Error** on Vercel, follow these steps exactly:

### 1. Configure Vercel Dashboard
1. Go to your project on [Vercel](https://vercel.com).
2. Go to **Settings > General**.
3. **Framework Preset**: Should be **Vite**.
4. **Root Directory**: Leave as is (or `.` ).
5. **Output Directory**: Ensure it is set to `dist` (default for Vite).

### 2. Set Environment Variables
Go to **Settings > Environment Variables** and add:
- `GEMINI_API_KEY`: (Get from AI Studio)
- `UNSPLASH_ACCESS_KEY`: (Optional, for stock photos)
- `PEXELS_API_KEY`: (Optional, for videos/photos)
- **Firebase Keys** (Copy these from `firebase-applet-config.json`):
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`

### 3. Troubleshooting "Black Page"
- **Reason 1: Missing API Keys**: If Firebase doesn't find an API key, it might crash the app on boot. I've added a fix to prevent the crash, but you must still provide the keys for it to work.
- **Reason 2: Routing**: If you get a 404 on refresh, `vercel.json` is already configured to handle SPA routing.
- **Reason 3: Mixed Content**: Ensure all API calls use the `/api/...` prefix which is proxied securely.

## 🛠 Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Setup Env**:
   Create a `.env` file from `.env.example` and fill in your keys.

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   This runs both the Express backend and Vite frontend on [http://localhost:3000](http://localhost:3000).

## 📁 Architecture
- `api/index.ts`: The unified Express entry point for serverless deployment (Vercel).
- `server.ts`: The entry point for local development and standard Node environments.
- `src/services/geminiService.ts`: Communicates with the backend proxy to keep API keys secure.
- `src/lib/firebase.ts`: Handles configuration automatically for both AI Studio and production.

## 🛡 Security
- **API Proxying**: All sensitive API keys remain on the server.
- **Environment Variables**: Frontend uses `VITE_` prefix for client-accessible variables.
- **Firebase Rules**: Hardened Firestore rules are ready for production.

