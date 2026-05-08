import React, { useState, useEffect } from 'react';
import { Download, FileText, BarChart3 } from 'lucide-react';
import { api } from '../services/api';
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
      const response = await api.get('/api/export/summary', {
        params: { year, month }
      });
      if (response.data.success) {
        setSummary(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch summary');
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
      const response = await api.get('/api/export/monthly', {
        params: {
          year: selectedYear,
          month: selectedMonth,
          format: format
        },
        responseType: format === 'json' ? 'json' : 'blob'
      });

      if (format === 'json') {
        // Download JSON file
        const dataStr = JSON.stringify(response.data, null, 2);
        downloadFile(dataStr, `financial_report_${selectedYear}_${selectedMonth}.json`, 'application/json');
      } else if (format === 'csv') {
        // CSV dihandle sebagai blob
        downloadBlob(response.data, `financial_report_${selectedYear}_${selectedMonth}.csv`, 'text/csv');
      } else if (format === 'pdf') {
        // PDF dihandle sebagai blob
        downloadBlob(response.data, `financial_report_${selectedYear}_${selectedMonth}.pdf`, 'application/pdf');
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to export as ${format.toUpperCase()}`);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-8 h-8 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-800">Monthly Report Export</h1>
          </div>
          <p className="text-gray-600">Export your financial data by month in multiple formats</p>
        </div>

        {/* Month & Year Selector */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Period</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Year Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {months.map((month, index) => (
                  <option key={index + 1} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        ) : summary ? (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Summary - {months[selectedMonth - 1]} {selectedYear}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Income */}
              <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                <p className="text-sm text-gray-600 font-medium">Total Income</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(summary.total_income)}
                </p>
              </div>

              {/* Total Expense */}
              <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
                <p className="text-sm text-gray-600 font-medium">Total Expense</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(summary.total_expense)}
                </p>
              </div>

              {/* Net */}
              <div className={`rounded-lg p-4 border-l-4 ${
                summary.net >= 0 
                  ? 'bg-blue-50 border-blue-500' 
                  : 'bg-orange-50 border-orange-500'
              }`}>
                <p className="text-sm text-gray-600 font-medium">Net Flow</p>
                <p className={`text-2xl font-bold mt-1 ${
                  summary.net >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`}>
                  {formatCurrency(summary.net)}
                </p>
              </div>

              {/* Transaction Count */}
              <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
                <p className="text-sm text-gray-600 font-medium">Transactions</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {summary.transaction_count}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Export Options */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Export Format</h2>
          <p className="text-gray-600 text-sm mb-6">
            Choose your preferred format to download the monthly financial report
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* PDF Export */}
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center justify-center gap-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-4 px-6 rounded-lg transition-all transform hover:scale-105 active:scale-95"
            >
              <FileText className="w-5 h-5" />
              <span>Export as PDF</span>
              <Download className="w-4 h-4 ml-2" />
            </button>

            {/* CSV Export (CLI Style) */}
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center justify-center gap-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-all transform hover:scale-105 active:scale-95"
            >
              <FileText className="w-5 h-5" />
              <span>Export as CSV</span>
              <Download className="w-4 h-4 ml-2" />
            </button>

            {/* JSON Export */}
            <button
              onClick={() => handleExport('json')}
              className="flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-all transform hover:scale-105 active:scale-95"
            >
              <FileText className="w-5 h-5" />
              <span>Export as JSON</span>
              <Download className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            <strong>📝 About the exports:</strong>
            <br />
            • <strong>PDF:</strong> Professional-looking formatted report with charts and summary
            <br />
            • <strong>CSV:</strong> CLI-style plain text format (spreadsheet compatible)
            <br />
            • <strong>JSON:</strong> Raw structured data format for integration
          </p>
        </div>
      </div>
    </div>
  );
}
