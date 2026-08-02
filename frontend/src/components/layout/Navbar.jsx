import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, LogOut, Truck, Menu, X, Bell } from 'lucide-react';

export default function Navbar({ onSearchChange, mobileMenuOpen, setMobileMenuOpen }) {
  const { user, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 md:px-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700/80 shadow-sm transition-colors">
      {/* Brand & Mobile Hamburger Toggle */}
      <div className="flex items-center space-x-3">
        {/* Mobile Hamburger Button (Only visible on small screens < lg) */}
        <button
          onClick={() => setMobileMenuOpen && setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          title="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center space-x-2.5">
          <img
            src="/pepsi-logo.png"
            alt="Pepsi Logo"
            className="w-9 h-9 md:w-10 md:h-10 object-contain drop-shadow-sm"
          />
          <div>
            <h1 className="font-extrabold text-base md:text-lg leading-none tracking-tight text-pepsi-blue dark:text-blue-400">
              PEPSI <span className="text-pepsi-red">VAN SALES</span>
            </h1>
            <p className="text-[9px] md:text-[10px] uppercase font-semibold tracking-widest text-slate-500 dark:text-slate-400">
              Distribution Hub
            </p>
          </div>
        </div>
      </div>

      {/* User Actions & Profile */}
      <div className="flex items-center space-x-2.5 md:space-x-4">
        {/* Worker Van Assignment Badge */}
        {user?.role === 'worker' && user?.assignedVehicle && (
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-700 text-xs font-semibold">
            <Truck className="w-3.5 h-3.5" />
            <span>Van: {user.assignedVehicle.vehicleNumber || 'Assigned'}</span>
          </div>
        )}

        {/* Dark/Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          title="Toggle Light / Dark Mode"
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Dropdown Profile Info */}
        <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200 dark:border-slate-700">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">{user?.name}</p>
            <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
              user?.role === 'admin'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
            }`}>
              {user?.role}
            </span>
          </div>
          
          <button
            onClick={logout}
            title="Log Out"
            className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
