import React, { useState } from 'react';
import { Search, Folder, Image as ImageIcon, Box, Shapes, Layers, Sparkles, Filter, MoreHorizontal, Bookmark, Plus, Grid, List } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface AssetsPanelProps {
  onAddAsset: (type: string, data: any) => void;
}

const CATEGORIES = [
  { id: 'images', name: 'Images', icon: ImageIcon },
  { id: 'icons', name: 'Icons', icon: Sparkles },
  { id: 'illustrations', name: 'Illustrations', icon: Folder },
  { id: 'backgrounds', name: 'Backgrounds', icon: Layers },
  { id: 'textures', name: 'Textures', icon: Filter },
  { id: 'effects', name: 'Overlays', icon: Shapes },
];

const MOCK_ASSETS: Record<string, any[]> = {
  images: [
    { id: 1, title: 'Nature Bloom', tag: 'Nature', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=80' },
    { id: 2, title: 'Tech City', tag: 'Architecture', url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=400&q=80' },
    { id: 3, title: 'Abstract Waves', tag: 'Art', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=400&q=80' },
    { id: 4, title: 'Minimal Desk', tag: 'Business', url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=400&q=80' },
    { id: 5, title: 'Mountain Peak', tag: 'Nature', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80' },
    { id: 6, title: 'Neon Night', tag: 'Cyberpunk', url: 'https://images.unsplash.com/photo-1519750783842-ad95202f5a9f?auto=format&fit=crop&w=400&q=80' },
    { id: 7, title: 'Forest Path', tag: 'Nature', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=400&q=80' },
    { id: 8, title: 'Sunset Beach', tag: 'Nature', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80' },
    { id: 9, title: 'Cozy Coffee', tag: 'Lifestyle', url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80' },
    { id: 10, title: 'Workspace', tag: 'Pro', url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=400&q=80' },
  ],
  icons: [
    { id: 1, title: 'Home', tag: 'UI', url: 'https://cdn-icons-png.flaticon.com/512/25/25694.png' },
    { id: 2, title: 'Settings', tag: 'UI', url: 'https://cdn-icons-png.flaticon.com/512/126/126472.png' },
    { id: 3, title: 'Search', tag: 'UI', url: 'https://cdn-icons-png.flaticon.com/512/622/622669.png' },
    { id: 4, title: 'Star', tag: 'UI', url: 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png' },
    { id: 5, title: 'Heart', tag: 'Social', url: 'https://cdn-icons-png.flaticon.com/512/1077/1077035.png' },
    { id: 6, title: 'User', tag: 'People', url: 'https://cdn-icons-png.flaticon.com/512/1077/1077063.png' },
    { id: 7, title: 'Bell', tag: 'UI', url: 'https://cdn-icons-png.flaticon.com/512/3602/3602123.png' },
    { id: 8, title: 'Check', tag: 'UI', url: 'https://cdn-icons-png.flaticon.com/512/1442/1442912.png' },
  ],
  illustrations: [
    { id: 1, title: 'Space Travel', tag: 'Sci-Fi', url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=400&q=80' },
    { id: 2, title: 'Digital Art', tag: 'Creative', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=400&q=80' },
    { id: 3, title: '3D Shapes', tag: 'Modern', url: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&w=400&q=80' },
    { id: 4, title: 'Character', tag: 'Flat', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=400&q=80' },
    { id: 5, title: 'Abstract Flow', tag: 'Fluid', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=400&q=80' },
  ],
  backgrounds: [
    { id: 1, title: 'Gradient Mesh', tag: 'Abstract', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=400&q=80' },
    { id: 2, title: 'Dark Texture', tag: 'Material', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=400&q=80' },
    { id: 3, title: 'Sky High', tag: 'Nature', url: 'https://images.unsplash.com/photo-1464802686167-b939a67e0524?auto=format&fit=crop&w=400&q=80' },
    { id: 4, title: 'Minimal Gray', tag: 'Clean', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80' },
    { id: 5, title: 'Soft Silk', tag: 'Luxury', url: 'https://images.unsplash.com/photo-1528459801435-075530467199?auto=format&fit=crop&w=400&q=80' },
    { id: 6, title: 'Modern Wood', tag: 'Natural', url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=400&q=80' },
  ],
  textures: [
    { id: 1, title: 'Paper Grain', tag: 'Vintage', url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=400&q=80' },
    { id: 2, title: 'Marbled Surface', tag: 'Stone', url: 'https://images.unsplash.com/photo-1502472545339-684aff16ea03?auto=format&fit=crop&w=400&q=80' },
    { id: 3, title: 'Distressed Metal', tag: 'Industrial', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80' },
    { id: 4, title: 'Canvas Weave', tag: 'Fabric', url: 'https://images.unsplash.com/photo-1503149707508-f591d60c920e?auto=format&fit=crop&w=400&q=80' },
    { id: 5, title: 'Bricked Wall', tag: 'Urban', url: 'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?auto=format&fit=crop&w=400&q=80' },
  ],
  effects: [
    { id: 1, title: 'Lens Flare', tag: 'Light', url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=400&q=80' },
    { id: 2, title: 'Dust Particles', tag: 'Overlays', url: 'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?auto=format&fit=crop&w=400&q=80' },
    { id: 3, title: 'Chromatic', tag: 'Artistic', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80' },
    { id: 4, title: 'Vignette', tag: 'Classic', url: 'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?auto=format&fit=crop&w=400&q=80' },
  ]
};

export const AssetsPanel: React.FC<AssetsPanelProps> = ({ onAddAsset }) => {
  const [activeCategory, setActiveCategory] = useState('images');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredAssets = (MOCK_ASSETS[activeCategory] || []).filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">Asset Library</h2>
          <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
            <button onClick={() => setViewMode('grid')} className={cn("p-1 rounded", viewMode === 'grid' && "bg-white/10 text-brand")}><Grid size={12}/></button>
            <button onClick={() => setViewMode('list')} className={cn("p-1 rounded", viewMode === 'list' && "bg-white/10 text-brand")}><List size={12}/></button>
          </div>
        </div>

        <div className="relative group">
          <input 
            type="text" 
            placeholder="Search assets..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-xs text-gray-300 focus:border-purple-500/50 transition-all outline-none"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-purple-400 transition-colors" size={16} />
        </div>
      </div>

      <div className="px-4 py-2 border-b border-white/10 overflow-x-auto no-scrollbar flex gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border",
              activeCategory === cat.id 
                ? "bg-purple-500/20 border-purple-500/40 text-purple-300" 
                : "bg-white/5 border-transparent text-gray-500 hover:bg-white/10"
            )}
          >
            <cat.icon size={12} />
            {cat.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        <div className={cn(
          "grid gap-4",
          viewMode === 'grid' ? "grid-cols-2" : "grid-cols-1"
        )}>
          {filteredAssets.map(asset => (
            <motion.div
              layout
              key={asset.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group glass-card overflow-hidden relative"
            >
              <div className="aspect-[4/3] overflow-hidden bg-white/5">
                <img 
                  src={asset.url} 
                  alt={asset.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100" 
                />
              </div>
              <div className="p-3 bg-black/40 backdrop-blur-md flex flex-col gap-1 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white truncate max-w-[80px]">{asset.title}</span>
                  <button className="text-gray-500 hover:text-purple-400"><Bookmark size={12}/></button>
                </div>
                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{asset.tag}</span>
              </div>
              
              <button 
                onClick={() => onAddAsset(activeCategory, asset)}
                className="absolute inset-0 bg-purple-600/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300"
              >
                <div className="bg-white text-black p-2 rounded-full shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                  <Plus size={20} />
                </div>
              </button>
            </motion.div>
          ))}
        </div>

        {filteredAssets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 text-gray-600">
             <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
               <ImageIcon size={32} />
             </div>
             <div className="space-y-1">
               <p className="text-sm font-bold">No assets found</p>
               <p className="text-xs">Try searching for something else or browse categories.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
