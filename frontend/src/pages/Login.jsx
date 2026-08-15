import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, ArrowRight, Store, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import pepsiBottlesHero from '../assets/pepsi-bottles-hero.jpg';

// 🌐 High-Resolution 3D Pepsi Globe Vector Logo for footer
const PepsiGlobe = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 100 100" className={`${className} drop-shadow select-none`}>
    <defs>
      <radialGradient id="pepsiRedGrad" cx="38%" cy="28%" r="65%">
        <stop offset="0%" stopColor="#FF3A4B" />
        <stop offset="55%" stopColor="#E31837" />
        <stop offset="100%" stopColor="#A80B1E" />
      </radialGradient>
      <radialGradient id="pepsiBlueGrad" cx="38%" cy="72%" r="65%">
        <stop offset="0%" stopColor="#0058B8" />
        <stop offset="55%" stopColor="#002B7F" />
        <stop offset="100%" stopColor="#001445" />
      </radialGradient>
      <linearGradient id="pepsiWhiteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#E8EEF5" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#pepsiWhiteGrad)" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
    <path
      d="M 50,2 A 48,48 0 0,1 97.5,42 C 80,40 60,49 43,55 C 24,62 12,58 2.5,48 A 48,48 0 0,1 50,2 Z"
      fill="url(#pepsiRedGrad)"
    />
    <path
      d="M 2.5,52 C 12,60 25,64 43,57 C 60,51 80,42 97.5,44 A 48,48 0 0,1 50,98 A 48,48 0 0,1 2.5,52 Z"
      fill="url(#pepsiBlueGrad)"
    />
  </svg>
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [sessionNotice, setSessionNotice] = useState(() => {
    try {
      const reason = sessionStorage.getItem('pepsi_logout_reason');
      if (!reason || reason === '[object Object]' || reason === 'null' || reason === 'undefined') return '';
      return typeof reason === 'string' ? reason : '';
    } catch (e) {
      return '';
    }
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSessionNotice('');
    try {
      sessionStorage.removeItem('pepsi_logout_reason');
    } catch (e) {}
    setLoading(true);

    try {
      const user = await login(email, password);
      // Set flag to show target motivation popup on each login
      sessionStorage.setItem('pepsi_show_target_motivation_on_login', 'true');

      if (user.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#00103B] flex items-center justify-center font-sans antialiased select-none p-3 sm:p-4 md:p-6 overflow-y-auto">
      
      {/* 📱 RESPONSIVE APP CONTAINER - ZOOM-RESILIENT & ADAPTS DYNAMICALLY */}
      <div className="w-full max-w-[420px] my-auto bg-[#001D66] rounded-[28px] sm:rounded-[36px] relative flex flex-col justify-between overflow-hidden shadow-2xl border border-blue-900/50">
        
        {/* 🧊 RESPONSIVE HERO PRODUCT PHOTOGRAPHY (SHRINKS AUTOMATICALLY ON SHORT / ZOOMED SCREENS) */}
        <div className="relative w-full h-44 xs:h-52 sm:h-60 max-h-[30vh] -mb-6 sm:-mb-8 flex items-center justify-center overflow-hidden pointer-events-none shrink-0">
          <img
            src={pepsiBottlesHero}
            alt="Chilled Pepsi Splash"
            className="w-full h-full object-cover object-[center_30%] filter brightness-105 contrast-110"
          />
          {/* Top subtle vignette */}
          <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#001D66]/80 to-transparent" />
          {/* Bottom gradient fade into wave */}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#001D66] to-transparent opacity-50" />
        </div>

        {/* 🌊 DYNAMIC CURVED WHITE CARD CONTAINER */}
        <div className="relative z-10 w-full mt-auto">
          
          {/* Organic Wave Top Edge with Red Highlight Ribbon Curve */}
          <div className="w-full leading-none overflow-hidden -mb-[1px]">
            <svg
              viewBox="0 0 500 75"
              preserveAspectRatio="none"
              className="w-full h-9 sm:h-11 block"
            >
              {/* Red Accent Wave Swoosh on Top Left */}
              <path
                d="M 0,18 C 110,-2 200,46 500,12 L 500,75 L 0,75 Z"
                fill="#EB1933"
              />
              {/* Main White Card Wave Body */}
              <path
                d="M 0,28 C 130,6 220,54 500,20 L 500,75 L 0,75 Z"
                fill="#FFFFFF"
              />
            </svg>
          </div>

          {/* White Card Body */}
          <div className="bg-white px-5 sm:px-7 pt-1.5 pb-5 sm:pb-6 rounded-b-[28px] sm:rounded-b-[36px] shadow-2xl space-y-3.5">
            
            {/* Store Icon Badge & Subtitle */}
            <div className="text-center space-y-0.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#EBF3FC] border border-blue-100 flex items-center justify-center mx-auto text-[#002B7F] shadow-sm mb-1">
                <Store className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight flex items-center justify-center space-x-1.5 leading-tight">
                <span className="text-[#002B7F]">DAVID</span>
                <span className="text-[#EB1933]">TRADERS</span>
              </h2>
              <p className="text-[11px] font-semibold text-slate-500">
                Distributor Management System
              </p>
            </div>

            {/* Session Expired / Inactivity / Blocked Alert */}
            {typeof sessionNotice === 'string' && sessionNotice.trim() && !sessionNotice.includes('[object') && !error && (
              <div className={`flex items-center space-x-2 p-2.5 rounded-xl text-xs font-bold animate-fade-in ${
                sessionNotice.toLowerCase().includes('blocked') || sessionNotice.toLowerCase().includes('deactivated')
                  ? 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-300'
                  : 'bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-900/50 dark:text-blue-300'
              }`}>
                {sessionNotice.toLowerCase().includes('blocked') || sessionNotice.toLowerCase().includes('deactivated') ? (
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                ) : (
                  <ShieldCheck className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                )}
                <span>{sessionNotice}</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 p-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* 📝 LOGIN FORM */}
            <form onSubmit={handleSubmit} className="space-y-3 pt-0.5">
              
              {/* 👤 Username / Email Input - Highlighted & Defined */}
              <div className="relative flex items-center bg-[#F8FAFC] focus-within:bg-white border-2 border-slate-300 hover:border-[#002B7F] focus-within:border-[#002B7F] focus-within:ring-4 focus-within:ring-blue-500/20 rounded-2xl px-3.5 sm:px-4 py-3 transition-all duration-200 shadow-[0_2px_8px_rgba(0,43,127,0.06)]">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#002B7F] mr-2.5 sm:mr-3 shrink-0 stroke-[2.4]" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter Email"
                  className="w-full text-slate-900 text-xs sm:text-sm font-semibold placeholder:text-slate-600 placeholder:font-medium focus:outline-none bg-transparent"
                />
              </div>

              {/* 🔒 Password Input - Highlighted & Defined */}
              <div className="relative flex items-center bg-[#F8FAFC] focus-within:bg-white border-2 border-slate-300 hover:border-[#002B7F] focus-within:border-[#002B7F] focus-within:ring-4 focus-within:ring-blue-500/20 rounded-2xl px-3.5 sm:px-4 py-3 transition-all duration-200 shadow-[0_2px_8px_rgba(0,43,127,0.06)]">
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-[#002B7F] mr-2.5 sm:mr-3 shrink-0 stroke-[2.4]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full text-slate-900 text-xs sm:text-sm font-semibold placeholder:text-slate-600 placeholder:font-medium focus:outline-none bg-transparent pr-2"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-700 transition p-1 shrink-0"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 stroke-[2.2]" />
                  ) : (
                    <Eye className="w-4 h-4 stroke-[2.2]" />
                  )}
                </button>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center space-x-2 pt-0.5">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-[#002B7F] focus:ring-[#002B7F] w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-600">Remember Me</span>
                </label>
              </div>

              {/* Submit Button - Lightened & Softened */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-[#0052CC] hover:bg-[#0041A8] active:scale-[0.98] text-white font-bold text-sm sm:text-base shadow-md shadow-blue-600/20 flex items-center justify-center space-x-2 transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loging In...</span>
                  </>
                ) : (
                  <>
                    <span>Login</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* 🏷️ FOOTER BRANDING: THIRSTY [PEPSI GLOBE] FOR MORE */}
        <div className="py-2.5 px-4 text-center bg-[#00174F] sm:bg-[#00174F]/90 z-20 shrink-0">
          <div className="inline-flex items-center justify-center text-xs tracking-wider">
            <span className="text-white font-black uppercase text-[11px] sm:text-xs">
              THIRSTY
            </span>
            <PepsiGlobe className="w-4 h-4 mx-1.5" />
            <span className="text-[#0085CA] font-black uppercase text-[11px] sm:text-xs">
              FOR MORE
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
