import React, { useState, useEffect } from 'react';
import { Search, Image as ImageIcon, Video, Loader2, Plus, ArrowRight, Grid, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface StockPanelProps {
  onAddMedia: (url: string, type: 'image' | 'video') => void;
}

export const StockPanel: React.FC<StockPanelProps> = ({ onAddMedia }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'unsplash' | 'pexels'>('unsplash');
  const [results, setResults] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);

  useEffect(() => {
    // Load trending images on mount
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    try {
      const resp = await fetch(`/api/stock/unsplash?query=aesthetic&page=1`);
      const data = await resp.json();
      if (data.results) setTrending(data.results);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const endpoint = source === 'unsplash' ? '/api/stock/unsplash' : '/api/stock/pexels';
      const resp = await fetch(`${endpoint}?query=${encodeURIComponent(query)}&page=1`);
      const data = await resp.json();
      
      let processed = [];
      if (source === 'unsplash') {
        processed = data.results?.map((r: any) => ({
          id: r.id,
          url: r.urls.regular,
          thumb: r.urls.small,
          type: 'image',
          author: r.user.name
        })) || [];
      } else {
        processed = (data.photos || data.videos)?.map((r: any) => ({
          id: r.id,
          url: r.src?.large2x || r.video_files?.[0]?.link,
          thumb: r.src?.medium || r.image,
          type: r.video_files ? 'video' : 'image',
          author: r.photographer || r.user?.name
        })) || [];
      }
      setResults(processed);
    } catch (error) {
      console.error("Stock fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-0 flex flex-col h-full bg-black/20">
      <div className="p-6 space-y-6">
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Stock Assets</h2>
          
          <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1.5 shadow-inner">
            <button 
              onClick={() => setSource('unsplash')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                source === 'unsplash' ? "bg-white/10 text-white shadow-xl" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <ImageIcon size={14} />
              Unsplash
            </button>
            <button 
              onClick={() => setSource('pexels')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                source === 'pexels' ? "bg-white/10 text-white shadow-xl" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <Video size={14} />
              Pexels
            </button>
          </div>

          <div className="relative group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={`Search ${source === 'unsplash' ? 'Photography' : 'Cinema'}...`}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-xs text-gray-200 focus:border-purple-500/50 transition-all outline-none"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <button 
              onClick={handleSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-purple-400 hover:bg-purple-500/10 rounded-xl transition-all"
            >
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-4"
            >
              <Loader2 className="animate-spin text-purple-500" size={32} />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Searching global library...</p>
            </motion.div>
          ) : results.length > 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="grid grid-cols-2 gap-3"
            >
              {results.map((res) => (
                <button
                  key={res.id}
                  onClick={() => onAddMedia(res.url, res.type)}
                  className="group relative aspect-[3/4] rounded-xl overflow-hidden glass-card border-none"
                >
                  <img src={res.thumb} alt="Stock" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end p-2 px-3">
                     <span className="text-[8px] font-bold text-white uppercase tracking-tight truncate">{res.author}</span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-2xl">
                      <Plus size={16} />
                    </div>
                  </div>
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600">Popular Queries</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                 {['Cinematic', 'Minimal', 'Nature', 'Portrait', 'Abstract', 'Tech'].map(tag => (
                   <button 
                     key={tag} 
                     onClick={() => { setQuery(tag); handleSearch(); }}
                     className="bg-white/5 border border-white/10 rounded-lg py-2 text-[9px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
                   >
                     {tag}
                   </button>
                 ))}
              </div>
              
              {trending.length > 0 && (
                <div className="space-y-3 pt-4">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600">Featured Collections</h3>
                   <div className="grid grid-cols-2 gap-3">
                      {trending.slice(0, 4).map(t => (
                        <button key={t.id} onClick={() => onAddMedia(t.urls.regular, 'image')} className="aspect-square rounded-xl overflow-hidden relative group">
                          <img src={t.urls.thumb} className="w-full h-full object-cover" alt="Trending" />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-purple-500/20 transition-all" />
                        </button>
                      ))}
                   </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
