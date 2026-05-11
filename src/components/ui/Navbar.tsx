import React from 'react';
import { Download, Share2, Play, Save } from 'lucide-react';

interface NavbarProps {
  onExport: (format: 'png' | 'pdf' | 'jpg') => void;
  projectName: string;
  setProjectName: (name: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onExport, projectName, setProjectName }) => {
  return (
    <header className="h-14 glass-navbar flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="font-bold text-lg">E</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-gradient hidden md:block">
            Edit Pro
          </span>
        </div>
        <div className="h-4 w-px bg-white/10 mx-2" />
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="bg-transparent border-none text-gray-300 font-medium focus:text-white outline-none transition-all w-48"
          placeholder="Untitled Design"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Auto-saved</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <Share2 size={18} />
          </button>
          <div className="relative group">
            <button className="neon-button text-sm">
              <Download size={16} className="mr-2" />
              Export
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all py-2 z-50">
              <button onClick={() => onExport('png')} className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white">PNG Image</button>
              <button onClick={() => onExport('jpg')} className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white">JPG Image</button>
              <button onClick={() => onExport('pdf')} className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white">PDF Document</button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
