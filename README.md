# Edit Pro - Advanced AI Media Editor

A professional-grade AI design tool with deep Gemini integration, Unsplash/Pexels support, and cloud syncing via Firebase.

## 🚀 How to fix the "Black Page" on Vercel

If your app shows a black page after deploying to Vercel, it is almost certainly because **Firebase** or **Gemini** API keys are missing. I have added a safety fix to prevent the app from crashing entirely, but following these steps will make it functional:

### 1. Add Environment Variables in Vercel
Go to **Settings > Environment Variables** and add these (case-sensitive):
- `GEMINI_API_KEY`: Your key from Google AI Studio.
- `VITE_FIREBASE_API_KEY`: From your Firebase project instructions.
- `VITE_FIREBASE_AUTH_DOMAIN`: e.g. `your-project.firebaseapp.com`
- `VITE_FIREBASE_PROJECT_ID`: e.g. `your-project`
- `VITE_FIREBASE_STORAGE_BUCKET`: e.g. `your-project.firebasestorage.app`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: (numeric ID)
- `VITE_FIREBASE_APP_ID`: (long ID)

### 2. Verify Vercel Build Settings
Ensure your Vercel project settings are:
- **Framework Preset**: `Vite`
- **Build Command**: `vite build`
- **Output Directory**: `dist`

### 3. Why it was a Black Page
The app was previously crashing during boot because Firebase requires an API key to even start its service. If the key was missing on Vercel, the whole Javascript bundle would stop executing. 

**I have now patched this:** The app will now show a warning in the console but **will still render the UI** even if the keys are missing. Features like "Save Project" and "Login" will show a warning instead of crashing.

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

