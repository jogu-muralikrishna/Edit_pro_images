import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Users, 
  Image as ImageIcon, 
  Download, 
  Activity, 
  Globe, 
  Monitor, 
  ChevronRight, 
  FileJson, 
  LogOut,
  MapPin,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';

const SECRET_PASSWORD = 'EditPro@2025';

export default function AdminPanel() {
  const [token, setToken] = useState(localStorage.getItem('admin_token'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('sessions');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const result = await res.json();
      if (res.ok) {
        setToken(result.token);
        localStorage.setItem('admin_token', result.token);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else if (res.status === 401) {
        setToken(null);
        localStorage.removeItem('admin_token');
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('admin_token');
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass-card p-8 z-10"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-purple-600/10 rounded-2xl flex items-center justify-center mb-4 border border-purple-500/20 shadow-lg shadow-purple-500/10">
              <Lock className="text-purple-400" size={32} />
            </div>
            <h1 className="text-xl font-black uppercase tracking-[0.3em] text-white">Admin Access</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-2">Restricted Intelligence Core</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Identifier</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 transition-all"
                placeholder="Admin username"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Access Code</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 transition-all"
                placeholder="••••••••"
              />
            </div>
            
            {error && <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest text-center mt-2">{error}</p>}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50 mt-6 shadow-xl shadow-purple-900/20"
            >
              {loading ? 'Authenticating...' : 'Enter System'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-100 flex flex-col font-sans select-none">
      {/* Sidebar Nav */}
      <div className="h-20 bg-black/20 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-8 z-50">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white italic">Edit Pro Intelligence</span>
            <span className="text-[8px] text-purple-400 font-bold uppercase tracking-widest">Admin Dashboard v2.0.25</span>
          </div>
          
          <div className="h-6 w-px bg-white/10" />

          <nav className="flex items-center gap-2">
            {[
              { id: 'sessions', icon: Users, label: 'Sessions' },
              { id: 'uploads', icon: ImageIcon, label: 'Uploads' },
              { id: 'exports', icon: Download, label: 'Exports' },
              { id: 'actions', icon: Activity, label: 'Logs' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  activeTab === tab.id ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon size={12} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button 
             onClick={() => {
               const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
               const url = URL.createObjectURL(blob);
               const a = document.createElement('a');
               a.href = url;
               a.download = `edit-pro-data-${Date.now()}.json`;
               a.click();
             }}
             className="p-2 text-gray-400 hover:text-white transition-all"
             title="Export Data"
          >
            <FileJson size={18} />
          </button>
          <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-rose-400 transition-all">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Stats Bar */}
          {data && (
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total Sessions', value: data.sessions.length, icon: Users, color: 'text-purple-400' },
                { label: 'Upload Count', value: data.uploads.length, icon: ImageIcon, color: 'text-blue-400' },
                { label: 'Export Revenue', value: 'N/A', icon: Sparkles, color: 'text-cyan-400' },
                { label: 'Activity Events', value: data.actions.length, icon: Activity, color: 'text-emerald-400' },
              ].map(stat => (
                <div key={stat.label} className="glass-card p-6 flex items-center justify-between">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-500 mb-1">{stat.label}</p>
                    <p className="text-2xl font-black text-white">{stat.value}</p>
                  </div>
                  <div className={`p-3 bg-white/5 rounded-2xl ${stat.color}`}>
                    <stat.icon size={20} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'sessions' && (
              <motion.div 
                key="sessions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="glass-card overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5 border-b border-white/5">
                      <tr>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-500">Node ID</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-500">Location</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-500">Environment</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-500">Last Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data?.sessions.map((s: any) => (
                        <tr key={s.id} className="hover:bg-white/5 transition-all group">
                          <td className="px-6 py-4 font-mono text-[10px] text-purple-400">{s.id.substring(0, 12)}...</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs text-white font-bold">{s.geo?.city || 'Unknown'}, {s.geo?.country || 'Void'}</span>
                              <span className="text-[9px] text-gray-500 flex items-center gap-1">
                                <Globe size={8} /> {s.ip}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] text-gray-300 font-medium truncate max-w-[200px]">{s.device?.browser}</span>
                              <div className="flex gap-2">
                                <span className="px-1.5 py-0.5 bg-white/5 rounded text-[8px] font-black text-gray-500 border border-white/5">{s.device?.screen}</span>
                                <span className="px-1.5 py-0.5 bg-white/5 rounded text-[8px] font-black text-gray-500 border border-white/5">{s.device?.timezone}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[10px] text-gray-400 font-mono">
                             {s.lastSeen?.seconds ? new Date(s.lastSeen.seconds * 1000).toLocaleString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'uploads' && (
              <motion.div 
                key="uploads"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-6"
              >
                {data?.uploads.map((u: any) => (
                  <div key={u.id} className="glass-card p-3 group">
                    <div className="aspect-[4/3] rounded-xl overflow-hidden mb-3 relative">
                      <img src={u.thumbnail || u.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Upload" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                        <a href={u.url} target="_blank" className="p-2 bg-white/20 hover:bg-white/40 rounded-lg backdrop-blur-md transition-all text-white"><ChevronRight size={14} /></a>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-white truncate max-w-[100px]">{u.id}</span>
                        <span className="text-[8px] font-mono text-gray-500">
                           {u.timestamp?.seconds ? new Date(u.timestamp.seconds * 1000).toLocaleTimeString() : ''}
                        </span>
                      </div>
                      {u.exif && Object.keys(u.exif).length > 0 && (
                        <div className="p-2 bg-white/5 rounded-lg border border-white/5 space-y-1">
                          <p className="text-[7px] text-gray-500 italic truncate italic">Device: {u.exif.Make} {u.exif.Model}</p>
                          <p className="text-[7px] text-gray-500 italic truncate italic">Software: {u.exif.Software}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'exports' && (
              <motion.div 
                key="exports"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="grid grid-cols-3 gap-6"
              >
                {data?.exports.map((e: any) => (
                  <div key={e.id} className="glass-card p-4 group flex flex-col h-full border-cyan-500/10">
                    <div className="aspect-video bg-black rounded-xl overflow-hidden mb-4 border border-white/5 shadow-2xl relative">
                      <img src={e.image} className="w-full h-full object-contain" alt="Export" />
                      <div className="absolute top-2 right-2 px-2 py-1 bg-cyan-600/80 backdrop-blur-md text-white text-[8px] font-black uppercase rounded shadow-lg">FINAL ASSET</div>
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                       <div className="space-y-1">
                         <div className="flex items-center gap-2">
                           <Layers size={10} className="text-cyan-400" />
                           <span className="text-[9px] font-black text-white uppercase tracking-widest">Master Artifact</span>
                         </div>
                         <p className="text-[8px] text-gray-500 font-mono truncate">{e.sessionId}</p>
                       </div>
                       <div className="mt-4 flex items-center justify-between">
                         <span className="text-[8px] font-mono text-gray-600">{e.timestamp?.seconds ? new Date(e.timestamp.seconds * 1000).toLocaleString() : ''}</span>
                         <a 
                           href={e.image} 
                           download={`export-${e.id}.png`}
                           className="p-1.5 bg-cyan-600/20 hover:bg-cyan-600 text-cyan-400 hover:text-white rounded-lg transition-all"
                         >
                           <Download size={12} />
                         </a>
                       </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'actions' && (
              <motion.div 
                key="actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card overflow-hidden"
              >
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5 sticky top-0 z-20 border-b border-white/10 backdrop-blur-md">
                      <tr>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-500">Event</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-500">Session</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-500">Details</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-500">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data?.actions.map((a: any) => (
                        <tr key={a.id} className="hover:bg-white/2 transition-colors">
                          <td className="px-6 py-4">
                             <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter ${
                               a.type.includes('ai') ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20' : 
                               a.type.includes('export') ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/20' :
                               'bg-white/5 text-gray-400'
                             }`}>
                               {a.type.replace('_', ' ')}
                             </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-[9px] text-gray-500">{a.sessionId.substring(0, 8)}...</td>
                          <td className="px-6 py-4">
                             <pre className="text-[8px] text-gray-400 font-mono overflow-hidden max-w-[250px] truncate">
                               {JSON.stringify(a.details)}
                             </pre>
                          </td>
                          <td className="px-6 py-4 text-[9px] text-gray-500 font-mono">
                             {a.timestamp?.seconds ? new Date(a.timestamp.seconds * 1000).toLocaleTimeString() : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Privacy Disclaimer */}
          <div className="pt-8 border-t border-white/5">
            <div className="p-6 bg-rose-900/10 border border-rose-900/20 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <Activity size={16} className="text-rose-400" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-400">GDRP & Ethics Compliance Notice</h4>
              </div>
              <p className="text-[9px] leading-relaxed text-gray-500">
                This environment is for educational and diagnostic purposes. All data collected is stored securely within the project scope. 
                Ensure users are aware of tracking if deploying to production. Unauthorized PII collection is strictly prohibited. 
                Current logs are retained indefinitely.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-purple-900/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-cyan-900/5 rounded-full blur-[120px]" />
      </div>
    </div>
  );
}
