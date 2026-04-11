import React, { useState } from 'react';
import { Shield, ChevronRight, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

const FloatingWidget = ({ children, delay = 0, x = 0, y = 0 }: { children: React.ReactNode, delay?: number, x?: number, y?: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ 
      opacity: 1, 
      scale: 1,
      y: [y, y - 20, y],
      x: [x, x + 10, x]
    }}
    transition={{ 
      duration: 5, 
      repeat: Infinity, 
      delay,
      ease: "easeInOut"
    }}
    className="absolute hidden lg:flex items-center gap-3 bg-[#16161A]/80 backdrop-blur-md border border-[#1F1F23] p-4 rounded-2xl shadow-2xl z-0"
    style={{ left: `${50 + x}%`, top: `${50 + y}%` }}
  >
    {children}
  </motion.div>
);

const AuthScreen = () => {
  const [method, setMethod] = useState<'google' | 'email'>('google');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(userCredential.user, { displayName });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: 'Uptime', value: '99.999%', sub: 'Enterprise Grade' },
    { label: 'Latency', value: '< 12ms', sub: 'Global Average' },
    { label: 'Protection', value: '4.2B+', sub: 'Prompts Secured' },
    { label: 'Organizations', value: '1,200+', sub: 'Active Teams' }
  ];

  const reviews = [
    {
      quote: "SentinelCore has completely transformed how we handle AI safety. It's the invisible layer we didn't know we needed.",
      author: "Sarah Chen",
      role: "CTO at TechFlow",
      avatar: "https://i.pravatar.cc/150?u=sarah"
    },
    {
      quote: "The real-time collaboration features are a game-changer for our compliance team. Security is now a team sport.",
      author: "Marcus Thorne",
      role: "Head of Security at FinGuard",
      avatar: "https://i.pravatar.cc/150?u=marcus"
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black overflow-hidden relative font-sans">
      <div className="noise" />
      
      {/* Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-600/15 blur-[180px] rounded-full animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-purple-600/15 blur-[180px] rounded-full animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute top-[30%] left-[40%] w-[40%] h-[40%] bg-white/5 blur-[120px] rounded-full" />
      </div>

      {/* Floating UI Elements */}
      <FloatingWidget x={-15} y={-35} delay={0}>
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Logic Gate Active</span>
      </FloatingWidget>

      <FloatingWidget x={25} y={-25} delay={1.5}>
        <div className="p-2 bg-white/5 rounded-lg">
          <Shield size={14} className="text-white/40" />
        </div>
        <div className="space-y-1">
          <div className="h-1 w-12 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              animate={{ x: [-48, 48] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="h-full w-full bg-white/40"
            />
          </div>
          <div className="text-[8px] font-bold uppercase tracking-widest text-white/20">Scanning...</div>
        </div>
      </FloatingWidget>

      <FloatingWidget x={-35} y={15} delay={3}>
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Latency</div>
        <div className="text-xs font-display font-bold">11.8ms</div>
      </FloatingWidget>

      <FloatingWidget x={20} y={35} delay={4.5}>
        <div className="flex -space-x-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-6 h-6 rounded-full border-2 border-[#16161A] bg-white/10" />
          ))}
        </div>
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">+12k Teams</span>
      </FloatingWidget>

      <main className="relative z-10 grid grid-cols-1 lg:grid-cols-2 min-h-screen">
        {/* Left Side: Brand & Statement */}
        <div className="flex flex-col justify-between p-8 lg:p-20 border-r border-white/5">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black">
              <Shield size={20} />
            </div>
            <span className="font-display font-bold text-xl tracking-tighter uppercase">SentinelCore</span>
          </motion.div>

          <div className="space-y-12">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40 mb-6">Enterprise Security Infrastructure</div>
              <h1 className="text-6xl md:text-8xl lg:text-[8vw] font-display font-bold leading-[0.8] tracking-tighter uppercase">
                The <span className="text-white/20">Ultimate</span> <br />
                Safety <br />
                Protocol.
              </h1>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="space-y-6"
            >
              <p className="max-w-md text-lg text-white/50 font-light leading-relaxed">
                Advanced logic gates for the next generation of AI. 
                Secure your prompts, protect your data, and collaborate across your entire organization with zero-trust governance.
              </p>

              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/5">
                {stats.map((stat, i) => (
                  <div key={i}>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">{stat.label}</div>
                    <div className="text-2xl font-display font-bold">{stat.value}</div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-white/20">{stat.sub}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="space-y-8 pt-12 border-t border-white/5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {reviews.map((review, i) => (
                <div key={i} className="space-y-4">
                  <p className="text-sm text-white/60 italic font-light leading-relaxed">"{review.quote}"</p>
                  <div className="flex items-center gap-3">
                    <img src={review.avatar} className="w-8 h-8 rounded-full grayscale" alt={review.author} referrerPolicy="no-referrer" />
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest">{review.author}</div>
                      <div className="text-[9px] text-white/30 uppercase tracking-widest">{review.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Side: Auth Action */}
        <div className="flex items-center justify-center p-8 lg:p-20 bg-white/[0.01] backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="w-full max-w-sm space-y-12"
          >
            <div className="space-y-4">
              <h2 className="text-4xl font-display font-bold tracking-tight">
                {mode === 'signin' ? 'Access Dashboard' : 'Create Account'}
              </h2>
              <p className="text-white/40 text-sm">
                {mode === 'signin' 
                  ? 'Join your organization or start a new secure workspace.' 
                  : 'Start securing your AI infrastructure today.'}
              </p>
            </div>

            <div className="space-y-6">
              <AnimatePresence mode="wait">
                {method === 'google' ? (
                  <motion.div
                    key="google-method"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <button 
                      onClick={handleGoogleLogin}
                      className="group w-full bg-white text-black hover:bg-white/90 h-16 rounded-full font-bold flex items-center justify-between px-8 transition-all active:scale-[0.98] shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                    >
                      <div className="flex items-center gap-3">
                        <img src="https://www.google.com/favicon.ico" className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" alt="Google" />
                        <span>Continue with Google</span>
                      </div>
                      <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button 
                      onClick={() => setMethod('email')}
                      className="w-full h-16 rounded-full border border-white/10 hover:bg-white/5 font-bold flex items-center justify-center gap-3 transition-all"
                    >
                      <Mail size={18} className="text-white/40" />
                      <span>Continue with Email</span>
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="email-method"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <button 
                      onClick={() => setMethod('google')}
                      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                    >
                      <ArrowLeft size={12} />
                      Back to Google Login
                    </button>

                    <form onSubmit={handleEmailAuth} className="space-y-4">
                      {mode === 'signup' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-4">Full Name</label>
                          <div className="relative">
                            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                            <input 
                              type="text"
                              required
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              placeholder="John Doe"
                              className="w-full bg-white/5 border border-white/10 rounded-full h-14 pl-14 pr-6 text-sm outline-none focus:border-white/20 transition-all"
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-4">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                          <input 
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            className="w-full bg-white/5 border border-white/10 rounded-full h-14 pl-14 pr-6 text-sm outline-none focus:border-white/20 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-4">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                          <input 
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-white/5 border border-white/10 rounded-full h-14 pl-14 pr-6 text-sm outline-none focus:border-white/20 transition-all"
                          />
                        </div>
                      </div>

                      {error && (
                        <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest text-center px-4">
                          {error}
                        </p>
                      )}

                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black hover:bg-white/90 h-14 rounded-full font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                            <ChevronRight size={18} />
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="text-center">
                <button 
                  onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                >
                  {mode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                </button>
              </div>

              <div className="pt-8 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/5" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">Trusted By Global Leaders</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
                
                <div className="grid grid-cols-3 gap-8 opacity-20 grayscale contrast-150">
                  <div className="flex flex-col items-center">
                    <div className="font-display font-bold text-lg tracking-tighter">ORACLE</div>
                    <div className="text-[8px] uppercase tracking-widest mt-1">Cloud Partner</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="font-display font-bold text-lg tracking-tighter">STRIPE</div>
                    <div className="text-[8px] uppercase tracking-widest mt-1">Payments</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="font-display font-bold text-lg tracking-tighter">VERCEL</div>
                    <div className="text-[8px] uppercase tracking-widest mt-1">Infrastructure</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-12">
              <p className="text-[10px] text-white/20 leading-relaxed uppercase tracking-widest text-center">
                By continuing, you agree to SentinelCore's Terms of Service and Privacy Policy. 
                Enterprise-grade encryption active.
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Decorative Elements */}
      <div className="absolute top-10 right-10 hidden lg:block">
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.5em] text-white/20">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span>v2.5.0 Stable</span>
          </div>
          <div className="w-1 h-1 bg-white/20 rounded-full" />
          <span>Production Ready</span>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
