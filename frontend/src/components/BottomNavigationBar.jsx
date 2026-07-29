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
  X,
  ChevronRight,
  User,
} from 'lucide-react';

export default function BottomNavigationBar({ onAddClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  const isActive = (path) => location.pathname === path;

  // Main 4 navigation links for mobile bar (plus the center add button)
  const mobilePrimaryItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/transactions', label: 'Riwayat', icon: ArrowRightLeft },
    { path: '/budgets', label: 'Anggaran', icon: TrendingUp },
  ];

  // Grouped navigation items for Desktop Sidebar
  const desktopGroups = [
    {
      title: 'Tinjauan',
      items: [
        { path: '/', label: 'Dasbor', icon: Home },
        { path: '/transactions', label: 'Transaksi', icon: ArrowRightLeft },
        { path: '/accounts', label: 'Rekening Saya', icon: CreditCard },
      ],
    },
    {
      title: 'Perencanaan',
      items: [
        { path: '/budgets', label: 'Anggaran Bulanan', icon: TrendingUp },
        { path: '/goals', label: 'Target Tabungan', icon: Target },
        { path: '/debts-credits', label: 'Hutang & Piutang', icon: Banknote },
      ],
    },
    {
      title: 'Analitik & Kustomisasi',
      items: [
        { path: '/reports', label: 'Laporan Keuangan', icon: PieChart },
        { path: '/categories', label: 'Kategori Transaksi', icon: Tags },
        { path: '/dashboard-cards', label: 'Kustom Kartu', icon: LayoutDashboard },
      ],
    },
  ];

  // Flat list of remaining items for Mobile More sheet
  const mobileMoreItems = [
    { path: '/accounts', label: 'Rekening', icon: CreditCard },
    { path: '/goals', label: 'Target Tabungan', icon: Target },
    { path: '/debts-credits', label: 'Hutang & Piutang', icon: Banknote },
    { path: '/reports', label: 'Laporan', icon: PieChart },
    { path: '/categories', label: 'Kategori', icon: Tags },
    { path: '/dashboard-cards', label: 'Kartu Dasbor', icon: LayoutDashboard },
  ];

  const handleNavClick = (path) => {
    navigate(path);
    setShowMoreSheet(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/login');
    setShowMoreSheet(false);
  };

  return (
    <>
      {/* ========================================================= */}
      {/* DESKTOP MODE: Elegant Left Sidebar (lg screen)            */}
      {/* ========================================================= */}
      <aside className="hidden lg:flex flex-col w-64 fixed left-0 top-0 bottom-0 bg-white border-r border-slate-100 z-35 justify-between select-none">
        <div className="flex flex-col pt-6 overflow-y-auto flex-1">
          {/* Logo & Branding */}
          <div className="px-6 mb-6 flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-violet-600 flex items-center justify-center text-white font-extrabold text-base shadow-md shadow-primary-500/10">
              U
            </div>
            <span className="text-lg font-extrabold bg-gradient-to-r from-primary-600 to-violet-600 bg-clip-text text-transparent tracking-tight">Uang.co</span>
          </div>

          {/* Quick Create Transaction Button */}
          <div className="px-4 mb-6">
            <button
              onClick={() => onAddClick?.()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white text-xs font-bold shadow-md shadow-primary-500/10 hover:shadow-lg transition-all duration-300 active:scale-[0.98]"
            >
              <Plus size={16} />
              <span>Transaksi Baru</span>
            </button>
          </div>

          {/* Sidebar Menu Groups */}
          <nav className="px-3 space-y-6">
            {desktopGroups.map((group) => (
              <div key={group.title} className="space-y-1.5">
                <span className="block px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{group.title}</span>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavClick(item.path)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
                          active
                            ? 'bg-slate-50 text-slate-900 border-slate-100 shadow-sm'
                            : 'text-slate-500 border-transparent hover:bg-slate-50/50 hover:text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon size={16} className={active ? 'text-primary-600' : 'text-slate-400'} />
                          <span>{item.label}</span>
                        </div>
                        {active && <span className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-pulse"></span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Desktop Profile & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
              <User size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">Pengguna Lokal</p>
              <p className="text-[10px] text-slate-400 font-medium truncate">Aktif</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 transition-all duration-200"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* MOBILE MODE: Native Bottom Navigation Bar (< lg screen)   */}
      {/* ========================================================= */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 z-40 px-4 py-2 flex items-center justify-around h-16 shadow-lg shadow-slate-100">
        
        {/* Home Tab */}
        <button
          onClick={() => handleNavClick('/')}
          className={`flex flex-col items-center justify-center w-12 h-12 transition-colors ${
            isActive('/') ? 'text-primary-600 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <Home size={20} className={isActive('/') ? 'stroke-[2.5px]' : ''} />
          <span className="text-[9px] mt-0.5 tracking-tight">Dasbor</span>
        </button>

        {/* History Tab */}
        <button
          onClick={() => handleNavClick('/transactions')}
          className={`flex flex-col items-center justify-center w-12 h-12 transition-colors ${
            isActive('/transactions') ? 'text-primary-600 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <ArrowRightLeft size={20} className={isActive('/transactions') ? 'stroke-[2.5px]' : ''} />
          <span className="text-[9px] mt-0.5 tracking-tight">Riwayat</span>
        </button>

        {/* Center Floating Plus Button */}
        <div className="relative -top-4">
          <button
            onClick={() => onAddClick?.()}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-primary-500/20 active:scale-90 transition-all duration-200"
            aria-label="Add transaction"
          >
            <Plus size={24} className="stroke-[3px]" />
          </button>
        </div>

        {/* Budgets Tab */}
        <button
          onClick={() => handleNavClick('/budgets')}
          className={`flex flex-col items-center justify-center w-12 h-12 transition-colors ${
            isActive('/budgets') ? 'text-primary-600 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <TrendingUp size={20} className={isActive('/budgets') ? 'stroke-[2.5px]' : ''} />
          <span className="text-[9px] mt-0.5 tracking-tight">Anggaran</span>
        </button>

        {/* More Tab */}
        <button
          onClick={() => setShowMoreSheet(true)}
          className={`flex flex-col items-center justify-center w-12 h-12 transition-colors ${
            showMoreSheet ? 'text-primary-600' : 'text-slate-400 font-medium'
          }`}
        >
          <Menu size={20} />
          <span className="text-[9px] mt-0.5 tracking-tight">Lainnya</span>
        </button>

      </nav>

      {/* ========================================================= */}
      {/* MOBILE MORE MENU: Elegant Bottom Sheet Drawer             */}
      {/* ========================================================= */}
      {showMoreSheet && (
        <>
          {/* Dark Backdrop Overlay */}
          <div
            className="lg:hidden fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-45 animate-fade-in"
            onClick={() => setShowMoreSheet(false)}
          />

          {/* Bottom Sheet Drawer */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] max-h-[80vh] overflow-y-auto p-6 pb-8 shadow-2xl z-50 animate-slide-up border-t border-slate-100 flex flex-col justify-between">
            <div>
              {/* Handle indicator at the top */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>

              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Menu Lainnya</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">Akses fitur kustomisasi</p>
                </div>
                <button
                  onClick={() => setShowMoreSheet(false)}
                  className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Grid links list */}
              <div className="grid grid-cols-2 gap-3.5 mb-6">
                {mobileMoreItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavClick(item.path)}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left text-xs font-bold transition-all ${
                        active
                          ? 'bg-slate-50 text-slate-900 border-slate-200 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-2 rounded-xl ${active ? 'bg-primary-50 text-primary-600' : 'bg-slate-50 text-slate-500'}`}>
                        <Icon size={16} />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Logout item at bottom of drawer */}
            <div className="border-t border-slate-100 pt-5 mt-2 flex flex-col gap-3">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-50 text-rose-600 text-xs font-bold transition-colors active:bg-rose-100"
              >
                <LogOut size={16} />
                <span>Logout dari Aplikasi</span>
              </button>
            </div>

          </div>
        </>
      )}
    </>
  );
}

