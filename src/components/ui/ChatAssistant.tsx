import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Sparkles, Wand2, Type } from 'lucide-react';
import { chatWithAI } from '../../services/chatService';
import { analytics } from '../../services/analyticsService';
import { db, auth } from '../../lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatAssistantProps {
  onGeneratePoster: (posterData: any) => void;
  onUpdatePoster: (posterData: any) => void;
  getCurrentCanvasState: () => any;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ 
  onGeneratePoster, 
  onUpdatePoster,
  getCurrentCanvasState 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hey! 👋 I'm your Edit Pro AI assistant. I can design professional posters for you. What are we creating today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    const loadChat = async () => {
      if (auth.currentUser) {
        try {
          const chatDoc = await getDoc(doc(db, 'chatHistory', auth.currentUser.uid));
          if (chatDoc.exists()) {
            const data = chatDoc.data();
            if (data.messages && data.messages.length > 0) {
              setMessages(data.messages);
            }
          }
        } catch (e: any) {
          // If offline, persistence will eventually kick in, but getDoc might fail 
          // if it can't reach the server initially and nothing is in cache yet.
          if (e.code === 'unavailable' || e.message?.includes('offline')) {
            console.log("Chat history: Operating in offline mode.");
            return;
          }
          console.error("Chat Load Error:", e);
        }
      }
    };
    if (isOpen) loadChat();
  }, [isOpen]);

  // Save chat history when messages change
  useEffect(() => {
    const saveChat = async () => {
      if (auth.currentUser && messages.length > 1) {
        try {
          await setDoc(doc(db, 'chatHistory', auth.currentUser.uid), {
            userId: auth.currentUser.uid,
            messages: messages,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.error("Chat History Save Error:", e);
        }
      }
    };
    const timer = setTimeout(saveChat, 2000); // 2 second debounce
    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    
    analytics.trackAction('chat_message_sent', { length: input.length });

    try {
      const canvasState = getCurrentCanvasState();
      const response = await chatWithAI([...messages, userMessage], canvasState);
      
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: response.chatResponse }]);

      if (response.action === 'create' && response.posterData) {
        onGeneratePoster(response.posterData);
        analytics.trackAction('ai_poster_created_from_chat', { root_prompt: input });
      } else if (response.action === 'update' && response.posterData) {
        onUpdatePoster(response.posterData);
        analytics.trackAction('ai_poster_updated_from_chat', { edit_prompt: input });
      }
    } catch (error) {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'assistant', content: "AI is temporarily unavailable. Please try again." }]);
    }
  };

  return (
    <div className="fixed bottom-24 right-8 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[420px] h-[650px] glass-card flex flex-col overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border-white/20 ring-1 ring-white/10"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/10 bg-gradient-to-r from-purple-900/40 to-blue-900/40 backdrop-blur-3xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-xl shadow-purple-500/20 relative group">
                  <Sparkles size={20} className="text-white group-hover:rotate-12 transition-transform" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1A1A1A] animate-pulse" />
                </div>
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Edit Pro Assistant</h3>
                  <p className="text-[9px] text-purple-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-purple-400 rounded-full animate-ping" />
                    Ultra Intelligent AI
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-500 hover:text-white transition-all hover:bg-white/5 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-black/40 relative"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.05),transparent_50%)] pointer-events-none" />
              {messages.map((msg, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[88%] p-4 rounded-3xl text-[13px] font-medium leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-tr-none shadow-purple-900/40' 
                      : 'bg-white/5 text-gray-100 border border-white/10 rounded-tl-none font-normal'
                  }`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 p-4 rounded-3xl rounded-tl-none">
                    <div className="flex gap-1.5">
                      {[0, 0.2, 0.4].map(delay => (
                        <motion.div 
                          key={delay}
                          animate={{ y: [0, -4, 0] }} 
                          transition={{ repeat: Infinity, duration: 0.6, delay }} 
                          className="w-1.5 h-1.5 bg-purple-400 rounded-full" 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Smart Suggestions */}
            <div className="px-5 py-3 border-t border-white/5 bg-black/60 flex gap-2 overflow-x-auto no-scrollbar">
              {[
                { label: 'Create Birthday Poster', prompt: 'Make a luxury birthday poster' },
                { label: 'Movie Vibe', prompt: 'Turn this into a cinematic movie poster' },
                { label: 'Add Neon Lights', prompt: 'Add realistic neon lighting effects' },
                { label: 'Change Theme', prompt: 'Make it a dark cyberpunk theme' }
              ].map((s, idx) => (
                <button 
                  key={idx}
                  onClick={() => setInput(s.prompt)}
                  className="whitespace-nowrap px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="p-5 border-t border-white/10 bg-black/80">
              <div className="flex gap-3 relative border border-white/10 rounded-2xl p-1 bg-white/5 group focus-within:border-purple-500/50 transition-all">
                <input 
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSend()}
                  placeholder="Tell me what to design..."
                  className="flex-1 bg-transparent px-4 py-3 text-[13px] text-white outline-none font-medium placeholder:text-gray-600"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="w-10 h-10 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:bg-gray-800 rounded-xl flex items-center justify-center transition-all shadow-xl shadow-purple-900/40 group active:scale-95"
                >
                  <Send size={18} className="text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>
              <p className="mt-3 text-[9px] text-gray-600 text-center uppercase tracking-widest font-black">
                AI can design, edit, and talk like ChatGPT
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 ${
          isOpen ? 'bg-rose-600 rotate-90 scale-90' : 'bg-gradient-to-br from-purple-600 to-blue-700 hover:scale-110'
        } relative group border border-white/20`}
      >
        <div className="absolute inset-0 rounded-2xl bg-purple-400 opacity-20 animate-ping group-hover:animate-none" />
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity" />
        {isOpen ? <X size={26} className="text-white relative z-10" /> : <MessageSquare size={26} className="text-white relative z-10" />}
      </button>
    </div>
  );
};
