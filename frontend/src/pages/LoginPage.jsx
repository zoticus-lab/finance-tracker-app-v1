import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        throw new Error('Please fill in all fields');
      }

      await login(email, password);
      navigate('/');
    } catch (err) {
      if (err.data?.errors) {
        const messages = Object.values(err.data.errors).flat().join(', ');
        setError(messages);
      } else if (err.data?.message) {
        setError(err.data.message);
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 relative font-sans antialiased">
      {/* Decorative subtle ambient glows */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary-100/50 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-100/50 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Centered card */}
      <div className="w-full max-w-[420px] bg-white border border-slate-100 rounded-[32px] shadow-2xl shadow-slate-200/80 p-8 sm:p-10 relative overflow-hidden z-10 animate-fade-in">
        
        {/* Top colored accent line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary-500 via-indigo-500 to-violet-500"></div>

        {/* Logo and header */}
        <div className="space-y-3 text-center mb-8">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary-600 to-violet-600 flex items-center justify-center mx-auto text-white font-extrabold text-lg shadow-lg shadow-primary-500/20">
            U
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Masuk ke Uang.co</h1>
            <p className="text-xs text-slate-500 font-semibold">Kelola dan pantau keuangan harian Anda</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-2xl animate-slide-up text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Alamat Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-slate-800 placeholder-slate-400 text-sm font-medium"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Kata Sandi</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-slate-800 placeholder-slate-400 text-sm font-medium"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-xl text-sm shadow-lg shadow-slate-950/10 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? 'Menghubungkan...' : 'Lanjutkan'}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center text-xs text-slate-500 pt-8 mt-4 border-t border-slate-100 font-semibold">
          Belum memiliki akun?{' '}
          <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors underline">
            Buat Akun Baru
          </Link>
        </div>

      </div>
    </div>
  );
}
