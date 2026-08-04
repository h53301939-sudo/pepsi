import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/pos');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-pepsi-blue/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-pepsi-red/20 rounded-full blur-3xl" />

      <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-xl p-8 rounded-3xl border border-slate-700 shadow-2xl z-10 space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <img
            src="/pepsi-logo.png"
            alt="Pepsi Logo"
            className="w-20 h-20 mx-auto object-contain drop-shadow-md"
          />
          <h2 className="text-2xl font-black text-white tracking-tight">
            DAVID <span className="text-pepsi-blue">TRADERS</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium">Warehouse & Van Sales Management ERP</p>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-pepsi-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-pepsi-blue"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-pepsi-blue to-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/20 transition flex items-center justify-center space-x-2 text-sm"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Logging in...' : 'Sign In to System'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
