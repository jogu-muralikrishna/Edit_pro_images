import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Type, Sparkles, Wand2, Info, X, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Download, Eraser, Zap, Palette } from 'lucide-react';
import { detectTextStyle, removeBackground, editImageWithAI, getEditingSuggestions } from '../../services/geminiService';
import { Canvas, FabricImage, IText } from 'fabric';
import { cn } from '../../lib/utils';
import { analytics } from '../../services/analyticsService';

interface PhotoEditPanelProps {
  canvas: Canvas | null;
  onAddImage: (url: string) => void;
  setLoading: (loading: boolean) => void;
  projectName: string;
}

export const PhotoEditPanel: React.FC<PhotoEditPanelProps> = ({ canvas, onAddImage, setLoading, projectName }) => {
  const [detectedStyle, setDetectedStyle] = useState<any>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [selectedText, setSelectedText] = useState<IText | null>(null);
  const [selectedImage, setSelectedImage] = useState<FabricImage | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!canvas) return;

    const handleSelection = () => {
      const active = canvas.getActiveObject();
      if (active && (active.type === 'i-text' || active.type === 'text')) {
        setSelectedText(active as IText);
        setSelectedImage(null);
      } else if (active && active.type === 'image') {
        setSelectedImage(active as FabricImage);
        setSelectedText(null);
      } else {
        setSelectedText(null);
        setSelectedImage(null);
      }
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleSelection);
    canvas.on('object:modified', handleSelection);

    handleSelection();

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared', handleSelection);
      canvas.off('object:modified', handleSelection);
    };
  }, [canvas]);

  const updateText = (props: any) => {
    if (!selectedText || !canvas) return;
    selectedText.set(props);
    canvas.renderAll();
    setSelectedText(Object.assign(Object.create(Object.getPrototypeOf(selectedText)), selectedText));
  };

  const handleExport = () => {
    if (!canvas) return;
    const dataURL = canvas.toDataURL({ 
      format: 'png', 
      quality: 1,
      multiplier: 2
    });
    const link = document.createElement('a');
    link.download = `${projectName}.png`;
    link.href = dataURL;
    link.click();
  };

  const startWebcam = async () => {
    setShowWebcam(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Webcam Error:", err);
      alert("Please allow camera access to take a photo.");
      setShowWebcam(false);
    }
  };

  const syncStyle = async () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'image') {
      alert('Please select an image first!');
      return;
    }

    setLoading(true);
    try {
      const img = activeObject as FabricImage;
      const dataUrl = img.toDataURL();
      const style = await detectTextStyle(dataUrl);
      
      if (style && style.fontFamily) {
        setDetectedStyle(style);
        // Add a new text object with detected style
        const text = new IText('AI Managed Text', {
          left: (img.left || 0) + (img.getScaledWidth() || 0) / 4,
          top: (img.top || 0) + (img.getScaledHeight() || 0) / 4,
          fontFamily: style.fontFamily || 'Inter',
          fontSize: style.fontSize || 40,
          fill: style.color || '#ffffff',
          fontWeight: style.fontWeight || 'normal',
          textAlign: style.textAlign || 'center',
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.renderAll();
      } else if (style && (style as any).error) {
        alert(`AI Style Analysis: ${(style as any).error}`);
      } else {
        alert('AI could not analyze the image style. Please ensure the image contains readable text.');
      }
    } catch (error: any) {
      console.error(error);
      const msg = error?.message || "Unknown error";
      if (msg.includes('Not Found') || msg.includes('404')) {
        alert('AI Service update in progress. Please try again in 30 seconds.');
      } else {
        alert('Error during style analysis. Please try a different image.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full custom-scrollbar">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Edit Photo</h2>
        <div className="group relative">
          <Info size={14} className="text-gray-600 hover:text-gray-400 cursor-help" />
          <div className="absolute right-0 top-6 w-48 p-2 bg-black/90 border border-white/10 rounded-lg text-[8px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
            Upload images, take photos, or sync styles. Use the toolset below to refine your design.
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {selectedText ? (
          <div className="glass-card p-5 space-y-4 border-purple-500/30 animate-in fade-in zoom-in-95 duration-200">
             <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2">
                 <Type size={14} className="text-purple-400" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-white">Edit Text</span>
               </div>
               <button onClick={() => { canvas?.discardActiveObject(); canvas?.renderAll(); }} className="p-1 hover:bg-white/10 rounded-full transition-all">
                 <X size={12} className="text-gray-500" />
               </button>
             </div>

             <div className="space-y-3">
               <textarea 
                 value={selectedText.text || ''}
                 onChange={(e) => updateText({ text: e.target.value })}
                 className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white outline-none focus:border-purple-500/50 min-h-[60px] resize-none font-medium"
                 placeholder="Enter text..."
               />

               <div className="grid grid-cols-5 gap-1">
                 <button 
                  onClick={() => updateText({ fontWeight: selectedText.fontWeight === 'bold' ? 'normal' : 'bold' })}
                  className={cn("p-2 rounded-lg border transition-all flex items-center justify-center", selectedText.fontWeight === 'bold' ? "bg-purple-500/20 border-purple-500/50 text-purple-300" : "bg-white/5 border-white/10 text-gray-400")}
                 >
                   <Bold size={12} />
                 </button>
                 <button 
                  onClick={() => updateText({ fontStyle: selectedText.fontStyle === 'italic' ? 'normal' : 'italic' })}
                  className={cn("p-2 rounded-lg border transition-all flex items-center justify-center", selectedText.fontStyle === 'italic' ? "bg-purple-500/20 border-purple-500/50 text-purple-300" : "bg-white/5 border-white/10 text-gray-400")}
                 >
                   <Italic size={12} />
                 </button>
                 <button 
                  onClick={() => updateText({ textAlign: 'left' })}
                  className={cn("p-2 rounded-lg border transition-all flex items-center justify-center", selectedText.textAlign === 'left' ? "bg-purple-500/20 border-purple-500/50 text-purple-300" : "bg-white/5 border-white/10 text-gray-400")}
                 >
                   <AlignLeft size={12} />
                 </button>
                 <button 
                  onClick={() => updateText({ textAlign: 'center' })}
                  className={cn("p-2 rounded-lg border transition-all flex items-center justify-center", selectedText.textAlign === 'center' ? "bg-purple-500/20 border-purple-500/50 text-purple-300" : "bg-white/5 border-white/10 text-gray-400")}
                 >
                   <AlignCenter size={12} />
                 </button>
                 <button 
                  onClick={() => updateText({ textAlign: 'right' })}
                  className={cn("p-2 rounded-lg border transition-all flex items-center justify-center", selectedText.textAlign === 'right' ? "bg-purple-500/20 border-purple-500/50 text-purple-300" : "bg-white/5 border-white/10 text-gray-400")}
                 >
                   <AlignRight size={12} />
                 </button>
               </div>

               <button 
                className="w-full py-2 bg-gradient-to-r from-purple-600/80 to-blue-600/80 hover:from-purple-600 hover:to-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2 group shadow-lg shadow-purple-900/20"
                onClick={async () => {
                  if (!selectedText.text) return;
                  setLoading(true);
                  try {
                    const response = await fetch('/api/ai/enhance-prompt', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ prompt: `Improve this marketing text/copy: "${selectedText.text}". Make it catchy, professional, and short. Return ONLY the improved text.` })
                    });
                    const data = await response.json();
                    if (data.prompt) updateText({ text: data.prompt });
                  } catch (e) { console.error(e); } finally { setLoading(false); }
                }}
               >
                 <Sparkles size={12} className="group-hover:rotate-12 transition-all" />
                 AI Rewrite & Polish
               </button>
             </div>
          </div>
        ) : selectedImage ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="glass-card p-5 space-y-4 border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-blue-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Neural Photo Editor</span>
                  </div>
                  <button onClick={() => { canvas?.discardActiveObject(); canvas?.renderAll(); }} className="p-1 hover:bg-white/10 rounded-full transition-all">
                    <X size={12} className="text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                     onClick={async () => {
                       const url = (selectedImage as any).src || (selectedImage as any).getSrc?.();
                       if (!url) return;
                       setLoading(true);
                       try {
                         const newUrl = await removeBackground(url);
                         await (selectedImage as any).setSrc(newUrl);
                         canvas?.renderAll();
                       } catch (e) { console.error(e); } finally { setLoading(false); }
                     }}
                     className="py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-[9px] font-black uppercase tracking-widest text-purple-300 transition-all flex flex-col items-center gap-1.5 group"
                   >
                     <Eraser size={14} className="group-hover:scale-110 transition-transform" />
                     Remove BG
                   </button>
                   <button 
                     onClick={async () => {
                       const url = (selectedImage as any).src || (selectedImage as any).getSrc?.();
                       if (!url) return;
                       setLoading(true);
                       try {
                         const newUrl = await editImageWithAI(url, "Professional studio quality enhancement, 4k detail, perfect lighting");
                         await (selectedImage as any).setSrc(newUrl);
                         canvas?.renderAll();
                       } catch (e) { console.error(e); } finally { setLoading(false); }
                     }}
                     className="py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl text-[9px] font-black uppercase tracking-widest text-blue-300 transition-all flex flex-col items-center gap-1.5 group"
                   >
                     <Zap size={14} className="group-hover:scale-110 transition-transform" />
                     AI Enhance
                   </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">AI Transform</label>
                    <button 
                      onClick={async () => {
                        const url = (selectedImage as any).src || (selectedImage as any).getSrc?.();
                        if (!url) return;
                        const suggestions = await getEditingSuggestions(url);
                        if (suggestions.length > 0) {
                          const input = document.getElementById('panelImagePrompt') as HTMLInputElement;
                          if (input) input.value = suggestions[0];
                        }
                      }}
                      className="text-white/50 hover:text-white"
                    ><Sparkles size={10} /></button>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      id="panelImagePrompt"
                      type="text" 
                      placeholder="e.g. Change to oil painting"
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-blue-500/50"
                    />
                    <button 
                      onClick={async () => {
                        const input = document.getElementById('panelImagePrompt') as HTMLInputElement;
                        if (!input.value) return;
                        const url = (selectedImage as any).src || (selectedImage as any).getSrc?.();
                        if (!url) return;
                        setLoading(true);
                        try {
                          const newUrl = await editImageWithAI(url, input.value);
                          await (selectedImage as any).setSrc(newUrl);
                          canvas?.renderAll();
                          input.value = '';
                        } catch (e) { console.error(e); } finally { setLoading(false); }
                      }}
                      className="w-10 bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center transition-all"
                    >
                      <Wand2 size={14} className="text-white" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                   {['Anime', 'Sketch', 'Neon'].map(f => (
                     <button 
                        key={f}
                        onClick={async () => {
                          const url = (selectedImage as any).src || (selectedImage as any).getSrc?.();
                          if (!url) return;
                          setLoading(true);
                          try {
                            const newUrl = await editImageWithAI(url, `Apply ${f} artistic style`);
                            await (selectedImage as any).setSrc(newUrl);
                            canvas?.renderAll();
                          } catch (e) { console.error(e); } finally { setLoading(false); }
                        }}
                        className="py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[8px] font-bold text-gray-400 hover:text-white uppercase tracking-tighter transition-all"
                      >{f}</button>
                   ))}
                </div>

                <div className="pt-2 space-y-4 border-t border-white/5 mt-2">
                   <div className="space-y-1.5">
                     <div className="flex items-center justify-between ml-1">
                       <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Opacity</label>
                       <span className="text-[10px] font-mono text-purple-400">{Math.round((selectedImage.opacity || 0) * 100)}%</span>
                     </div>
                     <input 
                       type="range" min="0" max="1" step="0.01" 
                       value={selectedImage.opacity}
                       onChange={(e) => {
                         selectedImage.set({ opacity: parseFloat(e.target.value) });
                         canvas?.renderAll();
                         setSelectedImage(Object.assign(Object.create(Object.getPrototypeOf(selectedImage)), selectedImage));
                       }}
                       className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-500"
                     />
                   </div>

                   <div className="space-y-1.5">
                     <div className="flex items-center justify-between ml-1">
                       <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Scale</label>
                       <span className="text-[10px] font-mono text-purple-400">{Math.round((selectedImage.scaleX || 1) * 100)}%</span>
                     </div>
                     <input 
                       type="range" min="0.1" max="3" step="0.05" 
                       value={selectedImage.scaleX}
                       onChange={(e) => {
                         const val = parseFloat(e.target.value);
                         selectedImage.scale(val);
                         canvas?.renderAll();
                         setSelectedImage(Object.assign(Object.create(Object.getPrototypeOf(selectedImage)), selectedImage));
                       }}
                       className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-500"
                     />
                   </div>
                </div>
             </div>

             <div className="glass-card p-5 space-y-4 border-white/10">
                <div className="flex items-center gap-2">
                  <Palette size={14} className="text-gray-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Smart Match</span>
                </div>
                <button 
                  onClick={syncStyle}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2 group"
                >
                  <Wand2 size={14} className="group-hover:rotate-12 transition-all text-purple-400" />
                  Clone Typography
                </button>
             </div>

             <button 
               onClick={handleExport}
               className="w-full py-4 bg-white text-black hover:bg-gray-100 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-white/5"
             >
               <Download size={16} />
               Export Result
             </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <label className="w-full">
              <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (f) => onAddImage(f.target?.result as string);
                  reader.readAsDataURL(file);
                }
              }} />
              <div className="w-full glass-card p-4 border-dashed border-white/10 hover:border-purple-500/50 flex flex-col items-center gap-2 group cursor-pointer transition-all h-[120px] justify-center text-center">
                 <Upload className="text-purple-400" size={20} />
                 <p className="text-[10px] font-bold text-white uppercase tracking-tighter">Upload Photo</p>
              </div>
            </label>
            
            <button 
              onClick={startWebcam}
              className="w-full glass-card p-4 border-dashed border-white/10 hover:border-blue-500/50 flex flex-col items-center gap-2 group cursor-pointer transition-all h-[120px] justify-center text-center"
            >
              <Camera className="text-blue-400" size={20} />
              <p className="text-[10px] font-bold text-white uppercase tracking-tighter">Capture Now</p>
            </button>
          </div>
        )}

        {showWebcam && (
          <div className="fixed inset-0 z-[1000] bg-black/90 flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-lg aspect-video bg-black rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                <button 
                  onClick={() => {
                    if (videoRef.current) {
                      const canvas = document.createElement('canvas');
                      canvas.width = videoRef.current.videoWidth;
                      canvas.height = videoRef.current.videoHeight;
                      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
                      onAddImage(canvas.toDataURL('image/png'));
                      const stream = videoRef.current.srcObject as MediaStream;
                      stream?.getTracks().forEach(track => track.stop());
                      setShowWebcam(false);
                    }
                  }}
                  className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-2xl active:scale-90 transition-all"
                >
                  <div className="w-14 h-14 rounded-full border-4 border-black" />
                </button>
                <button 
                  onClick={() => setShowWebcam(false)}
                  className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
          </div>
        )}

        {!selectedText && !selectedImage && (
          <div className="space-y-4">
            <div className="glass-card p-5 space-y-4">
               <div className="flex items-center gap-2 mb-2">
                 <Sparkles size={14} className="text-purple-400" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-white italic">AI Style Master</span>
               </div>
               
               <p className="text-[9px] text-gray-400 leading-relaxed">
                 Select an image or a text layer to unlock advanced neural editing tools. Use <span className="text-purple-400 font-bold underline">Match Typography</span> to analyze and replicate styles from any image.
               </p>

               <button 
                 onClick={syncStyle}
                 className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2 group"
               >
                 <Wand2 size={14} className="group-hover:rotate-12 transition-all text-purple-400" />
                 Match Typography
               </button>
            </div>

            <button 
               onClick={handleExport}
               className="w-full py-4 bg-white text-black hover:bg-gray-100 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-white/5"
             >
               <Download size={16} />
               Export Result
             </button>
          </div>
        )}

        {detectedStyle && !selectedText && !selectedImage && (
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2 animate-in fade-in slide-in-from-bottom-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-gray-500">Last Detected</p>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="space-y-1">
                <span className="text-[7px] text-gray-600 uppercase">Font</span>
                <p className="text-xs font-bold text-gray-300 truncate">{detectedStyle.fontFamily}</p>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[7px] text-gray-600 uppercase">Color</span>
                <div className="flex items-center justify-end gap-1.5">
                  <div className="w-2 h-2 rounded-full border border-white/10" style={{ backgroundColor: detectedStyle.color }} />
                  <p className="text-[9px] font-mono text-gray-300">{detectedStyle.color}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
