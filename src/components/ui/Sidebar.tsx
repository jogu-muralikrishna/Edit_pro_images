import React from 'react';
import { 
  Layout, 
  Image as ImageIcon, 
  Type, 
  Square, 
  Search, 
  Sparkles, 
  FileVideo, 
  Layers,
  History,
  CloudUpload
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'templates', icon: Layout, label: 'Templates' },
    { id: 'assets', icon: ImageIcon, label: 'Assets' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'shapes', icon: Square, label: 'Shapes' },
    { id: 'uploads', icon: CloudUpload, label: 'Uploads' },
    { id: 'stock', icon: Search, label: 'Stock' },
    { id: 'ai', icon: Sparkles, label: 'Magic' },
    { id: 'drafts', icon: History, label: 'History' },
  ];

  return (
    <div className="w-20 md:w-64 glass-sidebar flex flex-col h-full transition-all">
      <div className="p-6 md:pb-2">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 hidden md:block">Menu</h3>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group relative overflow-hidden ${
              activeTab === tab.id 
                ? 'bg-white/10 text-white border border-white/10 shadow-lg' 
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
            }`}
          >
            <tab.icon size={18} className={activeTab === tab.id ? 'text-purple-400' : 'group-hover:text-purple-400 transition-colors'} />
            <span className="text-sm font-medium hidden md:block">{tab.label}</span>
            {activeTab === tab.id && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-purple-500 rounded-l-full shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="px-4 py-3 text-[10px] uppercase font-bold tracking-widest text-[#444] hidden md:block">
          System v1.0.4
        </div>
      </div>
    </div>
  );
};
