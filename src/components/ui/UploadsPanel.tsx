import React, { useState, useRef } from 'react';
import { Upload, Trash2, Wand2, Eraser, Plus, Image as ImageIcon, Sparkles, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { generateAIImage, editImageWithAI, removeBackground } from '../../services/geminiService';

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
    const filesArray = Array.from(uploadedFiles);
    let loadedCount = 0;

    filesArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newFile = {
          id: Math.random().toString(36).substr(2, 9),
          url: event.target?.result as string,
          name: file.name
        };
        
        setFiles(prev => {
          const updated = [newFile, ...prev];
          // Set active file if it's the first one being added or currently none is active
          if (!activeFile && updated.length > 0) setActiveFile(newFile);
          return updated;
        });

        loadedCount++;
        if (loadedCount === filesArray.length) {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        loadedCount++;
        if (loadedCount === filesArray.length) setIsUploading(false);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (activeFile?.id === id) setActiveFile(null);
  };

  const handleAIRefine = async () => {
    if (!activeFile || !prompt) return;
    setIsProcessing(true);
    try {
      const newImageUrl = await editImageWithAI(activeFile.url, prompt);
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

  return (
    <div className="flex flex-col h-full bg-black/10">
      <div className="p-6 pb-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Uploads</h2>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-white/5 rounded-lg text-purple-400 border border-purple-500/30 transition-all flex items-center gap-2"
          >
            <Upload size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Upload New</span>
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

      <div className="flex-1 overflow-y-auto px-6 space-y-6 custom-scrollbar">
        {files.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {files.map(file => (
              <div 
                key={file.id}
                onClick={() => setActiveFile(file)}
                className={cn(
                  "group relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all",
                  activeFile?.id === file.id ? "border-purple-500 shadow-lg shadow-purple-500/20" : "border-white/5 hover:border-white/20"
                )}
              >
                <img src={file.url} className="w-full h-full object-cover" alt={file.name} />
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-[8px] text-white truncate font-medium">{file.name}</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                  className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-gray-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={12} />
                </button>
                <button 
                   onClick={(e) => { e.stopPropagation(); onAddImage(file.url); }}
                   className="absolute inset-0 bg-purple-600/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                >
                   <Plus className="text-white drop-shadow-lg" size={24} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-white/10 rounded-3xl cursor-pointer hover:border-purple-500/30 hover:bg-white/5 transition-all group"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload size={32} className="text-gray-500 group-hover:text-purple-400" />
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Drop images here</p>
            <p className="text-[10px] text-gray-600 mt-1">PNG, JPG, SVG up to 10MB</p>
          </div>
        )}

        {/* AI Actions Section */}
        <AnimatePresence>
          {activeFile && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-8 p-5 bg-[#1A1A1A] border border-white/5 rounded-3xl space-y-4 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-purple-400" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white">AI Edit Center</h3>
                </div>
                <button onClick={() => setActiveFile(null)} className="text-gray-500 hover:text-white">
                  <X size={14} />
                </button>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={handleRemoveBG}
                  disabled={isProcessing}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2.5 flex flex-col items-center gap-1 transition-all group"
                >
                  <Eraser size={16} className="text-gray-400 group-hover:text-purple-400" />
                  <span className="text-[8px] font-black uppercase tracking-tighter text-gray-500 group-hover:text-white">Remove BG</span>
                </button>
                <div className="w-px h-10 bg-white/5 my-auto" />
                <div className="flex-1 bg-white/5 opacity-50 border border-white/10 rounded-xl py-2.5 flex flex-col items-center gap-1">
                   <ImageIcon size={16} className="text-gray-600" />
                   <span className="text-[8px] font-black uppercase tracking-tighter text-gray-600">Smart Crop</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 ml-1">AI Refine Prompt (Optional)</label>
                <div className="relative">
                  <textarea 
                    placeholder="e.g. Change hair to blue, add sunglasses, make it sunset..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[10px] text-gray-300 min-h-[80px] outline-none focus:border-purple-500/50 transition-all placeholder:text-gray-700 leading-relaxed"
                  />
                  <button 
                    onClick={handleAIRefine}
                    disabled={!prompt || isProcessing}
                    className="absolute bottom-2 right-2 p-2 bg-purple-500 hover:bg-purple-400 disabled:opacity-50 disabled:bg-gray-700 text-white rounded-lg transition-all shadow-lg"
                  >
                    {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                  </button>
                </div>
              </div>

              {/* Glowing Background Effect */}
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/5 blur-3xl pointer-events-none rounded-full" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
