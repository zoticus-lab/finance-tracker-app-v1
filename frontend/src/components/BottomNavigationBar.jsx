import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  CreditCard,
  ArrowRightLeft,
  Plus,
  TrendingUp,
  PieChart,
  Target,
  Tags,
  LayoutDashboard,
  Banknote,
  Menu,
  LogOut,
} from 'lucide-react';

export default function BottomNavigationBar({ onAddClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const isActive = (path) => location.pathname === path;

  const allNavItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/accounts', label: 'Accounts', icon: CreditCard },
    { path: '/transactions', label: 'Transactions', icon: ArrowRightLeft },
    { path: '/budgets', label: 'Budgets', icon: TrendingUp },
    { path: '/reports', label: 'Reports', icon: PieChart },
    { path: '/goals', label: 'Saving Goals', icon: Target },
    { path: '/categories', label: 'Categories', icon: Tags },
    { path: '/dashboard-cards', label: 'Cards', icon: LayoutDashboard },
    { path: '/debts-credits', label: 'Hutang & Piutang', icon: Banknote },
  ];

  const handleNavClick = (item) => {
    navigate(item.path);
    setShowMenu(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/login');
    setShowMenu(false);
  };

  return (
    <>
      {/* Top Navigation Bar - Sticky */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          {/* Logo */}
          <div className="text-lg font-bold text-gray-900">Uang</div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-1 flex-1 ml-8">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddClick?.()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add</span>
            </button>

            {/* Hamburger Menu - Mobile & Tablet */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu size={24} className="text-gray-600" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile/Tablet Dropdown Menu */}
      {showMenu && (
        <div className="lg:hidden absolute left-0 right-0 top-16 bg-white border-b border-gray-200 shadow-lg z-30">
          <div className="p-4 space-y-1">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}

            <div className="border-t border-gray-200 my-2 pt-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors font-medium"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close menu when clicking outside */}
      {showMenu && (
        <div
          className="lg:hidden fixed inset-0 z-20"
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  );
}
