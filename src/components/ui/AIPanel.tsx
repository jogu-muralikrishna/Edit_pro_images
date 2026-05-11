import React, { useState } from 'react';
import { Sparkles, Wand2, Loader2, Image as ImageIcon, Zap } from 'lucide-react';
import { generateAIImage, enhancePrompt } from '../../services/geminiService';

interface AIPanelProps {
  onAddImage: (url: string) => void;
}

export const AIPanel: React.FC<AIPanelProps> = ({ onAddImage }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const url = await generateAIImage(prompt);
      onAddImage(url);
      setHistory([url, ...history]);
      setPrompt('');
    } catch (error: any) {
      console.error(error);
      setError(error.message || "Failed to generate image. Please check your Gemini API key.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnhance = async () => {
    if (!prompt.trim()) return;
    setEnhancing(true);
    setError(null);
    try {
      const enhanced = await enhancePrompt(prompt);
      setPrompt(enhanced);
    } catch (error: any) {
      console.error(error);
      setError("Failed to enhance prompt. Check your connection.");
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">AI Generation</h2>
        <p className="text-xs text-gray-400">Transform your ideas into visual reality using Gemini AI.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4 focus-within:border-purple-500/50 transition-colors">
        {error && (
          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[9px] text-red-400 font-medium text-center">
            {error}
          </div>
        )}
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe an image to generate..."
            className="bg-transparent w-full text-sm resize-none focus:outline-none min-h-[100px] pb-10"
            rows={3}
          />
          <button
            onClick={handleEnhance}
            disabled={enhancing || !prompt.trim()}
            title="AI Magic Enhance Prompt"
            className="absolute bottom-2 right-2 p-2 bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/30 rounded-lg text-purple-300 transition-all disabled:opacity-30"
          >
            {enhancing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          </button>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="w-full mt-3 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold rounded-lg uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-30 flex items-center justify-center shadow-lg shadow-purple-500/20"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <>
              <Sparkles size={14} className="mr-2" />
              Generate Magic
            </>
          )}
        </button>
      </div>

      {history.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-white/10">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">History</h3>
          <div className="grid grid-cols-2 gap-3 pb-4">
            {history.map((url, i) => (
              <button
                key={i}
                onClick={() => onAddImage(url)}
                className="group relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all"
              >
                <img src={url} alt="AI Generated" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <ImageIcon className="text-white" size={16} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
