import React, { useState } from 'react';
import { Layout, Palette, Phone, Send, Twitter, Youtube, Sparkles, Filter, Search, Bookmark, ArrowRight, Star, TrendingUp, Clock, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface TemplatesPanelProps {
  onLoadTemplate: (template: any) => void;
}

const TEMPLATE_CATEGORIES = [
  { id: 'portraits', name: 'Portraits', icon: Zap },
  { id: 'indian', name: 'Traditional Indian', icon: Palette },
  { id: 'creative', name: 'Creative Styles', icon: Sparkles },
  { id: 'social', name: 'Social Media', icon: Phone },
  { id: 'movie', name: 'Movie Poster', icon: Youtube },
];

const TEMPLATES_DATA = [
  // Portrait Templates
  { id: 'cinematic-portrait', name: 'Cinematic Portrait', category: 'portraits', tag: 'Premium', prompt: 'ultra cinematic lighting, dramatic shadows, realistic skin texture, professional color grading, movie-style atmosphere, sharp focus, depth of field, highly detailed', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80' },
  { id: 'luxury-studio', name: 'Luxury Studio', category: 'portraits', tag: 'Trending', prompt: 'high-end studio lighting, minimalist background, perfect skin retouch, elegant pose, fashion photography, 8k resolution', image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80' },
  { id: 'vintage-sepia', name: 'Vintage Sepia', category: 'portraits', tag: 'Classic', prompt: '1940s vintage photography style, sepia tone, slight film grain, soft focus edges, classic portrait lighting, nostalgic mood', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80' },
  { id: 'neon-vibe', name: 'Neon Night', category: 'portraits', tag: 'Vibrant', prompt: 'neon pink and blue side lighting, urban night background, sharp focus, high contrast, trendy portrait', image: 'https://images.unsplash.com/photo-1529139513477-323c66b6229b?auto=format&fit=crop&w=400&q=80' },
  { id: 'natural-light', name: 'Golden Hour', category: 'portraits', tag: 'Pure', prompt: 'natural golden hour sunlight, soft backlighting, airy feel, park background, warm tones, candid look', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80' },
  { id: 'corporate-pro', name: 'Executive Pro', category: 'portraits', tag: 'Pro', prompt: 'professional corporate headshot, neutral gray background, confident expression, sharp business attire, clean lighting', image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80' },
  
  // Traditional Indian
  { id: 'temple-aesthetic', name: 'Temple Aesthetic', category: 'indian', tag: 'Legendary', prompt: 'majestic temple architecture, warm goden hour lighting, traditional silk drape, intricate temple jewelry, divine atmosphere, cinematic mythological style', image: 'https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?auto=format&fit=crop&w=400&q=80' },
  { id: 'bhara-dancer', name: 'Bharatanatyam', category: 'indian', tag: 'New', prompt: 'classical bharatanatyam dancer, expressive eyes, temple jewelry, classical mudra, dramatic stage lighting, vivid colors', image: 'https://images.unsplash.com/photo-1520697824412-3852229ad5d8?auto=format&fit=crop&w=400&q=80' },
  { id: 'royal-rajasthan', name: 'Royal Heritage', category: 'indian', tag: 'Cultural', prompt: 'rajasthani palace setting, vibrant traditional costume, royal jewelry, desert background, majestic composition, rich colors', image: 'https://images.unsplash.com/photo-1524492459584-96c6dd59f914?auto=format&fit=crop&w=400&q=80' },
  { id: 'indian-bridal', name: 'Bridal Grandeur', category: 'indian', tag: 'Elegant', prompt: 'traditional indian bridal portrait, heavy red lehenga, intricate embroidery, dramatic lighting, luxury jewelry, cinematic bokeh', image: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=400&q=80' },
  { id: 'holi-festival', name: 'Holi Spirits', category: 'indian', tag: 'Festive', prompt: 'vibrant holi festival colors, joyful expression, multi-colored powder in air, dynamic movement, high energy, colorful blur', image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=400&q=80' },

  // Creative Styles
  { id: 'cyberpunk-neon', name: 'Cyberpunk Neon', category: 'creative', tag: 'Viral', prompt: 'futuristic cyberpunk city, neon blue and magenta reflections, rain-slicked asphalt, high-tech atmosphere, cinematic fog', image: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&w=400&q=80' },
  { id: 'pixar-world', name: 'Pixar Style', category: 'creative', tag: 'AI Magic', prompt: '3D animated character style, big expressive eyes, soft rounded features, vibrant colors, disney pixar aesthetic, high quality render', image: 'https://images.unsplash.com/photo-1593085512500-5d55148d6f0d?auto=format&fit=crop&w=400&q=80' },
  { id: 'watercolor-dream', name: 'Watercolor Art', category: 'creative', tag: 'Artistic', prompt: 'dreamy watercolor painting style, soft splatters, bleeding colors, artistic brush strokes, ethereal portrait, hand-painted look', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=400&q=80' },
  { id: 'double-exposure', name: 'Double Exposure', category: 'creative', tag: 'Cool', prompt: 'creative double exposure of a person profile and a forest, mystical overlay, artistic blend, high contrast, surreal photography', image: 'https://images.unsplash.com/photo-1505330622279-bf7d7fc918f4?auto=format&fit=crop&w=400&q=80' },
  { id: 'synthwave-retro', name: 'Synthwave Retro', category: 'creative', tag: 'Retro', prompt: '80s synthwave aesthetic, sun rising over wireframe landscape, retro vaporwave colors, grid floor, digital dream', image: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&w=400&q=80' },

  // Social Media
  { id: 'insta-vlog', name: 'Insta Vlog', category: 'social', tag: 'Social', prompt: 'lifestyle vlogger aesthetic, bright and airy, city street background, casual pose, trendy outfit, high clarity', image: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=crop&w=400&q=80' },
  { id: 'youtube-thumb', name: 'Pro Thumbnail', category: 'social', tag: 'Viral', prompt: 'youtube thumbnail style, high contrast, bold expression, blurred background, vibrant saturated colors, eye-catching', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=400&q=80' },

  // Movie Poster
  { id: 'action-thriller', name: 'Action Thriller', category: 'movie', tag: 'New', prompt: 'dramatic movie poster style, orange and teal color grading, intense shadows, sparks in air, action movie hero vibe', image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=400&q=80' },
  { id: 'horror-dark', name: 'Dark Mystery', category: 'movie', tag: 'Horror', prompt: 'horror movie poster, foggy forest, dark mystical atmosphere, eerie lighting, high suspense, monochromatic dark tones', image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=400&q=80' },
];

export const TemplatesPanel: React.FC<TemplatesPanelProps> = ({ onLoadTemplate }) => {
  const [activeCategory, setActiveCategory] = useState('portraits');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = TEMPLATES_DATA.filter(t => 
    (t.category === activeCategory || activeCategory === 'all') &&
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-black/10">
      {/* Hero Banner Section */}
      <div className="relative h-40 overflow-hidden group">
        <img 
          src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80" 
          className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-1000"
          alt="Hero"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute bottom-4 left-6 space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-purple-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-tighter">AI Powered</span>
            <h2 className="text-xl font-black text-white tracking-tight">Design Magic</h2>
          </div>
          <p className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">Professional Image Templates</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search templates..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-gray-300 outline-none focus:border-purple-500/50 transition-all font-medium"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {TEMPLATE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border",
                activeCategory === cat.id 
                  ? "bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/20" 
                  : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6 custom-scrollbar">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <TrendingUp size={12} className="text-purple-500" />
              Trending Now
            </h3>
            <button className="text-[9px] font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1 group">
              View All <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {filteredTemplates.map(template => (
              <motion.div
                key={template.id}
                whileHover={{ y: -4 }}
                className="group relative glass-card aspect-[3/4] overflow-hidden cursor-pointer"
                onClick={() => onLoadTemplate(template)}
              >
                <img src={template.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90" alt={template.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                
                <div className="absolute top-2 left-2">
                  <span className="bg-black/60 backdrop-blur-md text-white text-[7px] font-black uppercase px-2 py-0.5 rounded border border-white/10 tracking-widest">
                    {template.tag}
                  </span>
                </div>

                <div className="absolute top-2 right-2">
                  <button className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center border border-white/10 text-gray-400 hover:text-purple-400 transition-colors">
                    <Bookmark size={10} />
                  </button>
                </div>

                <div className="absolute bottom-3 left-3 right-3 text-left">
                  <h4 className="text-xs font-black text-white leading-tight mb-1">{template.name}</h4>
                  <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="flex-1 bg-white text-black text-[9px] font-black uppercase py-1.5 rounded tracking-tighter active:scale-95 transition-transform">
                      Use Template
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {filteredTemplates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 text-gray-600">
             <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 border-dashed">
               <Star size={32} />
             </div>
             <p className="text-sm font-bold">More templates coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
};
