import React, { useState } from 'react';
import { LogIn, X, Sparkles, Mail, Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { auth, googleProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from '../../lib/firebase';
import { signInWithPopup } from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  title = "Unlock Premium Export",
  description = "Join Edit Pro to save projects and export in ultra-high resolution."
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md glass-card p-8 bg-[#0D0D0D] border-white/10 shadow-2xl rounded-3xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500" />
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
            
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-purple-500/20">
                  <Sparkles className="text-white" size={32} />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">{isSignUp ? 'Create Account' : title}</h2>
                <p className="text-gray-400 text-xs px-4">{description}</p>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] text-rose-400 text-center font-bold">
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Full Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      <input 
                        type="text" 
                        required 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 transition-all font-medium" 
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                      type="email" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="hello@example.com"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 transition-all font-medium" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input 
                      type="password" 
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 transition-all font-medium" 
                    />
                  </div>
                </div>

                <button 
                  disabled={isLoading}
                  type="submit" 
                  className="w-full neon-button py-4 flex items-center justify-center gap-3 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {isLoading ? <Loader2 className="animate-spin relative z-10" size={18} /> : <LogIn className="relative z-10" size={18} />}
                  <span className="font-bold relative z-10 uppercase tracking-widest text-[10px]">{isSignUp ? 'Sign Up' : 'Sign In'}</span>
                </button>
              </form>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
                <div className="relative flex justify-center text-[8px] uppercase tracking-[0.3em]"><span className="bg-[#0D0D0D] px-4 text-gray-600 font-black">Or continue with</span></div>
              </div>

              <button 
                onClick={handleGoogleLogin}
                className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center gap-3 transition-all group"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.94 0 3.51.64 4.88 1.91l3.66-3.66C18.3 1.25 15.42 0 12 0 7.31 0 3.32 2.67 1.34 6.57l4.14 3.22c.98-2.92 3.73-5.04 6.52-5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.41c-.28 1.44-1.09 2.67-2.31 3.49l3.58 2.79c2.1-1.94 3.31-4.79 3.31-8.52z" />
                  <path fill="#FBBC05" d="M5.48 14.29c-.25-.79-.39-1.63-.39-2.5s.14-1.71.39-2.5L1.34 6.57C.48 8.24 0 10.06 0 12s.48 3.76 1.34 5.43l4.14-3.14z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.58-2.79c-1.12.75-2.55 1.19-4.35 1.19-3.38 0-6.24-2.28-7.26-5.36l-4.14 3.14C3.32 21.33 7.31 24 12 24z" />
                </svg>
                <span className="font-bold text-xs">Google</span>
              </button>

              <p className="text-center text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                <button 
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="ml-2 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
