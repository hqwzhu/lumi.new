import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Rocket, Sparkles, X, LogIn, UserPlus } from 'lucide-react';
import * as authService from '../../services/authService';

export function LoginRequired({ t, onLogin }: { t: any; onLogin: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8"
    >
      <div className="w-24 h-24 rounded-3xl bg-celestial-saturn/10 flex items-center justify-center text-celestial-saturn">
        <Sparkles size={48} />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tighter">{t.loginRequired || 'Authentication Required'}</h2>
        <p className="text-white/40 max-w-md mx-auto">
          {t.loginRequiredDesc || 'Please connect your account to access this module and synchronize your local intelligence.'}
        </p>
      </div>
      <button
        onClick={onLogin}
        className="px-8 py-4 bg-celestial-saturn text-black font-bold rounded-full hover:scale-105 transition-transform flex items-center gap-2"
      >
        <Rocket size={20} />
        {t.connect}
      </button>
    </motion.div>
  );
}

export function LoginModal({ t, isOpen, onClose, onLoginSuccess, onGoogleLogin }: { t: any; isOpen: boolean; onClose: () => void; onLoginSuccess: () => void; onGoogleLogin: () => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      let result;
      if (isRegister) {
        const phoneRegex = /^\+?[0-9]{5,15}$/;
        if (!phoneRegex.test(phone)) {
          setError(t.invalidPhone || 'Invalid phone number format');
          setLoading(false);
          return;
        }
        result = await authService.register(username, password, phone);
      } else {
        result = await authService.login(username, password);
      }

      if (result.success) {
        onLoginSuccess();
        onClose();
      } else {
        setError(result.error || (isRegister ? 'Registration failed' : 'Login failed'));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#111] border border-white/10 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl relative"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-celestial-mars via-celestial-saturn to-celestial-mars" />
        
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-black tracking-tighter text-white">
                {isRegister ? t.register || 'Create Node' : t.loginTitle || 'Sync Node'}
              </h2>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">
                Lumi Network Authentication
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">{t.username || 'Identifier'}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/10 focus:outline-none focus:border-celestial-saturn/50 transition-colors"
                placeholder="User_ID_0X1F"
              />
            </div>

            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">{t.phone || 'Communication Line'}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/10 focus:outline-none focus:border-celestial-saturn/50 transition-colors"
                  placeholder="+86..."
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">{t.password || 'Access Key'}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/10 focus:outline-none focus:border-celestial-saturn/50 transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${
                  loading ? 'bg-white/10 text-white/20 cursor-not-allowed' : 'bg-white text-black hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    {isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
                    {isRegister ? t.registerBtn || 'Register Node' : t.loginBtn || 'Initialize Link'}
                  </>
                )}
              </button>

              <div className="flex items-center gap-4 my-2">
                 <div className="h-px flex-1 bg-white/5" />
                 <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">or</span>
                 <div className="h-px flex-1 bg-white/5" />
              </div>

              <button
                type="button"
                onClick={onGoogleLogin}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-xl font-black uppercase tracking-widest text-white/80 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                {t.googleLogin || 'Nexus Google Sign-in'}
              </button>

              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="text-[10px] font-black text-celestial-saturn uppercase tracking-widest hover:underline transition-all mt-2"
              >
                {isRegister ? t.hasAccount || 'Return to Login' : t.noAccount || 'Expand Neural Network'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
