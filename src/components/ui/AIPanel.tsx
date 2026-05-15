import React, { useState, useEffect } from 'react';
import { Sparkles, Wand2, Loader2, Image as ImageIcon, Zap, ChevronDown, Check, LayoutGrid, Sliders, RefreshCcw } from 'lucide-react';
import { generateAIImage, enhancePrompt } from '../../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { db, auth } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';

interface AIPanelProps {
  onAddImage: (url: string) => void;
}

const STYLES = [
  { id: 'realistic', name: 'Realistic', icon: '📸', keywords: 'ultra realistic, 8k, highly detailed, photorealistic, cinematic' },
  { id: 'anime', name: 'Anime', icon: '🎌', keywords: 'anime style, vibrant colors, studio ghibli feel, sharp lines' },
  { id: 'fantasy', name: 'Fantasy', icon: '🧙', keywords: 'fantasy art, magical, ethereal, mythical, epic scale' },
  { id: 'cinematic', name: 'Cinematic', icon: '🎬', keywords: 'dramatic lighting, film grain, cinematic composition, moody' },
  { id: 'cyberpunk', name: 'Cyberpunk', icon: '🏙️', keywords: 'neon lights, futuristic, rainy city, synthwave aesthetic' },
  { id: '3d', name: '3D Render', icon: '🧊', keywords: 'octane render, unreal engine 5 style, volumetric lighting' },
  { id: 'oil', name: 'Oil Painting', icon: '🎨', keywords: 'oil painting texture, brush strokes, classical art style' },
  { id: 'luxury', name: 'Luxury', icon: '💎', keywords: 'elegant, high-end, gold accents, professional product photography' },
];

export const AIPanel: React.FC<AIPanelProps> = ({ onAddImage }) => {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [history, setHistory] = useState<{url: string, prompt: string}[]>([]);
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load history from Firestore
  useEffect(() => {
    const loadHistory = async () => {
      if (auth.currentUser) {
        try {
          const q = query(
            collection(db, 'history'),
            where('userId', '==', auth.currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(20)
          );
          const snap = await getDocs(q);
          const docs = snap.docs.map(d => d.data() as {url: string, prompt: string});
          setHistory(docs);
        } catch (e) {
          console.error("History Load Error:", e);
        }
      }
    };
    loadHistory();
  }, []);

  const handleGenerate = async (overriddenPrompt?: string) => {
    const finalPrompt = overriddenPrompt || prompt;
    if (!finalPrompt.trim()) return;
    
    setLoading(true);
    try {
      const fullPrompt = `${selectedStyle.keywords}. ${finalPrompt} ${negativePrompt ? `--no ${negativePrompt}` : ''}`;
      const url = await generateAIImage(fullPrompt);
      onAddImage(url);
      
      const newEntry = { url, prompt: finalPrompt };
      setHistory(prev => [newEntry, ...prev]);

      // Save to Firestore
      if (auth.currentUser) {
        try {
          await addDoc(collection(db, 'history'), {
            ...newEntry,
            userId: auth.currentUser.uid,
            createdAt: serverTimestamp()
          });
        } catch (e) {
          console.error("History Save Error:", e);
        }
      }

      if (!overriddenPrompt) setPrompt('');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnhance = async () => {
    if (!prompt.trim()) return;
    setEnhancing(true);
    try {
      const enhanced = await enhancePrompt(prompt);
      setPrompt(enhanced);
    } catch (error) {
      console.error(error);
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0F0F0F]">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-400" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white italic">AI Creative Engine</h2>
          </div>
          <p className="text-[10px] text-gray-500 font-medium">Turn imagination into production-grade visuals.</p>
        </div>

        <div className="space-y-4">
          {/* Prompt Input area */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000 group-hover:duration-200" />
            <div className="relative bg-black/40 border border-white/10 rounded-2xl overflow-hidden focus-within:border-purple-500/50 transition-all">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: A futuristic lab with glowing plants..."
                className="bg-transparent w-full text-xs p-4 resize-none focus:outline-none min-h-[100px] text-gray-200 placeholder:text-gray-600 custom-scrollbar"
              />
              
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <button
                  onClick={handleEnhance}
                  disabled={enhancing || !prompt.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold uppercase tracking-wider text-purple-400 transition-all border border-white/5 disabled:opacity-30"
                >
                  {enhancing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                  Smart Enhance
                </button>
                
                <span className="text-[9px] font-mono text-gray-600">{prompt.length}/1000</span>
              </div>
            </div>
          </div>

          {/* Advanced / Negative Prompt */}
          <div className="space-y-2">
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors ml-1"
            >
              <Sliders size={10} />
              Advanced Options
              <ChevronDown size={10} className={cn("transition-transform", showAdvanced && "rotate-180")} />
            </button>
            
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-2"
                >
                  <div className="bg-black/20 border border-white/5 rounded-xl p-3">
                    <label className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-600 mb-2 block">Negative Prompt (Avoid these)</label>
                    <input 
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="e.g. Blurry, low quality, distorted hands..."
                      className="w-full bg-transparent text-[10px] text-gray-400 outline-none placeholder:text-gray-700"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Style Selector */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Artistic Style</label>
            <div className="relative">
              <button
                onClick={() => setIsStyleOpen(!isStyleOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{selectedStyle.icon}</span>
                  <span className="text-xs font-bold text-gray-200">{selectedStyle.name}</span>
                </div>
                <ChevronDown size={14} className={cn("text-gray-500 transition-transform duration-300", isStyleOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isStyleOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 right-0 mt-2 p-2 bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl z-50 grid grid-cols-2 gap-1 backdrop-blur-3xl"
                  >
                    {STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => {
                          setSelectedStyle(style);
                          setIsStyleOpen(false);
                        }}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-xl transition-all text-left",
                          selectedStyle.id === style.id ? "bg-purple-500/20 text-purple-300" : "hover:bg-white/5 text-gray-400 hover:text-white"
                        )}
                      >
                        <span className="text-sm">{style.icon}</span>
                        <span className="text-[10px] font-bold">{style.name}</span>
                        {selectedStyle.id === style.id && <Check size={10} className="ml-auto" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button
            onClick={() => handleGenerate()}
            disabled={loading || !prompt.trim()}
            className="w-full relative group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 animate-gradient-x" />
            <div className="relative py-3.5 bg-black/20 backdrop-blur-sm m-[1px] rounded-xl flex items-center justify-center gap-2 group-hover:bg-transparent transition-all disabled:opacity-30">
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Synthesizing...</span>
                </div>
              ) : (
                <>
                  <Sparkles size={14} className="text-white group-hover:rotate-12 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Generate Masterpiece</span>
                </>
              )}
            </div>
          </button>
        </div>

        {/* History Section */}
        {history.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid size={14} className="text-gray-500" />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Creation History</h3>
              </div>
              <button 
                onClick={() => setHistory([])}
                className="text-[9px] font-bold uppercase text-gray-600 hover:text-rose-400 transition-colors"
              >
                Clear All
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pb-6">
              {history.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -4 }}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all shadow-lg"
                >
                  <img src={item.url} alt={item.prompt} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3">
                    <p className="text-[8px] text-white font-medium line-clamp-2 leading-tight mb-2">{item.prompt}</p>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => onAddImage(item.url)}
                        className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 py-1.5 rounded-lg flex items-center justify-center transition-colors"
                        title="Add to Canvas"
                      >
                        <ImageIcon className="text-white" size={10} />
                      </button>
                      <button 
                        onClick={() => handleGenerate(item.prompt)}
                        className="flex-1 bg-purple-500/20 hover:bg-purple-500/40 backdrop-blur-md border border-purple-500/30 py-1.5 rounded-lg flex items-center justify-center transition-colors text-purple-200"
                        title="Try variation"
                      >
                        <RefreshCcw size={10} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
