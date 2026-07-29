import React, { useState, useEffect } from 'react';
import { Download, FileText, BarChart3 } from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';

export default function MonthlyExportPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);

  // Fetch summary untuk bulan yang dipilih
  const fetchMonthlySummary = async (year, month) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/export/summary', {
        params: { year, month }
      });
      if (response.success) {
        setSummary(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch summary');
      console.error('Error fetching summary:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary ketika month/year berubah
  useEffect(() => {
    fetchMonthlySummary(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  // Handle export ke format tertentu
  const handleExport = async (format) => {
    try {
      const params = {
        year: selectedYear,
        month: selectedMonth,
        format: format
      };

      if (format === 'json') {
        // JSON format - use normal API call
        const response = await api.get('/export/monthly', { params });
        const dataStr = JSON.stringify(response, null, 2);
        downloadFile(dataStr, `financial_report_${selectedYear}_${selectedMonth}.json`, 'application/json');
      } else {
        // CSV/PDF - need to use axios directly for blob response to bypass interceptor
        const token = localStorage.getItem('auth_token');
        const response = await api.get('/export/monthly', {
          params,
          responseType: 'blob',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        downloadBlob(response, `financial_report_${selectedYear}_${selectedMonth}.${format}`, `text/${format}`);
      }
    } catch (err) {
      setError(err.message || `Failed to export as ${format.toUpperCase()}`);
      console.error(`Error exporting ${format}:`, err);
    }
  };

  const downloadFile = (content, filename, mimeType) => {
    const element = document.createElement('a');
    element.setAttribute('href', `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`);
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadBlob = (blob, filename, mimeType) => {
    const url = window.URL.createObjectURL(new Blob([blob], { type: mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentChild?.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-8 space-y-8 animate-fade-in pb-24 md:pb-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Ekspor Laporan Bulanan</h1>
          <p className="text-slate-500 font-medium mt-1">Unduh ringkasan data keuangan Anda per bulan dalam berbagai format dokumen.</p>
        </div>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold animate-slide-up">
            {error}
          </div>
        )}

        {/* Period Selector Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-premium p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pilih Periode</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Tentukan tahun dan bulan data keuangan yang ingin diekspor.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Tahun</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="input appearance-none bg-no-repeat"
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2364748B' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'></path></svg>")`,
                  backgroundPosition: 'right 1rem center',
                  backgroundSize: '1rem'
                }}
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Bulan</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="input appearance-none bg-no-repeat"
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='%2364748B' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5'></path></svg>")`,
                  backgroundPosition: 'right 1rem center',
                  backgroundSize: '1rem'
                }}
              >
                {months.map((month, index) => (
                  <option key={index + 1} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary Card Section */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : summary ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-premium p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Ringkasan Laporan - {months[selectedMonth - 1]} {selectedYear}
              </h2>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Statistik kilas balik performa keuangan Anda bulan ini.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Income */}
              <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 flex flex-col justify-between">
                <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Total Pemasukan</span>
                <p className="text-lg font-extrabold text-emerald-600 mt-2 truncate">
                  {formatCurrency(summary.total_income, 'IDR')}
                </p>
              </div>

              {/* Total Expense */}
              <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-100 flex flex-col justify-between">
                <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Total Pengeluaran</span>
                <p className="text-lg font-extrabold text-rose-600 mt-2 truncate">
                  {formatCurrency(summary.total_expense, 'IDR')}
                </p>
              </div>

              {/* Net */}
              <div className={`rounded-2xl p-4 border flex flex-col justify-between ${
                summary.net >= 0 
                  ? 'bg-indigo-50/50 border-indigo-100' 
                  : 'bg-amber-50/50 border-amber-100'
              }`}>
                <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Arus Kas Bersih (Net)</span>
                <p className={`text-lg font-extrabold mt-2 truncate ${
                  summary.net >= 0 ? 'text-indigo-600' : 'text-amber-600'
                }`}>
                  {formatCurrency(summary.net, 'IDR')}
                </p>
              </div>

              {/* Transaction Count */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-between">
                <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">Jumlah Transaksi</span>
                <p className="text-lg font-extrabold text-slate-800 mt-2">
                  {summary.transaction_count} kali
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Export Formats Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-premium p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Format Unduhan</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Pilih salah satu format dokumen di bawah ini untuk memulai unduhan.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* PDF Export */}
            <button
              onClick={() => handleExport('pdf')}
              className="inline-flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white text-sm font-bold shadow-md shadow-rose-500/10 hover:shadow-lg hover:shadow-rose-500/20 hover:from-rose-700 hover:to-rose-600 transition-all duration-300 active:scale-95"
            >
              <FileText className="w-5 h-5" />
              <span>Ekspor PDF</span>
              <Download className="w-4 h-4" />
            </button>

            {/* CSV Export */}
            <button
              onClick={() => handleExport('csv')}
              className="inline-flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-bold shadow-md shadow-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/20 hover:from-emerald-700 hover:to-emerald-600 transition-all duration-300 active:scale-95"
            >
              <FileText className="w-5 h-5" />
              <span>Ekspor CSV (Excel)</span>
              <Download className="w-4 h-4" />
            </button>

            {/* JSON Export */}
            <button
              onClick={() => handleExport('json')}
              className="inline-flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-sm font-bold shadow-md shadow-indigo-500/10 hover:shadow-lg hover:shadow-indigo-500/20 hover:from-indigo-700 hover:to-indigo-600 transition-all duration-300 active:scale-95"
            >
              <FileText className="w-5 h-5" />
              <span>Ekspor JSON (Raw)</span>
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info Callout */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Informasi Format Dokumen</p>
          <div className="text-xs text-indigo-600/90 font-medium space-y-1.5">
            <p>• <strong>PDF:</strong> Laporan rapi terformat, siap dicetak atau dikirimkan ke pihak eksternal.</p>
            <p>• <strong>CSV:</strong> Data tabular mentah, cocok dibuka di Microsoft Excel atau Google Sheets.</p>
            <p>• <strong>JSON:</strong> Data berstruktur pemrograman, biasanya digunakan untuk diintegrasikan dengan aplikasi lain.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
