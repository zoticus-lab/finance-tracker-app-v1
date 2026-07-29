import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.name || !formData.email || !formData.password) {
        throw new Error('Please fill in all fields');
      }

      if (formData.password !== formData.password_confirmation) {
        throw new Error('Passwords do not match');
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const response = await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Registration failed');
      }

      // Keep auth state in sync by using the same login flow as LoginPage.
      await login(formData.email, formData.password);
      navigate('/');
    } catch (err) {
      if (err.data?.errors) {
        const messages = Object.values(err.data.errors).flat().join(', ');
        setError(messages);
      } else if (err.data?.message) {
        setError(err.data.message);
      } else {
        setError(err?.message || 'Registration failed');
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
      <div className="w-full max-w-[420px] bg-white border border-slate-100 rounded-[32px] shadow-2xl shadow-slate-200/80 p-8 sm:p-10 relative overflow-hidden z-10 animate-fade-in my-8">
        
        {/* Top colored accent line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary-500 via-indigo-500 to-violet-500"></div>

        {/* Logo and header */}
        <div className="space-y-3 text-center mb-8">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary-600 to-violet-600 flex items-center justify-center mx-auto text-white font-extrabold text-lg shadow-lg shadow-primary-500/20">
            U
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Daftar Akun Baru</h1>
            <p className="text-xs text-slate-500 font-semibold">Mulai langkah finansial cerdas Anda hari ini</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-2xl animate-slide-up text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Nama Lengkap</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-slate-800 placeholder-slate-400 text-sm font-medium"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Alamat Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="nama@email.com"
              className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-slate-800 placeholder-slate-400 text-sm font-medium"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Kata Sandi</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-slate-800 placeholder-slate-400 text-sm font-medium"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Konfirmasi Kata Sandi</label>
            <input
              type="password"
              name="password_confirmation"
              value={formData.password_confirmation}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-slate-800 placeholder-slate-400 text-sm font-medium"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-4 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-xl text-sm shadow-lg shadow-slate-950/10 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? 'Mendaftarkan...' : 'Buat Akun'}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center text-xs text-slate-500 pt-6 mt-4 border-t border-slate-100 font-semibold">
          Sudah memiliki akun?{' '}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors underline">
            Masuk Sekarang
          </Link>
        </div>

      </div>
    </div>
  );
}
