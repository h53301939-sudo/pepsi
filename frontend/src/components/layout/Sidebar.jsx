import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Truck,
  ShoppingCart,
  Receipt,
  Users,
  FileText,
  BookOpen,
  BarChart3,
  Activity,
  UserCheck,
  Settings,
  CornerUpLeft,
  ArrowRightLeft,
  Store
} from 'lucide-react';

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, role: 'all' },
    { label: 'Van Sales POS', path: '/pos', icon: ShoppingCart, role: 'all' },
    { label: 'Direct Warehouse Sale', path: '/warehouse-pos', icon: Store, role: 'all' },
    { label: 'Products Catalog', path: '/products', icon: Package, role: 'admin' },
    { label: 'Stock Inward (Purchases)', path: '/purchases', icon: ArrowRightLeft, role: 'admin' },
    { label: 'Warehouse Stock', path: '/warehouse', icon: Warehouse, role: 'admin' },
    { label: 'Vehicle Fleet', path: '/vehicles', icon: Truck, role: 'admin' },
    { label: 'Van Loading', path: '/loading', icon: Package, role: 'all' },
    { label: 'Sales Invoices', path: '/invoices', icon: Receipt, role: 'all' },
    { label: 'Customers & Credit', path: '/customers', icon: Users, role: 'all' },
    { label: 'Van Returns', path: '/returns', icon: CornerUpLeft, role: 'all' },
    { label: 'Stock Ledger', path: '/ledger', icon: BookOpen, role: 'admin' },
    { label: 'Reports & Analytics', path: '/reports', icon: BarChart3, role: 'admin' },
    { label: 'Worker Staff', path: '/workers', icon: UserCheck, role: 'admin' },
    { label: 'Activity Logs', path: '/activity-logs', icon: Activity, role: 'admin' },
    { label: 'System Settings', path: '/settings', icon: Settings, role: 'admin' },
  ];

  const filteredNav = navItems.filter(item => item.role === 'all' || (isAdmin && item.role === 'admin'));

  const navContent = (
    <div className="p-4 flex flex-col justify-between h-full">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Main Navigation
        </div>
        {filteredNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen && setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-pepsi-blue text-white shadow-md shadow-blue-500/20 font-semibold dark:bg-blue-600'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Footer Branding */}
      <div className="p-3 mt-6 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/50">
        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Pepsi ERP v1.0</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">Single Source Ledger Active</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/80 min-h-[calc(100vh-4rem)] flex-col justify-between transition-colors">
        {navContent}
      </aside>

      {/* Mobile Slide-Out Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-full bg-white dark:bg-slate-800 h-full shadow-2xl overflow-y-auto z-10">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
