import React, { useState } from 'react';
import { Search, Grid, Shapes, Plus, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { CATEGORIZED_SHAPES, ShapeDefinition } from '../../constants/shapes';
import { cn } from '../../lib/utils';

interface ShapesPanelProps {
  onAddShape: (shape: ShapeDefinition) => void;
}

export const ShapesPanel: React.FC<ShapesPanelProps> = ({ onAddShape }) => {
  const [activeCat, setActiveCat] = useState('Basic');
  const [query, setQuery] = useState('');

  return (
    <div className="flex flex-col h-full bg-black/10">
      <div className="p-6 pb-2 space-y-4">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Elements Library</h2>
        <div className="relative">
          <input 
            type="text" placeholder="Search shapes..." value={query} onChange={e => setQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-gray-300 outline-none focus:border-purple-500/50 transition-all"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
        </div>
      </div>

      <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-b border-white/10">
        {Object.keys(CATEGORIZED_SHAPES).map(cat => (
          <button
            key={cat} onClick={() => setActiveCat(cat)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
              activeCat === cat ? "bg-purple-500 text-white border-purple-500" : "bg-white/5 border-transparent text-gray-500 hover:text-gray-300"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="grid grid-cols-3 gap-3">
          {(CATEGORIZED_SHAPES[activeCat as keyof typeof CATEGORIZED_SHAPES] || []).map((shape: any, i) => (
            <motion.button
              key={i} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => onAddShape(shape)}
              className="glass-card aspect-square flex flex-col items-center justify-center gap-2 border-none bg-white/5 hover:bg-purple-500/10 hover:border-purple-500/30 transition-all group p-2 overflow-hidden"
            >
              <div className="w-full aspect-square flex items-center justify-center">
                 {shape.type === 'rect' && <div className="w-[70%] h-[70%] border-2 border-gray-400 group-hover:border-purple-400 transition-colors bg-white/5" />}
                 {shape.type === 'circle' && <div className="w-[70%] h-[70%] border-2 border-gray-400 rounded-full group-hover:border-purple-400 transition-colors bg-white/5" />}
                 {shape.type === 'ellipse' && <div className="w-[85%] h-[50%] border-2 border-gray-400 rounded-[50%] group-hover:border-purple-400 transition-colors bg-white/5" />}
                 {shape.type === 'triangle' && (
                   <svg viewBox="0 0 100 100" className="w-[70%] h-[70%] fill-none stroke-gray-400 stroke-[6] group-hover:stroke-purple-400 transition-colors">
                     <path d="M 50 10 L 90 90 L 10 90 Z" />
                   </svg>
                 )}
                 {shape.type === 'path' && shape.path && (
                   <svg viewBox="0 0 100 100" className="w-[70%] h-[70%] fill-gray-400/20 stroke-gray-400 stroke-[4] group-hover:fill-purple-500/20 group-hover:stroke-purple-400 transition-colors">
                     <path d={shape.path} />
                   </svg>
                 )}
                 {shape.type === 'line' && (
                   <div className="w-full px-2">
                     <div className="h-0.5 bg-gray-400 group-hover:bg-purple-400 transition-colors rotate-45" />
                   </div>
                 )}
                 {shape.type === 'polygon' && (
                    <svg viewBox="0 0 100 100" className="w-[70%] h-[70%] fill-none stroke-gray-400 stroke-[6] group-hover:stroke-purple-400 transition-colors">
                      <polygon points="50 0, 100 38, 81 100, 19 100, 0 38" />
                    </svg>
                 )}
              </div>
              <span className="text-[7px] font-bold text-gray-500 uppercase truncate w-full text-center">{shape.name}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};
