import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, Mail, Lock, Eye, EyeOff, ShieldCheck, Warehouse, Truck, TrendingUp, CheckCircle2 } from 'lucide-react';
import pepsiLogo from '../assets/pepsi-logo.png';
import pepsiBg from '../assets/pepsi-bg.jpg';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [sessionNotice, setSessionNotice] = useState(() => sessionStorage.getItem('pepsi_logout_reason') || '');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSessionNotice('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/pos');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email address or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#070F21] px-4 py-8 sm:py-12 overflow-hidden select-none font-sans">
      {/* 🧊 Chilled Icy Pepsi Background Image with Layered Atmospheric Tint */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={pepsiBg}
          alt="Chilled Pepsi Background"
          className="w-full h-full object-cover object-center scale-105 filter brightness-[0.70] contrast-125"
        />
        {/* Deep Sapphire Gradient Vignette Overlay for High Readability on Mobile & Desktop */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#040A1A]/92 via-[#06112C]/82 to-[#040A1A]/92 backdrop-blur-[1.5px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617]/85" />
      </div>

      {/* Grid texture subtle overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0 opacity-40" />

      {/* 🏢 MAIN BALANCED CONTAINER */}
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center justify-center z-10 relative">

        {/* 🚀 LEFT SIDE - WELCOME BACK HERO & BUSINESS VALUE PROPS */}
        <div className="hidden lg:flex lg:col-span-7 flex-col justify-center text-left text-white space-y-6 pr-4">
          
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-bold w-fit shadow-sm backdrop-blur-md">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span>OFFICIAL DISTRIBUTOR ENTERPRISE PORTAL</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight drop-shadow-md">
              Welcome <span className="text-[#3B82F6]">Back</span>
            </h1>
            <p className="text-lg font-bold text-slate-200 drop-shadow-sm">
              Warehouse & Van Sales Management System
            </p>
          </div>

          {/* Dual Color Brand Accent Line */}
          <div className="flex h-1.5 w-20 rounded-full overflow-hidden shadow-sm">
            <div className="w-1/2 bg-[#0051A5]" />
            <div className="w-1/2 bg-[#E32934]" />
          </div>

          {/* Value Highlights */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center space-x-3 text-sm text-slate-200 font-semibold drop-shadow-sm">
              <div className="p-2 bg-blue-500/20 backdrop-blur-md rounded-xl border border-blue-400/30 text-blue-300 shadow-sm">
                <Warehouse className="w-4 h-4" />
              </div>
              <span>Central Warehouse Stock & Batch Expiry Tracking</span>
            </div>

            <div className="flex items-center space-x-3 text-sm text-slate-200 font-semibold drop-shadow-sm">
              <div className="p-2 bg-emerald-500/20 backdrop-blur-md rounded-xl border border-emerald-400/30 text-emerald-300 shadow-sm">
                <Truck className="w-4 h-4" />
              </div>
              <span>Delivery Van Loading & Mobile POS Billing</span>
            </div>

            <div className="flex items-center space-x-3 text-sm text-slate-200 font-semibold drop-shadow-sm">
              <div className="p-2 bg-purple-500/20 backdrop-blur-md rounded-xl border border-purple-400/30 text-purple-300 shadow-sm">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span>Automated WhatsApp Invoices & Customer Dues Ledger</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 font-medium pt-2">
            Authorized PepsiCo Bottling & Distribution ERP Platform
          </p>
        </div>

        {/* 🔒 RIGHT SIDE - DAVID TRADERS PEPSI THEME LOGIN CARD */}
        <div className="lg:col-span-5 flex items-center justify-center">
          <div className="w-full max-w-[400px] bg-white text-slate-900 p-7 sm:p-9 rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.7)] border border-slate-100 space-y-6 mx-auto backdrop-blur-lg">
            
            {/* Header with Pepsi Logo and DAVID TRADERS in Pepsi Theme */}
            <div className="text-center space-y-2">
              <div className="relative inline-block">
                <div className="w-16 h-16 sm:w-18 sm:h-18 mx-auto rounded-full overflow-hidden flex items-center justify-center bg-white shadow-md border border-slate-100 p-0.5 mb-1">
                  <img
                    src={pepsiLogo}
                    alt="Pepsi Logo"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  <span className="text-slate-900">DAVID </span>
                  <span className="text-[#0051A5]">TRADERS</span>
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Sign in to manage sales, stock & billing
                </p>
              </div>
            </div>

            {/* Session Notice / Inactivity Alert */}
            {sessionNotice && !error && (
              <div className="flex items-center space-x-2.5 p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl text-xs font-bold animate-fade-in">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 text-blue-600" />
                <span>{sessionNotice}</span>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="flex items-center space-x-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-bold animate-fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Email Address Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#0051A5] focus:ring-2 focus:ring-blue-600/20 transition"
                  />
                </div>
              </div>

              {/* Password Input with Show/Hide Toggle */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Password
                  </label>
                </div>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#0051A5] focus:ring-2 focus:ring-blue-600/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 transition p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center space-x-2 font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-[#0051A5] focus:ring-[#0051A5] w-4 h-4 cursor-pointer"
                  />
                  <span>Remember me on this device</span>
                </label>
              </div>

              {/* Submit Button in Pepsi Blue */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-2 bg-[#0051A5] hover:bg-[#003E80] active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-900/25 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              </button>
            </form>

            {/* Footer Information */}
            <div className="border-t border-slate-100 pt-4 mt-2 text-center text-slate-400 text-[11px] font-semibold flex items-center justify-center space-x-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0051A5]" />
              <span>Encrypted & Protected Session</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
