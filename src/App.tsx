import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/ui/Sidebar';
import { Navbar } from './components/ui/Navbar';
import { EditorCanvas } from './components/canvas/EditorCanvas';
import { AIPanel } from './components/ui/AIPanel';
import { TemplatesPanel } from './components/ui/TemplatesPanel';
import { StockPanel } from './components/ui/StockPanel';
import { AssetsPanel } from './components/ui/AssetsPanel';
import { ShapesPanel } from './components/ui/ShapesPanel';
import { DraftsPanel } from './components/ui/DraftsPanel';
import { UploadsPanel } from './components/ui/UploadsPanel';
import { AuthModal } from './components/ui/AuthModal';
import * as fabric from 'fabric';
import { motion, AnimatePresence } from 'motion/react';
import { MousePointer2, ZoomIn, ZoomOut, Trash2, Copy, Layers, Save, Sparkles, Wand2, PanelLeftClose, PanelLeft } from 'lucide-react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './lib/firebase';
import { cn } from './lib/utils';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { editImageWithAI, removeBackground } from './services/geminiService';

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('templates');
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [projectName, setProjectName] = useState('Untitled Masterpiece');
  const [zoom, setZoom] = useState(1);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

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

  const updateSelectedObjectText = (props: any) => {
    const activeObject = canvas?.getActiveObject();
    if (!activeObject) return;
    activeObject.set(props);
    canvas?.renderAll();
    // Force a state update to refresh the UI controls with new values
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
    const t = new fabric.IText(text, {
      left: 100, top: 100, fill: '#ffffff', fontFamily: 'Inter', fontSize: 40,
    });
    canvas.add(t);
    canvas.setActiveObject(t);
  };

  const addShapeFromDef = (def: any) => {
    if (!canvas) return;
    let shape: any;
    const props = { left: 100, top: 100, fill: '#8B5CF6', width: 100, height: 100 };
    if (def.type === 'rect') shape = new fabric.Rect(props);
    else if (def.type === 'circle') shape = new fabric.Circle({ ...props, radius: 50 });
    else if (def.type === 'triangle') shape = new fabric.Triangle(props);
    else if (def.type === 'path') shape = new fabric.Path(def.path, { ...props, fill: '#8B5CF6' });
    
    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
    }
  };

  const addImage = (url: string) => {
    if (!canvas) return;
    fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
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
    // Apply template logic (e.g. background effects via prompt placeholder)
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
    const projectId = `proj-${Date.now()}`;
    try {
      // Generate a small preview dataURL for the history view
      const preview = canvas.toDataURL({ format: 'webp', quality: 0.5, multiplier: 0.1 });
      
      await setDoc(doc(db, 'projects', projectId), {
        name: projectName, 
        data: JSON.stringify(canvas.toJSON()),
        preview,
        userId: user.uid, 
        updatedAt: serverTimestamp(), 
        createdAt: serverTimestamp(),
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
                               <span className="text-[10px] font-black uppercase tracking-widest text-white">AI Image Magic</span>
                             </div>

                             <div className="space-y-3">
                               <button 
                                 onClick={async () => {
                                   if (!selectedObject) return;
                                   const originalUrl = selectedObject.src || selectedObject.getSrc();
                                   try {
                                     const newUrl = await removeBackground(originalUrl);
                                     if (selectedObject instanceof fabric.FabricImage) {
                                       await selectedObject.setSrc(newUrl);
                                       canvas?.renderAll();
                                     }
                                   } catch (e) { console.error(e); }
                                 }}
                                 className="w-full py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-[10px] font-bold uppercase tracking-widest text-purple-300 transition-all shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                               >
                                 Remove Background
                               </button>

                               <div className="space-y-1.5 pt-2">
                                 <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">AI Edit / Transform</label>
                                 <div className="flex gap-2">
                                   <input 
                                     type="text"
                                     id="imageRefinePrompt"
                                     placeholder="e.g. Turn into a pencil sketch..."
                                     className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-purple-500/50"
                                   />
                                   <button 
                                     onClick={async () => {
                                       const input = document.getElementById('imageRefinePrompt') as HTMLInputElement;
                                       const p = input.value;
                                       if (!selectedObject || !p) return;
                                       const originalUrl = selectedObject.src || selectedObject.getSrc();
                                       try {
                                          const newUrl = await editImageWithAI(originalUrl, `Professionally edit this image: ${p}. Maintain the original subject while applying the requested change in high definition.`);
                                          if (selectedObject instanceof fabric.FabricImage) {
                                            await selectedObject.setSrc(newUrl);
                                            canvas?.renderAll();
                                          }
                                          input.value = '';
                                       } catch (e) { console.error(e); }
                                     }}
                                     className="p-2 bg-purple-500 rounded-xl hover:bg-purple-400 transition-all flex items-center justify-center min-w-[32px]"
                                   >
                                     <Wand2 size={12} className="text-white" />
                                   </button>
                                 </div>
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
                                   <option value="Bungee">Bungee (Bold)</option>
                                   <option value="Lobster">Lobster (Script)</option>
                                   <option value="Bebas Neue">Bebas Neue (Condensed)</option>
                                   <option value="Montserrat">Montserrat</option>
                                   <option value="Open Sans">Open Sans</option>
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

                               <div className="grid grid-cols-2 gap-3">
                                 <div className="space-y-1.5">
                                   <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Line Height</label>
                                   <input 
                                     type="range" min="0.5" max="3" step="0.1"
                                     value={selectedObject.lineHeight || 1.16}
                                     onChange={(e) => updateSelectedObjectText({ lineHeight: parseFloat(e.target.value) })}
                                     className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                   />
                                 </div>
                                 <div className="space-y-1.5">
                                   <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Spacing</label>
                                   <input 
                                     type="range" min="-100" max="1000" step="10"
                                     value={selectedObject.charSpacing || 0}
                                     onChange={(e) => updateSelectedObjectText({ charSpacing: parseInt(e.target.value) })}
                                     className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                   />
                                 </div>
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
              title={isSidebarOpen ? "Collapse Menu" : "Expand Menu"}
              className={cn("p-2 transition-all rounded-full", isSidebarOpen ? "text-purple-400 bg-purple-500/10" : "text-gray-400 hover:text-white")}
            >
              {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
            </button>
            <div className="h-4 w-px bg-white/10 mx-1" />
            <button onClick={() => canvas?.remove(...canvas.getActiveObjects())} className="p-2 text-gray-500 hover:text-rose-400"><Trash2 size={16} /></button>
            <button onClick={() => canvas?.getActiveObject()?.clone().then((c:any) => { c.set({left:c.left+20,top:c.top+20}); canvas.add(c); canvas.setActiveObject(c); })} className="p-2 text-gray-500 hover:text-white"><Copy size={16} /></button>
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
    </div>
  );
}
