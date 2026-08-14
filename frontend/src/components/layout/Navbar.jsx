import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, LogOut, Truck, Menu, X } from 'lucide-react';
import pepsiLogo from '../../assets/pepsi-logo.png';
import PWAInstallButton from '../common/PWAInstallButton';

export default function Navbar({ onSearchChange, mobileMenuOpen, setMobileMenuOpen }) {
  const { user, logout } = useAuth();
  const { darkMode, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-3 sm:px-6 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700/80 shadow-sm transition-colors relative">
      {/* 🔴🔵 Thin Signature Pepsi Dual Color Top Border */}
      <div className="absolute top-0 left-0 right-0 h-0.5 flex">
        <div className="w-1/2 bg-[#0051A5]" />
        <div className="w-1/2 bg-[#E32934]" />
      </div>

      {/* Brand & Mobile Hamburger Toggle */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen && setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-[#0051A5] transition active:scale-95"
          title="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* 🔵 Circular Round Pepsi Logo Badge */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-sm border border-slate-200/80 dark:border-slate-700 flex-shrink-0 p-0.5">
            <img
              src={pepsiLogo}
              alt="Pepsi Logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>

          <div>
            <h1 className="font-black text-sm sm:text-base md:text-lg leading-none tracking-tight">
              <span className="text-[#0051A5] dark:text-blue-400">DAVID</span>{' '}
              <span className="text-[#E32934]">TRADERS</span>
            </h1>
            <p className="text-[8px] sm:text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-400 mt-0.5">
              Pepsi Distribution ERP
            </p>
          </div>
        </div>
      </div>

      {/* User Actions & Profile */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Worker Van Assignment Badge */}
        {user?.role === 'worker' && user?.assignedVehicle && (
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-[#0051A5] dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-700/60 text-xs font-bold">
            <Truck className="w-3.5 h-3.5" />
            <span>Van: {user.assignedVehicle.vehicleNumber || 'Assigned'}</span>
          </div>
        )}

        {/* PWA Install Button (Auto-hides when installed) */}
        <PWAInstallButton variant="navbar" />

        {/* Dark/Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/80 transition"
          title="Toggle Color Theme"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Info & Role Pill */}
        <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200 dark:border-slate-700">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black text-slate-800 dark:text-white leading-tight">
              {user?.name} {user?.role === 'admin' ? '(Admin)' : ''}
            </p>
            <span className="inline-block text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase bg-blue-100 text-[#0051A5] dark:bg-blue-900/60 dark:text-blue-300">
              {user?.role}
            </span>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
