import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/ui/Sidebar';
import { Navbar } from '../components/ui/Navbar';
import { EditorCanvas } from '../components/canvas/EditorCanvas';
import { AIPanel } from '../components/ui/AIPanel';
import { TemplatesPanel } from '../components/ui/TemplatesPanel';
import { StockPanel } from '../components/ui/StockPanel';
import { AssetsPanel } from '../components/ui/AssetsPanel';
import { ShapesPanel } from '../components/ui/ShapesPanel';
import { DraftsPanel } from '../components/ui/DraftsPanel';
import { UploadsPanel } from '../components/ui/UploadsPanel';
import { AuthModal } from '../components/ui/AuthModal';
import { Canvas, IText, Rect, Circle, Triangle, Path, FabricImage, Shadow } from 'fabric';
import { motion, AnimatePresence } from 'motion/react';
import { MousePointer2, ZoomIn, ZoomOut, Trash2, Copy, Layers, Save, Sparkles, Wand2, PanelLeftClose, PanelLeft, Eraser, Zap } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { cn } from '../lib/utils';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { editImageWithAI, removeBackground, getEditingSuggestions } from '../services/geminiService';
import { analytics } from '../services/analyticsService';

import { ChatAssistant } from '../components/ui/ChatAssistant';
import { generateAIImage } from '../services/geminiService';

export default function ImageEditor() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('templates');
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [projectName, setProjectName] = useState('Untitled Masterpiece');
  const [zoom, setZoom] = useState(1);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    
    if (canvas) {
      canvas.on('selection:created', (e) => setSelectedObject(e.selected?.[0]));
      canvas.on('selection:updated', (e) => setSelectedObject(e.selected?.[0]));
      canvas.on('selection:cleared', () => setSelectedObject(null));
      canvas.on('object:modified', (e) => setSelectedObject(e.target));
    }

    return () => unsubscribe();
  }, [canvas]);

  const handleGeneratePoster = async (posterData: any) => {
    if (!canvas) return;
    setLoading(true);
    setProjectName(posterData.theme || 'AI Poster');
    analytics.trackAction('start_ai_poster_generation', { theme: posterData.theme });
    
    try {
      canvas.clear();
      canvas.backgroundColor = '#000000';
      canvas.renderAll();

      // 1. Load Background Image
      if (posterData.backgroundImagePrompt) {
        const bgUrl = await generateAIImage(posterData.backgroundImagePrompt);
        await new Promise<void>((resolve, reject) => {
          FabricImage.fromURL(bgUrl, { crossOrigin: 'anonymous' }).then((img) => {
            const canvasWidth = 1000;
            const canvasHeight = 1000;
            const scale = Math.max(canvasWidth / img.width!, canvasHeight / img.height!);
            img.scale(scale);
            img.set({
              left: canvasWidth / 2, top: canvasHeight / 2,
              originX: 'center', originY: 'center',
              selectable: false, evented: false,
            });
            canvas.add(img);
            canvas.sendObjectToBack(img);
            resolve();
          }).catch(err => {
            console.error("Background Load Fail:", err);
            resolve(); // Still continue to add text
          });
        });
      }

      // 2. Add Elements
      if (posterData.elements) {
        for (const el of posterData.elements) {
          if (el.type === 'text') {
            const textObj = new IText(el.text, {
              left: el.left || 500,
              top: el.top || 500,
              originX: el.textAlign === 'center' ? 'center' : 'left',
              fontSize: el.fontSize || 50,
              fontFamily: el.fontFamily || 'Inter',
              fill: el.color || '#ffffff',
              fontWeight: el.fontWeight || 'normal',
              textAlign: el.textAlign || 'center',
              shadow: new Shadow({
                color: 'rgba(0,0,0,0.8)',
                blur: 15,
                offsetX: 0,
                offsetY: 2
              })
            });
            canvas.add(textObj);
          }
        }
      }
      
      canvas.renderAll();
      analytics.trackAction('complete_ai_poster_generation', { theme: posterData.theme });
    } catch (error) {
      console.error("Poster Generation Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentCanvasState = () => {
    if (!canvas) return {};
    const objects = canvas.getObjects();
    return {
      projectName,
      elements: objects.map((obj: any) => ({
        id: obj.id || obj._id || Math.random().toString(36).substr(2, 9),
        type: obj.type === 'i-text' || obj.type === 'text' ? 'text' : obj.type,
        text: (obj as any).text || '',
        fontSize: (obj as any).fontSize,
        fontFamily: (obj as any).fontFamily,
        color: obj.fill,
        top: obj.top,
        left: obj.left,
        width: obj.width * obj.scaleX,
        height: obj.height * obj.scaleY,
        opacity: obj.opacity
      }))
    };
  };

  const handleUpdatePoster = async (posterData: any) => {
    if (!canvas) return;
    setLoading(true);
    analytics.trackAction('start_ai_poster_update', { theme: posterData.theme });

    try {
      if (posterData.backgroundImagePrompt) {
        // Logic to update background if specifically requested or if it's a new theme
        const bgUrl = await generateAIImage(posterData.backgroundImagePrompt);
        FabricImage.fromURL(bgUrl, { crossOrigin: 'anonymous' }).then((img) => {
          const canvasWidth = 1000;
          const canvasHeight = 1000;
          const scale = Math.max(canvasWidth / img.width!, canvasHeight / img.height!);
          img.scale(scale);
          img.set({
            left: canvasWidth / 2, top: canvasHeight / 2,
            originX: 'center', originY: 'center',
            selectable: false, evented: false,
          });
          
          // Remove old background (usually the first object or one with special flag)
          const oldBg = canvas.getObjects().find(obj => !obj.selectable && obj.type === 'image');
          if (oldBg) canvas.remove(oldBg);
          
          canvas.add(img);
          canvas.sendObjectToBack(img);
          canvas.renderAll();
        });
      }

      if (posterData.elements) {
        const objects = canvas.getObjects();
        for (const el of posterData.elements) {
          // Try to find matching object by text content or type/position proximity
          let target = objects.find((obj: any) => 
            (el.id && (obj.id === el.id || obj._id === el.id)) || 
            (el.type === 'text' && obj.text === el.text)
          );

          if (target) {
            const t = target as any;
            t.set({
              left: el.left ?? t.left,
              top: el.top ?? t.top,
              fontSize: el.fontSize ?? t.fontSize,
              fontFamily: el.fontFamily ?? t.fontFamily,
              fill: el.color ?? t.fill,
              fontWeight: el.fontWeight ?? t.fontWeight,
              textAlign: el.textAlign ?? t.textAlign,
              opacity: el.opacity ?? t.opacity,
              visible: el.visible ?? t.visible
            });
          } else if (el.type === 'text') {
            // Add new if not found
            const textObj = new IText(el.text, {
              left: el.left || 500,
              top: el.top || 500,
              originX: el.textAlign === 'center' ? 'center' : 'left',
              fontSize: el.fontSize || 50,
              fontFamily: el.fontFamily || 'Inter',
              fill: el.color || '#ffffff',
              fontWeight: el.fontWeight || 'normal',
              textAlign: el.textAlign || 'center',
              shadow: new Shadow({
                color: 'rgba(0,0,0,0.8)', blur: 15, offsetX: 0, offsetY: 2
              })
            });
            canvas.add(textObj);
          }
        }
      }
      canvas.renderAll();
      analytics.trackAction('complete_ai_poster_update');
    } catch (error) {
      console.error("Poster Update Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSelectedObjectText = (props: any) => {
    const activeObject = canvas?.getActiveObject();
    if (!activeObject) return;
    activeObject.set(props);
    canvas?.renderAll();
    setSelectedObject(Object.assign(Object.create(Object.getPrototypeOf(activeObject)), activeObject)); 
  };

  const checkAuthAndExecute = (action: () => void) => {
    if (!user) {
      setPendingAction(() => action);
      setIsAuthModalOpen(true);
    } else {
      action();
    }
  };

  useEffect(() => {
    if (user && pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [user]);

  const addText = (text: string = 'Double click to edit') => {
    if (!canvas) return;
    analytics.trackAction('add_text', { text });
    const t = new IText(text, {
      left: 100, top: 100, fill: '#ffffff', fontFamily: 'Inter', fontSize: 40,
    });
    canvas.add(t);
    canvas.setActiveObject(t);
  };

  const addShapeFromDef = (def: any) => {
    if (!canvas) return;
    analytics.trackAction('add_shape', { type: def.type });
    let shape: any;
    const props = { left: 100, top: 100, fill: '#8B5CF6', width: 100, height: 100 };
    if (def.type === 'rect') shape = new Rect(props);
    else if (def.type === 'circle') shape = new Circle({ ...props, radius: 50 });
    else if (def.type === 'triangle') shape = new Triangle(props);
    else if (def.type === 'path') shape = new Path(def.path, { ...props, fill: '#8B5CF6' });
    
    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
    }
  };

  const addImage = (url: string) => {
    if (!canvas) return;
    analytics.trackAction('add_image', { url });
    FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
      img.scaleToWidth(400);
      img.set({ left: 100, top: 100 });
      canvas.add(img);
      canvas.setActiveObject(img);
    });
  };

  const loadTemplate = (template: any) => {
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = '#0F0F0F';
    addText(template.name);
    if (template.image) addImage(template.image);
  };

  const loadProject = (projectData: any) => {
    if (!canvas || !projectData) return;
    canvas.loadFromJSON(projectData, () => {
      canvas.renderAll();
      setZoom(1);
    });
  };

  const saveProject = async () => {
    if (!canvas || !user) return;
    analytics.trackAction('save_project', { name: projectName });
    const projectId = `proj-${Date.now()}`;
    try {
      await setDoc(doc(db, 'projects', projectId), {
        name: projectName, data: JSON.stringify(canvas.toJSON()),
        userId: user.uid, updatedAt: serverTimestamp(), createdAt: serverTimestamp(),
      });
      alert('Project saved successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'projects');
    }
  };

  const handleExport = (format: 'png' | 'pdf' | 'jpg') => {
    checkAuthAndExecute(() => {
      if (!canvas) return;
      
      const dataURL = canvas.toDataURL({ 
        format: format === 'pdf' ? 'png' : format as any, 
        quality: 1,
        multiplier: 2
      });
      
      analytics.trackExport(dataURL);
      analytics.trackAction('export_image', { format, name: projectName });

      const link = document.createElement('a');
      link.download = `${projectName}.${format}`;
      link.href = dataURL;
      link.click();
    });
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0A0A0A] text-gray-100 overflow-hidden select-none relative">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/20 rounded-full blur-[120px]"></div>
      </div>

      <Navbar projectName={projectName} setProjectName={setProjectName} onExport={handleExport} />

      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={24} className="text-purple-400 animate-pulse" />
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-6 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Neural Synthesis</p>
                <p className="text-[8px] text-gray-500 mt-1 uppercase tracking-widest italic animate-pulse">Consulting the AI core...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex overflow-hidden z-10">
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.div
              initial={{ x: -64 }}
              animate={{ x: 0 }}
              exit={{ x: -64 }}
              className="flex"
            >
              <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-black/20 backdrop-blur-3xl border-r border-white/10 flex flex-col overflow-hidden"
            >
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }} className="flex-1 overflow-hidden" >
                  {activeTab === 'templates' && <TemplatesPanel onLoadTemplate={loadTemplate} />}
                  {activeTab === 'ai' && <AIPanel onAddImage={addImage} />}
                  {activeTab === 'stock' && <StockPanel onAddMedia={(url) => addImage(url)} />}
                  {activeTab === 'assets' && <AssetsPanel onAddAsset={(_, a) => addImage(a.url)} />}
                  {activeTab === 'shapes' && <ShapesPanel onAddShape={addShapeFromDef} />}
                  {activeTab === 'uploads' && <UploadsPanel onAddImage={addImage} />}
                  {activeTab === 'drafts' && <DraftsPanel onLoadProject={loadProject} canvas={canvas} />}
                  {activeTab === 'text' && (
                    <div className="p-6 space-y-6 overflow-y-auto h-full custom-scrollbar">
                      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Typography</h2>
                      
                      <div className="space-y-3">
                        <button onClick={() => addText('Add a heading')} className="w-full glass-card p-4 text-left hover:border-purple-500/50 flex flex-col group">
                          <span className="text-[10px] text-gray-500 uppercase font-black mb-1">Heading</span>
                          <h3 className="font-bold text-2xl text-white">Add a heading</h3>
                        </button>
                        <button onClick={() => addText('Add a sub-heading')} className="w-full glass-card p-4 text-left hover:border-purple-500/50 flex flex-col group">
                          <span className="text-[10px] text-gray-500 uppercase font-black mb-1">Sub-heading</span>
                          <h3 className="font-bold text-lg text-white">Add a sub-heading</h3>
                        </button>
                        <button onClick={() => addText('Add body text')} className="w-full glass-card p-4 text-left hover:border-purple-500/50 flex flex-col group">
                          <span className="text-[10px] text-gray-500 uppercase font-black mb-1">Body text</span>
                          <p className="text-sm text-gray-400">Add little body text</p>
                        </button>
                      </div>

                      <AnimatePresence>
                        {selectedObject && selectedObject.type === 'image' && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }} 
                            exit={{ opacity: 0, height: 0 }}
                            className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4 overflow-hidden"
                          >
                             <div className="flex items-center gap-2 mb-2">
                               <Sparkles size={14} className="text-purple-400" />
                               <span className="text-[10px] font-black uppercase tracking-widest text-white italic">Neural Engine</span>
                             </div>

                             <div className="space-y-4">
                               <div className="grid grid-cols-2 gap-2">
                                 <button 
                                   onClick={async () => {
                                     if (!selectedObject) return;
                                     const originalUrl = selectedObject.src || selectedObject.getSrc();
                                     try {
                                       setLoading(true);
                                       analytics.trackAction('ai_remove_bg', { originalUrl });
                                       const newUrl = await removeBackground(originalUrl);
                                       if (selectedObject instanceof FabricImage) {
                                         await selectedObject.setSrc(newUrl);
                                         canvas?.renderAll();
                                       }
                                     } catch (e) { console.error(e); } finally { setLoading(false); }
                                   }}
                                   className="py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-[9px] font-black uppercase tracking-widest text-purple-300 transition-all flex flex-col items-center gap-1.5 group"
                                 >
                                   <Eraser size={14} className="group-hover:scale-110 transition-transform" />
                                   Auto Cutout
                                 </button>
                                 <button 
                                   onClick={async () => {
                                     if (!selectedObject) return;
                                     const originalUrl = selectedObject.src || selectedObject.getSrc();
                                     try {
                                       setLoading(true);
                                       analytics.trackAction('ai_enhance', { originalUrl });
                                       const newUrl = await editImageWithAI(originalUrl, "Enhance image: improve resolution, fix lighting, sharpen details, professional color grade, 4k ultra hd quality");
                                       if (selectedObject instanceof FabricImage) {
                                         await selectedObject.setSrc(newUrl);
                                         canvas?.renderAll();
                                       }
                                     } catch (e) { console.error(e); } finally { setLoading(false); }
                                   }}
                                   className="py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl text-[9px] font-black uppercase tracking-widest text-blue-300 transition-all flex flex-col items-center gap-1.5 group"
                                 >
                                   <Zap size={14} className="group-hover:scale-110 transition-transform" />
                                   AI Enhance
                                 </button>
                               </div>

                               <div className="space-y-2">
                                 <div className="flex items-center justify-between">
                                   <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">AI Transformation</label>
                                   <button 
                                     onClick={async () => {
                                       if (!selectedObject) return;
                                       const originalUrl = selectedObject.src || selectedObject.getSrc();
                                       try {
                                         const suggestions = await getEditingSuggestions(originalUrl);
                                         if (suggestions.length > 0) {
                                           const input = document.getElementById('imageRefinePrompt') as HTMLInputElement;
                                           if (input) input.value = suggestions[Math.floor(Math.random() * suggestions.length)];
                                         }
                                       } catch (e) { console.error(e); }
                                     }}
                                     className="text-purple-400 hover:text-purple-300 transition-all"
                                     title="Get Intelligent Suggestions"
                                   >
                                     <Sparkles size={12} />
                                   </button>
                                 </div>
                                 
                                 <div className="relative group">
                                   <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl blur opacity-0 group-focus-within:opacity-30 transition duration-500" />
                                   <div className="relative flex gap-2">
                                     <input 
                                       type="text"
                                       id="imageRefinePrompt"
                                       placeholder="e.g. Change sky to sunset..."
                                       className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-[10px] text-white outline-none focus:border-purple-500/50"
                                     />
                                     <button 
                                       onClick={async () => {
                                         const input = document.getElementById('imageRefinePrompt') as HTMLInputElement;
                                         const p = input.value;
                                         if (!selectedObject || !p) return;
                                         const originalUrl = selectedObject.src || selectedObject.getSrc();
                                         try {
                                            setLoading(true);
                                            const newUrl = await editImageWithAI(originalUrl, p);
                                            if (selectedObject instanceof FabricImage) {
                                              await selectedObject.setSrc(newUrl);
                                              canvas?.renderAll();
                                            }
                                            input.value = '';
                                         } catch (e) { console.error(e); } finally { setLoading(false); }
                                       }}
                                       className="w-10 bg-purple-600 hover:bg-purple-500 rounded-xl transition-all flex items-center justify-center group"
                                     >
                                       <Wand2 size={14} className="text-white group-hover:rotate-12 transition-transform" />
                                     </button>
                                   </div>
                                 </div>
                               </div>

                               <div className="grid grid-cols-3 gap-2 pt-1">
                                 {[
                                   { label: 'Anime', prompt: 'convert to high quality anime style' },
                                   { label: 'Cyber', prompt: 'apply neon cyberpunk aesthetic' },
                                   { label: 'Sketch', prompt: 'convert to pencil sketch art' }
                                 ].map(p => (
                                   <button 
                                     key={p.label}
                                     onClick={async () => {
                                       if (!selectedObject) return;
                                       const originalUrl = selectedObject.src || selectedObject.getSrc();
                                       try {
                                         setLoading(true);
                                         const newUrl = await editImageWithAI(originalUrl, p.prompt);
                                         if (selectedObject instanceof FabricImage) {
                                           await selectedObject.setSrc(newUrl);
                                           canvas?.renderAll();
                                         }
                                       } catch (e) { console.error(e); } finally { setLoading(false); }
                                     }}
                                     className="py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[8px] font-bold uppercase tracking-tighter text-gray-400 hover:text-white transition-all"
                                   >
                                     {p.label}
                                   </button>
                                 ))}
                               </div>
                             </div>
                          </motion.div>
                        )}

                        {selectedObject && (selectedObject.type === 'i-text' || selectedObject.type === 'text') && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }} 
                            exit={{ opacity: 0, height: 0 }}
                            className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4 overflow-hidden"
                          >
                             <div className="flex items-center gap-2 mb-2">
                               <Sparkles size={14} className="text-purple-400" />
                               <span className="text-[10px] font-black uppercase tracking-widest text-white">Text Settings</span>
                             </div>

                             <div className="space-y-3">
                               <div className="space-y-1.5">
                                 <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Font Family</label>
                                 <select 
                                   className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-purple-500/50"
                                   value={selectedObject.fontFamily || 'Inter'}
                                   onChange={(e) => updateSelectedObjectText({ fontFamily: e.target.value })}
                                 >
                                   <option value="Inter">Inter (Sans)</option>
                                   <option value="Space Grotesk">Space Grotesk</option>
                                   <option value="Playfair Display">Playfair Display (Serif)</option>
                                   <option value="JetBrains Mono">JetBrains Mono</option>
                                   <option value="Outfit">Outfit</option>
                                 </select>
                               </div>

                               <div className="space-y-1.5">
                                 <div className="flex items-center justify-between ml-1">
                                   <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Font Size</label>
                                   <div className="flex items-center gap-2">
                                     <input 
                                       type="number" 
                                       value={Math.round(selectedObject.fontSize)}
                                       onChange={(e) => updateSelectedObjectText({ fontSize: parseInt(e.target.value) || 12 })}
                                       className="w-12 bg-black/40 border border-white/10 rounded-md text-[10px] text-center py-0.5 focus:border-purple-500/50 outline-none"
                                     />
                                     <span className="text-[10px] font-mono text-purple-400">px</span>
                                   </div>
                                 </div>
                                 <input 
                                   type="range" min="8" max="400" 
                                   value={selectedObject.fontSize}
                                   onChange={(e) => updateSelectedObjectText({ fontSize: parseInt(e.target.value) })}
                                   className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                 />
                               </div>

                               <div className="grid grid-cols-4 gap-2 pt-2">
                                 <button 
                                    onClick={() => updateSelectedObjectText({ fontWeight: selectedObject.fontWeight === 'bold' ? 'normal' : 'bold' })}
                                    className={cn("py-2 rounded-xl text-[10px] font-bold border transition-all", selectedObject.fontWeight === 'bold' ? "bg-purple-500 border-purple-500 text-white" : "bg-white/5 border-white/10 text-gray-500")}
                                 >B</button>
                                 <button 
                                    onClick={() => updateSelectedObjectText({ fontStyle: selectedObject.fontStyle === 'italic' ? 'normal' : 'italic' })}
                                    className={cn("py-2 rounded-xl text-[10px] italic border transition-all", selectedObject.fontStyle === 'italic' ? "bg-purple-500 border-purple-500 text-white" : "bg-white/5 border-white/10 text-gray-500")}
                                 >I</button>
                                 <button 
                                    onClick={() => updateSelectedObjectText({ underline: !selectedObject.underline })}
                                    className={cn("py-2 rounded-xl text-[10px] underline border transition-all", selectedObject.underline ? "bg-purple-500 border-purple-500 text-white" : "bg-white/5 border-white/10 text-gray-500")}
                                 >U</button>
                                 <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex items-center justify-center">
                                   <input 
                                     type="color" 
                                     value={selectedObject.fill as string || '#ffffff'} 
                                     onChange={(e) => updateSelectedObjectText({ fill: e.target.value })}
                                     className="w-6 h-6 bg-transparent border-none cursor-pointer"
                                   />
                                 </div>
                               </div>
                             </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {user && (
                <div className="p-4 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={user.photoURL || ''} className="w-7 h-7 rounded-lg border border-white/10" alt="Avatar" />
                    <p className="text-[10px] font-bold text-white truncate max-w-[100px]">{user.displayName}</p>
                  </div>
                  <button onClick={saveProject} className="p-2 text-purple-400 hover:text-white transition-all"><Save size={14}/></button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 bg-[#0F0F0F] flex flex-col overflow-hidden relative">
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md shadow-lg z-20">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={cn("p-2 transition-all rounded-full", isSidebarOpen ? "text-purple-400 bg-purple-500/10" : "text-gray-400 hover:text-white")}
            >
              {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
            </button>
            <div className="h-4 w-px bg-white/10 mx-1" />
            <button onClick={() => canvas?.remove(...canvas.getActiveObjects())} className="p-2 text-gray-500 hover:text-rose-400"><Trash2 size={16} /></button>
            <button onClick={() => canvas?.getActiveObject()?.clone().then((c:any) => { canvas.add(c); })} className="p-2 text-gray-500 hover:text-white"><Copy size={16} /></button>
            <div className="h-4 w-px bg-white/10 mx-1" />
            <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="text-gray-500 hover:text-white"><ZoomOut size={14} /></button>
            <span className="text-[10px] font-mono text-gray-500 min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} className="text-gray-500 hover:text-white"><ZoomIn size={14} /></button>
          </div>

          <EditorCanvas onCanvasReady={setCanvas} />

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full flex items-center gap-4 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 z-10 shadow-xl">
             <div className="flex items-center gap-2 text-brand-gradient"><Layers size={10} /> 1920 × 1080</div>
             <div className="h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
             <div className="flex items-center gap-2">Ready</div>
          </div>
        </main>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <ChatAssistant 
        onGeneratePoster={handleGeneratePoster} 
        onUpdatePoster={handleUpdatePoster}
        getCurrentCanvasState={getCurrentCanvasState}
      />
    </div>
  );
}
