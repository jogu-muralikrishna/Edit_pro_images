import React, { useState, useRef } from 'react';
import { Upload, Trash2, Wand2, Eraser, Plus, Image as ImageIcon, Sparkles, X, Loader2, Zap, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { editImageWithAI, removeBackground, getEditingSuggestions } from '../../services/geminiService';
import { analytics } from '../../services/analyticsService';

interface UploadsPanelProps {
  onAddImage: (url: string) => void;
}

interface UploadedFile {
  id: string;
  url: string;
  name: string;
}

export const UploadsPanel: React.FC<UploadsPanelProps> = ({ onAddImage }) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeFile, setActiveFile] = useState<UploadedFile | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    setIsUploading(true);
    Array.from(uploadedFiles).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const newFile = {
          id: Math.random().toString(36).substr(2, 9),
          url,
          name: file.name
        };
        setFiles(prev => [newFile, ...prev]);
        if (files.length === 0) setActiveFile(newFile);
        
        // Tracking
        analytics.trackUpload(url, file);
      };
      reader.readAsDataURL(file);
    });
    setIsUploading(false);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (activeFile?.id === id) setActiveFile(null);
  };

  const handleAIRefine = async (customPrompt?: string) => {
    const finalPrompt = customPrompt || prompt;
    if (!activeFile || !finalPrompt) return;
    setIsProcessing(true);
    try {
      const newImageUrl = await editImageWithAI(activeFile.url, finalPrompt);
      onAddImage(newImageUrl);
      setPrompt('');
    } catch (error) {
      console.error("AI Refine Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveBG = async () => {
    if (!activeFile) return;
    setIsProcessing(true);
    try {
      const newImageUrl = await removeBackground(activeFile.url);
      onAddImage(newImageUrl);
    } catch (error) {
      console.error("Remove BG Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEnhance = async () => {
    if (!activeFile) return;
    setIsProcessing(true);
    try {
      const newImageUrl = await editImageWithAI(activeFile.url, "Enhance image: improve resolution, fix lighting, sharpen details, professional color grade, 4k ultra hd quality");
      onAddImage(newImageUrl);
    } catch (error) {
      console.error("Enhance Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0F0F0F]">
      <div className="p-6 pb-2 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white italic">Gallery</h2>
            <p className="text-[9px] text-gray-500 font-medium">Assets & Uploads</p>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-purple-400 border border-white/10 transition-all flex items-center gap-2"
          >
            <Upload size={12} />
            <span className="text-[9px] font-black uppercase tracking-widest">New</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            multiple 
            accept="image/*" 
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-6 custom-scrollbar pb-6">
        {files.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {files.map(file => (
              <motion.div 
                key={file.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setActiveFile(file)}
                className={cn(
                  "group relative aspect-square rounded-2xl overflow-hidden cursor-pointer border transition-all duration-300",
                  activeFile?.id === file.id ? "border-purple-500 shadow-lg shadow-purple-500/20 scale-[0.98]" : "border-white/5 hover:border-white/20"
                )}
              >
                <img src={file.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={file.name} />
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-[8px] text-white truncate font-medium">{file.name}</p>
                </div>
                <div className="absolute top-1.5 right-1.5 flex gap-1 transform translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                    className="p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-gray-400 hover:text-rose-400 border border-white/5"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
                <button 
                   onClick={(e) => { e.stopPropagation(); onAddImage(file.url); }}
                   className="absolute inset-0 bg-purple-600/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all bg-black/20"
                >
                   <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 transform scale-0 group-hover:scale-100 transition-transform">
                    <Plus className="text-white" size={16} />
                   </div>
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-white/5 rounded-3xl cursor-pointer hover:border-purple-500/20 hover:bg-white/5 transition-all group"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-500">
              <Upload size={24} className="text-gray-600 group-hover:text-purple-400" />
            </div>
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Upload Images</p>
          </div>
        )}

        <AnimatePresence>
          {activeFile && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-4 p-5 bg-[#141414] border border-white/10 rounded-3xl space-y-5 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-purple-400" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white italic">Neural Engine</h3>
                </div>
                <button onClick={() => setActiveFile(null)} className="text-gray-600 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleRemoveBG}
                  disabled={isProcessing}
                  className="py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-[9px] font-black uppercase tracking-widest text-purple-300 transition-all flex flex-col items-center gap-1.5 group disabled:opacity-30"
                >
                  <Eraser size={14} className="group-hover:scale-110 transition-transform" />
                  Auto Cutout
                </button>
                <button 
                  onClick={handleEnhance}
                  disabled={isProcessing}
                  className="py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl text-[9px] font-black uppercase tracking-widest text-blue-300 transition-all flex flex-col items-center gap-1.5 group disabled:opacity-30"
                >
                  <Zap size={14} className="group-hover:scale-110 transition-transform" />
                  AI Enhance
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1 italic">Transformation</label>
                    <button 
                      onClick={async () => {
                        if (!activeFile) return;
                        setIsProcessing(true);
                        try {
                          const suggestions = await getEditingSuggestions(activeFile.url);
                          if (suggestions.length > 0) {
                            setPrompt(suggestions[Math.floor(Math.random() * suggestions.length)]);
                          }
                        } catch (e) { console.error(e); } finally { setIsProcessing(false); }
                      }}
                      className="p-1 px-2 bg-white/5 hover:bg-white/10 rounded-lg text-purple-400 transition-all flex items-center gap-1.5"
                      title="AI Suggestions"
                    >
                      <Sparkles size={10} />
                      <span className="text-[8px] font-bold uppercase">Suggest</span>
                    </button>
                  </div>
                  
                  <div className="relative group/prompt">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-0 group-focus-within/prompt:opacity-20 transition duration-500" />
                    <div className="relative flex gap-2">
                      <textarea 
                        placeholder="e.g. Turn this into a vintage oil painting..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-[10px] text-gray-300 min-h-[100px] outline-none focus:border-purple-500/50 transition-all placeholder:text-gray-700 leading-relaxed resize-none custom-scrollbar"
                      />
                      <button 
                        onClick={() => handleAIRefine()}
                        disabled={!prompt || isProcessing}
                        className="absolute bottom-3 right-3 w-10 h-10 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white rounded-xl transition-all shadow-xl flex items-center justify-center group/btn"
                      >
                        {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} className="group-hover/btn:rotate-12 transition-transform" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {[
                    { label: 'Anime', prompt: 'convert to high quality anime style' },
                    { label: 'Cyber', prompt: 'apply neon cyberpunk aesthetic' },
                    { label: 'Sketch', prompt: 'convert to pencil sketch art' }
                  ].map(p => (
                    <button 
                      key={p.label}
                      onClick={() => handleAIRefine(p.prompt)}
                      disabled={isProcessing}
                      className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[8px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all disabled:opacity-30"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
                      <Sparkles size={16} className="absolute inset-0 m-auto text-purple-400 animate-pulse" />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white">Neural Processing...</span>
                  </div>
                </div>
              )}

              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/5 blur-3xl pointer-events-none rounded-full" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

