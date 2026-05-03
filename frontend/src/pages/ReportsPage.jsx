import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileSpreadsheet, FileText, Sparkles, CircleDot, Download, Upload, RotateCcw } from 'lucide-react';
import { useData } from '../hooks/useData';
import { backupAPI, creditAPI, debtAPI } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import LoadingSpinner from '../components/LoadingSpinner';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const EXPENSE_GROUP_DEFINITIONS = [
  {
    name: 'Hunian',
    color: '#3B82F6',
    keywords: ['rent', 'sewa', 'listrik', 'air', 'internet', 'wifi', 'pln', 'house', 'home', 'property', 'furniture'],
  },
  {
    name: 'Makanan & Minuman',
    color: '#10B981',
    keywords: ['groceries', 'grocery', 'makan', 'food', 'meal', 'snack', 'coffee', 'tea', 'resto', 'restaurant', 'dining', 'minum'],
  },
  {
    name: 'Transportasi & Otomotif',
    color: '#F59E0B',
    keywords: ['fuel', 'bensin', 'transport', 'vehicle', 'car', 'motor', 'service', 'tol', 'parkir', 'otomotif'],
  },
  {
    name: 'Kesehatan',
    color: '#EF4444',
    keywords: ['medicine', 'obat', 'health', 'medical', 'doctor', 'clinic', 'hospital', 'bpjs'],
  },
  {
    name: 'Lifestyle',
    color: '#8B5CF6',
    keywords: ['entertainment', 'hiburan', 'shopping', 'fashion', 'lifestyle', 'hobi', 'course', 'kursus', 'gym', 'travel'],
  },
  {
    name: 'Keuangan',
    color: '#EC4899',
    keywords: ['hutang', 'debt', 'piutang', 'loan', 'donation', 'donasi', 'cicil', 'angsur', 'payment'],
  },
];

const getExpenseGroupMeta = (categoryName) => {
  const normalized = String(categoryName || '').toLowerCase();
  const matched = EXPENSE_GROUP_DEFINITIONS.find((group) =>
    group.keywords.some((keyword) => normalized.includes(keyword))
  );

  return matched || { name: 'Lainnya', color: '#6B7280' };
};

export default function ReportsPage() {
  const { transactions, categories, accounts, loading, loadInitialData } = useData();
  const [credits, setCredits] = useState([]);
  const [debts, setDebts] = useState([]);
  const [pdfExportMode, setPdfExportMode] = useState('full');
  const [selectedExpenseMonth, setSelectedExpenseMonth] = useState('all');
  const [isExpenseMonthInitialized, setIsExpenseMonthInitialized] = useState(false);
  const [cycleStartDay, setCycleStartDay] = useState(1);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [plannedSpendAmount, setPlannedSpendAmount] = useState(800000);
  const [spendOnlyWhenSurplus, setSpendOnlyWhenSurplus] = useState(true);
  const importFileRef = useRef(null);

  // Helper: Identifikasi apakah kategori termasuk "Living Expense"
  const LIVING_EXPENSE_KEYWORDS = [
    'makan', 'food', 'groceries', 'bensin', 'fuel', 'parkir',
    'transport', 'listrik', 'air', 'internet', 'rent', 'sewa',
    'obat', 'medicine', 'gym', 'kursus', 'course', 'shopping', 'fashion',
  ];

  const isLivingExpense = (categoryName) => {
    const normalized = String(categoryName || '').toLowerCase();
    return LIVING_EXPENSE_KEYWORDS.some((kw) => normalized.includes(kw));
  };

  // Kategori pendanaan (piutang/hutang) tidak dianggap expense operasional
  const FINANCING_EXPENSE_KEYWORDS = ['piutang', 'hutang', 'debt', 'loan'];
  const isFinancingExpenseCategory = (categoryName) => {
    const normalized = String(categoryName || '').toLowerCase();
    return FINANCING_EXPENSE_KEYWORDS.some((kw) => normalized.includes(kw));
  };

  const isOperationalIncomeTransaction = (transaction) => (
    String(transaction?.type || '').toLowerCase() === 'income'
    && !isFinancingExpenseCategory(transaction?.category?.name)
  );

  const isOperationalExpenseTransaction = (transaction) => (
    String(transaction?.type || '').toLowerCase() === 'expense'
    && !isFinancingExpenseCategory(transaction?.category?.name)
  );

  // Helper: Tentukan siklus periode mana transaksi ini masuk berdasarkan cycleStartDay
  const getTransactionCycleKey = (date, startDay) => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;

    const day = d.getDate();
    let month = d.getMonth();
    let year = d.getFullYear();

    if (day < startDay) {
      month -= 1;
      if (month < 0) {
        month = 11;
        year -= 1;
      }
    }

    return `${year}-${String(month + 1).padStart(2, '0')}`;
  };

  // Helper: Filter transaksi berdasarkan periode terpilih
  const getTransactionsByPeriod = (txns, startDay, period) => {
    if (period === 'all') return txns;
    return txns.filter((t) => {
      const cycleKey = getTransactionCycleKey(t.date || t.created_at, startDay);
      return cycleKey === period;
    });
  };

  // Helper: Generate daftar periode tersedia
  const generatePeriodOptions = (txns, startDay) => {
    const periodMap = new Map();

    txns.forEach((t) => {
      const cycleKey = getTransactionCycleKey(t.date || t.created_at, startDay);
      if (!cycleKey) return;

      if (!periodMap.has(cycleKey)) {
        const [year, month] = cycleKey.split('-');
        const label = new Date(year, parseInt(month) - 1).toLocaleDateString('id-ID', {
          month: 'long',
          year: 'numeric',
        });
        periodMap.set(cycleKey, { key: cycleKey, label });
      }
    });

    return Array.from(periodMap.values()).sort((a, b) => b.key.localeCompare(a.key));
  };

  useEffect(() => {
    const loadDebtCreditData = async () => {
      const [creditsRes, debtsRes] = await Promise.allSettled([creditAPI.list(), debtAPI.list()]);

      if (creditsRes.status === 'fulfilled') {
        setCredits(creditsRes.value?.data || []);
      }

      if (debtsRes.status === 'fulfilled') {
        setDebts(debtsRes.value?.data || []);
      }
    };

    loadDebtCreditData();
  }, []);

  // Prepare expense data by category
  const expenseByCategory = useMemo(() => {
    const data = {};
    transactions
      .filter((t) => t.type === 'expense' && !isFinancingExpenseCategory(t.category?.name))
      .forEach((t) => {
        const categoryName = t.category?.name || 'Other';
        data[categoryName] = (data[categoryName] || 0) + parseFloat(t.amount || 0);
      });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const groupedExpenseByCategory = useMemo(() => {
    const groupedMap = {};

    expenseByCategory.forEach((item) => {
      const groupMeta = getExpenseGroupMeta(item.name);
      if (!groupedMap[groupMeta.name]) {
        groupedMap[groupMeta.name] = {
          name: groupMeta.name,
          value: 0,
          color: groupMeta.color,
          subcategories: [],
        };
      }

      groupedMap[groupMeta.name].value += item.value;
      groupedMap[groupMeta.name].subcategories.push({
        name: item.name,
        value: item.value,
      });
    });

    return Object.values(groupedMap)
      .map((group) => ({
        ...group,
        subcategories: group.subcategories.sort((a, b) => b.value - a.value),
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenseByCategory]);

  const expenseMonthOptions = useMemo(() => {
    const monthMap = new Map();

    transactions
      .filter((t) => t.type === 'expense' && !isFinancingExpenseCategory(t.category?.name))
      .forEach((t) => {
        const d = new Date(t.date || t.created_at);
        if (Number.isNaN(d.getTime())) return;

        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap.has(key)) {
          monthMap.set(key, {
            key,
            label: d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
          });
        }
      });

    return Array.from(monthMap.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [transactions]);

  useEffect(() => {
    if (expenseMonthOptions.length === 0) {
      if (selectedExpenseMonth !== 'all') {
        setSelectedExpenseMonth('all');
      }
      return;
    }

    if (!isExpenseMonthInitialized) {
      if (selectedExpenseMonth === 'all') {
        setSelectedExpenseMonth(expenseMonthOptions[0].key);
      }
      setIsExpenseMonthInitialized(true);
      return;
    }

    if (selectedExpenseMonth === 'all') return;

    const stillExists = expenseMonthOptions.some((m) => m.key === selectedExpenseMonth);
    if (!stillExists) {
      setSelectedExpenseMonth(expenseMonthOptions[0].key);
    }
  }, [expenseMonthOptions, selectedExpenseMonth, isExpenseMonthInitialized]);

  const filteredExpenseTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.type !== 'expense') return false;
      if (isFinancingExpenseCategory(t.category?.name)) return false;
      if (selectedExpenseMonth === 'all') return true;

      const d = new Date(t.date || t.created_at);
      if (Number.isNaN(d.getTime())) return false;
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return monthKey === selectedExpenseMonth;
    });
  }, [transactions, selectedExpenseMonth]);

  const expenseByCategoryByMonth = useMemo(() => {
    const data = {};

    filteredExpenseTransactions.forEach((t) => {
      const categoryName = t.category?.name || 'Other';
      data[categoryName] = (data[categoryName] || 0) + parseFloat(t.amount || 0);
    });

    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenseTransactions]);

  const groupedExpenseByCategoryByMonth = useMemo(() => {
    const groupedMap = {};

    expenseByCategoryByMonth.forEach((item) => {
      const groupMeta = getExpenseGroupMeta(item.name);
      if (!groupedMap[groupMeta.name]) {
        groupedMap[groupMeta.name] = {
          name: groupMeta.name,
          value: 0,
          color: groupMeta.color,
          subcategories: [],
        };
      }

      groupedMap[groupMeta.name].value += item.value;
      groupedMap[groupMeta.name].subcategories.push({
        name: item.name,
        value: item.value,
      });
    });

    return Object.values(groupedMap)
      .map((group) => ({
        ...group,
        subcategories: group.subcategories.sort((a, b) => b.value - a.value),
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenseByCategoryByMonth]);

  const selectedExpenseTotal = useMemo(
    () => filteredExpenseTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),
    [filteredExpenseTransactions]
  );

  const periodOptions = useMemo(
    () => generatePeriodOptions(transactions, cycleStartDay),
    [transactions, cycleStartDay]
  );

  useEffect(() => {
    if (periodOptions.length === 0) {
      if (selectedPeriod !== 'all') {
        setSelectedPeriod('all');
      }
      return;
    }

    if (selectedPeriod === 'all') return;

    const stillExists = periodOptions.some((p) => p.key === selectedPeriod);
    if (!stillExists) {
      setSelectedPeriod('all');
    }
  }, [periodOptions, selectedPeriod]);

  const selectedPeriodLabel = useMemo(() => {
    if (selectedPeriod === 'all') return 'Semua Periode';
    return periodOptions.find((p) => p.key === selectedPeriod)?.label || 'Periode Dipilih';
  }, [periodOptions, selectedPeriod]);

  // Prepare income vs expense data by month
  const monthlyData = useMemo(() => {
    const data = {};
    transactions.forEach((t) => {
      const date = new Date(t.created_at);
      const month = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      if (!data[month]) {
        data[month] = { month, income: 0, expense: 0 };
      }

      if (t.type === 'income' && !isFinancingExpenseCategory(t.category?.name)) {
        data[month].income += parseFloat(t.amount || 0);
      } else if (t.type === 'expense' && !isFinancingExpenseCategory(t.category?.name)) {
        data[month].expense += parseFloat(t.amount || 0);
      }
    });
    return Object.values(data).slice(-6);
  }, [transactions]);

  // Prepare account balance data
  const accountData = useMemo(() => {
    return accounts.map((account) => ({
      name: account.name,
      balance: parseFloat(account.balance || 0),
    }));
  }, [accounts]);

  // Summary statistics
  const totalIncome = useMemo(
    () => {
      const periodTxns = getTransactionsByPeriod(transactions, cycleStartDay, selectedPeriod);
      return periodTxns
        .filter((t) => t.type === 'income' && !isFinancingExpenseCategory(t.category?.name))
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    },
    [transactions, cycleStartDay, selectedPeriod]
  );

  const totalExpense = useMemo(
    () => {
      const periodTxns = getTransactionsByPeriod(transactions, cycleStartDay, selectedPeriod);
      return periodTxns
        .filter((t) => t.type === 'expense' && !isFinancingExpenseCategory(t.category?.name))
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    },
    [transactions, cycleStartDay, selectedPeriod]
  );

  const livingExpenseOnly = useMemo(
    () => {
      const periodTxns = getTransactionsByPeriod(transactions, cycleStartDay, selectedPeriod);
      return periodTxns
        .filter((t) => t.type === 'expense' && isLivingExpense(t.category?.name) && !isFinancingExpenseCategory(t.category?.name))
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    },
    [transactions, cycleStartDay, selectedPeriod]
  );

  const loanExpenseOnly = useMemo(
    () => {
      const periodTxns = getTransactionsByPeriod(transactions, cycleStartDay, selectedPeriod);
      return periodTxns
        .filter((t) => t.type === 'expense' && !isLivingExpense(t.category?.name) && !isFinancingExpenseCategory(t.category?.name))
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    },
    [transactions, cycleStartDay, selectedPeriod]
  );

  const netBalance = totalIncome - totalExpense;
  const overallNetBalance = useMemo(() => {
    const overallIncome = transactions
      .filter((t) => t.type === 'income' && !isFinancingExpenseCategory(t.category?.name))
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const overallExpense = transactions
      .filter((t) => t.type === 'expense' && !isFinancingExpenseCategory(t.category?.name))
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    return overallIncome - overallExpense;
  }, [transactions]);
  const savingsRate = totalIncome > 0 ? (Math.max(netBalance, 0) / totalIncome) * 100 : 0;
  const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
  const livingExpenseRatio = totalIncome > 0 ? (livingExpenseOnly / totalIncome) * 100 : 0;
  const averageExpense = expenseByCategoryByMonth.length > 0
    ? totalExpense / expenseByCategoryByMonth.length
    : 0;

  // Safe-to-Spend Calculation
  const computeSafeToSpend = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let nextCycleDate = new Date(currentYear, currentMonth, cycleStartDay);

    if (now.getDate() >= cycleStartDay) {
      nextCycleDate = new Date(currentYear, currentMonth + 1, cycleStartDay);
    }

    const remainingMs = Math.max(0, nextCycleDate - now);
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

    let avgDailyLivingExp = 0;
    if (remainingDays > 0 && livingExpenseOnly > 0) {
      const periodTxns = getTransactionsByPeriod(transactions, cycleStartDay, selectedPeriod);
      const periodExpenses = periodTxns
        .filter((t) => isOperationalExpenseTransaction(t) && isLivingExpense(t.category?.name));

      if (periodExpenses.length > 0) {
        const totalDaysInPeriod = 30;
        avgDailyLivingExp = livingExpenseOnly / totalDaysInPeriod;
      }
    }

    const currentBalance = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
    const projectedExpense = Math.max(0, avgDailyLivingExp * remainingDays);
    const safeAmount = Math.max(0, currentBalance - projectedExpense);

    return {
      currentBalance,
      avgDailyLivingExp: Math.round(avgDailyLivingExp),
      remainingDays,
      projectedExpense: Math.round(projectedExpense),
      safeToSpend: Math.round(safeAmount),
    };
  }, [accounts, livingExpenseOnly, transactions, cycleStartDay, selectedPeriod]);

  const remainingSafeBudgetAfterPlannedSpend = computeSafeToSpend.safeToSpend - plannedSpendAmount;
  const isSurplusSelectedPeriod = netBalance > 0;
  const isSurplusOverall = overallNetBalance > 0;
  const canSpendByRule = spendOnlyWhenSurplus ? isSurplusOverall : true;

  const recentTransactions = useMemo(
    () => {
      // Get current month transactions
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      return [...transactions]
        .filter(t => {
          const transDate = new Date(t.date || t.created_at);
          return transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear;
        })
        .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
    },
    [transactions]
  );

  const topExpenseCategory = expenseByCategory.length > 0 ? expenseByCategory[0] : null;

  const exportExcel = () => {
    const workbook = XLSX.utils.book_new();

    const summaryRows = [
      { Metric: 'Total Income', Value: totalIncome },
      { Metric: 'Total Expense', Value: totalExpense },
      { Metric: 'Net Balance', Value: totalIncome - totalExpense },
      { Metric: 'Total Accounts', Value: accounts.length },
      { Metric: 'Total Transactions', Value: transactions.length },
      { Metric: 'Generated At', Value: new Date().toLocaleString() },
    ];

    const monthlyRows = monthlyData.map((m) => ({
      Month: m.month,
      Income: m.income,
      Expense: m.expense,
      Net: m.income - m.expense,
    }));

    const expenseRows = expenseByCategory.map((e) => ({
      Category: e.name,
      Amount: e.value,
      Percentage: totalExpense > 0 ? Number(((e.value / totalExpense) * 100).toFixed(2)) : 0,
    }));

    const accountRows = accounts.map((a) => ({
      Account: a.name,
      Type: a.account_type,
      Balance: Number(a.balance || 0),
      Currency: a.currency || 'IDR',
    }));

    const transactionRows = recentTransactions.map((t) => ({
      Date: t.date || t.created_at || '',
      Type: t.type,
      Category: t.category?.name || '-',
      Account: t.account?.name || '-',
      Amount: Number(t.amount || 0),
      Description: t.description || '-',
      Note: t.note || '-',
    }));

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(monthlyRows), 'Monthly');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(expenseRows), 'Expenses');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(accountRows), 'Accounts');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(transactionRows), 'Transactions');

    const fileDate = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `uangan-report-${fileDate}.xlsx`);
  };

  const exportSimpleGeneralLedgerPDF = () => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const now = new Date();
    const pageWidth = doc.internal.pageSize.getWidth();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const ledgerTransactions = [...transactions]
      .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at))
      .filter((t) => {
        const d = new Date(t.date || t.created_at);
        if (Number.isNaN(d.getTime())) return false;
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    const totalIncomeLedger = ledgerTransactions
      .filter((t) => t.type === 'income' && !isFinancingExpenseCategory(t.category?.name))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalExpenseLedger = ledgerTransactions
      .filter((t) => t.type === 'expense' && !isFinancingExpenseCategory(t.category?.name))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const rows = ledgerTransactions.map((t) => [
      t.date || t.created_at
        ? new Date(t.date || t.created_at).toLocaleDateString('id-ID')
        : '-',
      String(t.type || '').toUpperCase() || '-',
      t.category?.name || '-',
      t.account?.name || '-',
      formatCurrency(Number(t.amount || 0), 'IDR'),
      t.description || t.note || '-',
    ]);

    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('GENERAL LEDGER', 14, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generated: ${now.toLocaleString('id-ID')}`, 14, 19);
    doc.text(`Rows: ${rows.length}`, 14, 24);

    doc.setTextColor(31, 41, 55);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, 34, 58, 18, 1.5, 1.5, 'F');
    doc.roundedRect(76, 34, 58, 18, 1.5, 1.5, 'F');
    doc.roundedRect(138, 34, 58, 18, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Total Income', 18, 40);
    doc.text('Total Expense', 80, 40);
    doc.text('Net Balance', 142, 40);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(formatCurrency(totalIncomeLedger, 'IDR'), 18, 47);
    doc.text(formatCurrency(totalExpenseLedger, 'IDR'), 80, 47);
    doc.text(formatCurrency(totalIncomeLedger - totalExpenseLedger, 'IDR'), 142, 47);

    autoTable(doc, {
      startY: 58,
      head: [['Tanggal', 'Jenis', 'Kategori', 'Akun', 'Nominal', 'Keterangan']],
      body: rows.length > 0
        ? rows
        : [['-', '-', '-', '-', '-', 'Tidak ada data transaksi']],
      margin: { left: 14, right: 14 },
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
        textColor: [33, 33, 33],
        lineColor: [90, 90, 90],
        lineWidth: 0.1,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [32, 32, 32],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 34 },
        3: { cellWidth: 28 },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 40 },
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          doc.setFillColor(20, 20, 20);
          doc.rect(0, 0, pageWidth, 14, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text('GENERAL LEDGER', 14, 9);
        }

        doc.setTextColor(120, 120, 120);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`Page ${data.pageNumber}`, pageWidth - 14, 288, { align: 'right' });
      },
    });

    doc.save(`general-ledger-simple-${now.toISOString().slice(0, 10)}.pdf`);
  };

  const exportCliGeneralLedgerPDF = () => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const now = new Date();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const marginLeft = 10;
    const marginRight = 10;
    const lineHeight = 3.8;
    const pageBottomY = pageHeight - 10;

    const nowJakarta = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const currentMonth = nowJakarta.getMonth() + 1;
    const currentYear = nowJakarta.getFullYear();

    const extractDateParts = (value) => {
      if (!value) return null;
      const raw = String(value);
      const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        return {
          year: Number(isoMatch[1]),
          month: Number(isoMatch[2]),
          day: Number(isoMatch[3]),
        };
      }

      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) return null;
      return {
        year: parsed.getFullYear(),
        month: parsed.getMonth() + 1,
        day: parsed.getDate(),
      };
    };

    const ledgerTransactions = [...transactions]
      .filter((t) => {
        const parts = extractDateParts(t.date || t.created_at);
        if (!parts) return false;
        return parts.year === currentYear && parts.month === currentMonth;
      })
      .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));

    const totalIncome = ledgerTransactions
      .filter((t) => isOperationalIncomeTransaction(t))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalExpense = ledgerTransactions
      .filter((t) => isOperationalExpenseTransaction(t))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const periodStart = ledgerTransactions[ledgerTransactions.length - 1]?.date
      || ledgerTransactions[ledgerTransactions.length - 1]?.created_at;
    const periodEnd = ledgerTransactions[0]?.date || ledgerTransactions[0]?.created_at;

    const parseTxnDate = (value) => {
      if (!value) return null;
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const currentMonthExpenseTransactions = ledgerTransactions.filter((t) => isOperationalExpenseTransaction(t));

    const totalExpenseCurrentMonth = currentMonthExpenseTransactions
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const topExpenseCategories = Object.entries(
      currentMonthExpenseTransactions.reduce((acc, t) => {
        const key = t.category?.name || 'Tanpa Kategori';
        acc[key] = (acc[key] || 0) + Number(t.amount || 0);
        return acc;
      }, {})
    )
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const topAccounts = Object.entries(
      ledgerTransactions.reduce((acc, t) => {
        const key = t.account?.name || 'Tanpa Akun';
        if (!acc[key]) acc[key] = { count: 0, amount: 0 };
        acc[key].count += 1;
        acc[key].amount += Number(t.amount || 0);
        return acc;
      }, {})
    )
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const validDates = ledgerTransactions
      .map((t) => parseTxnDate(t.date || t.created_at))
      .filter(Boolean);

    const minDate = validDates.length > 0 ? new Date(Math.min(...validDates.map((d) => d.getTime()))) : null;
    const maxDate = validDates.length > 0 ? new Date(Math.max(...validDates.map((d) => d.getTime()))) : null;
    const periodDays = minDate && maxDate
      ? Math.max(1, Math.floor((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1)
      : 1;

    const avgDailyExpense = totalExpense / periodDays;
    const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : null;

    const largestExpenseTxn = ledgerTransactions
      .filter((t) => isOperationalExpenseTransaction(t))
      .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0];

    const largestIncomeTxn = ledgerTransactions
      .filter((t) => isOperationalIncomeTransaction(t))
      .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0];

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const recent7Transactions = ledgerTransactions.filter((t) => {
      const d = parseTxnDate(t.date || t.created_at);
      return d && d >= sevenDaysAgo && d <= now;
    });

    const recent7Income = recent7Transactions
      .filter((t) => isOperationalIncomeTransaction(t))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const recent7Expense = recent7Transactions
      .filter((t) => isOperationalExpenseTransaction(t))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const getAccountKey = (item) => {
      if (item?.account?.id !== undefined && item?.account?.id !== null) {
        return `id:${item.account.id}`;
      }
      if (item?.account?.name) {
        return `name:${item.account.name}`;
      }
      return 'unknown';
    };

    const closingBalancesByAccount = accounts.reduce((acc, account) => {
      const key = account?.id !== undefined && account?.id !== null
        ? `id:${account.id}`
        : `name:${account?.name || 'Tanpa Akun'}`;
      acc[key] = Number(account?.balance || 0);
      return acc;
    }, {});

    const netMovementByAccount = ledgerTransactions.reduce((acc, txn) => {
      const key = getAccountKey(txn);
      const amount = Number(txn.amount || 0);
      const isIncome = String(txn.type || '').toLowerCase() === 'income';
      const movement = isIncome ? amount : -amount;
      acc[key] = (acc[key] || 0) + movement;
      return acc;
    }, {});

    const accountKeysForLedger = new Set([
      ...Object.keys(closingBalancesByAccount),
      ...Object.keys(netMovementByAccount),
    ]);

    const openingBalancesByAccount = {};
    accountKeysForLedger.forEach((key) => {
      const closing = Number(closingBalancesByAccount[key] || 0);
      const net = Number(netMovementByAccount[key] || 0);
      openingBalancesByAccount[key] = closing - net;
    });

    const closingBalance = Object.values(closingBalancesByAccount)
      .reduce((sum, value) => sum + Number(value || 0), 0);
    const netMovement = totalIncome - totalExpense;
    const openingBalance = Object.values(openingBalancesByAccount)
      .reduce((sum, value) => sum + Number(value || 0), 0);

    const statementRef = `STMT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    const colDefs = [
      { title: 'No', width: 3, align: 'right' },
      { title: 'Tanggal', width: 10 },
      { title: 'Jam', width: 5 },
      { title: 'Ref', width: 10 },
      { title: 'Akun', width: 10 },
      { title: 'Deskripsi', width: 18 },
      { title: 'Debit', width: 12, align: 'right' },
      { title: 'Kredit', width: 12, align: 'right' },
      { title: 'Saldo', width: 13, align: 'right' },
    ];

    const padCell = (value, width, alignRight = false) => {
      const safe = String(value ?? '');
      return alignRight ? safe.padStart(width, ' ') : safe.padEnd(width, ' ');
    };

    const wrapCell = (value, width) => {
      const clean = String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (!clean) return [''];

      const words = clean.split(' ');
      const lines = [];
      let current = '';

      words.forEach((word) => {
        if (word.length > width) {
          if (current) {
            lines.push(current);
            current = '';
          }
          for (let i = 0; i < word.length; i += width) {
            lines.push(word.slice(i, i + width));
          }
          return;
        }

        if (!current) {
          current = word;
          return;
        }

        if ((current.length + 1 + word.length) <= width) {
          current += ` ${word}`;
        } else {
          lines.push(current);
          current = word;
        }
      });

      if (current) lines.push(current);
      return lines.length > 0 ? lines : [''];
    };

    const formatDateCLI = (dateValue) => {
      if (!dateValue) return '-';
      const d = new Date(dateValue);
      if (Number.isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).replace(/\./g, '/');
    };

    const formatTimeCLI = (dateValue) => {
      if (!dateValue) return '--:--';
      const d = new Date(dateValue);
      if (Number.isNaN(d.getTime())) return '--:--';
      return d.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).replace('.', ':');
    };

    const buildRowLines = (cells) => {
      const wrappedCells = cells.map((cell, idx) => wrapCell(cell, colDefs[idx].width));
      const maxHeight = Math.max(...wrappedCells.map((lines) => lines.length));
      const lines = [];

      for (let rowLine = 0; rowLine < maxHeight; rowLine += 1) {
        const line = colDefs
          .map((col, idx) => padCell(wrappedCells[idx][rowLine] || '', col.width, col.align === 'right'))
          .join(' | ');
        lines.push(line);
      }

      return lines;
    };

    const headerLine = colDefs.map((c) => padCell(c.title, c.width)).join(' | ');
    const headerRule = '='.repeat(headerLine.length);
    const rowRule = '-'.repeat(headerLine.length);

    const buildTxnRef = (txn, idx) => {
      const baseDate = parseTxnDate(txn.date || txn.created_at) || now;
      const y = String(baseDate.getFullYear()).slice(-2);
      const m = String(baseDate.getMonth() + 1).padStart(2, '0');
      const d = String(baseDate.getDate()).padStart(2, '0');
      const rawId = String(txn.id || idx + 1).replace(/\D+/g, '');
      const suffix = rawId ? rawId.slice(-4).padStart(4, '0') : String(idx + 1).padStart(4, '0');
      return `TX${y}${m}${d}${suffix}`;
    };

    const getTxnSortDate = (txn) => {
      const txnDate = parseTxnDate(txn.date);
      if (txnDate) return txnDate;
      const createdAt = parseTxnDate(txn.created_at);
      if (createdAt) return createdAt;
      return new Date(0);
    };

    const orderedLedgerTransactions = [...ledgerTransactions].sort((a, b) => {
      const timeDiff = getTxnSortDate(a).getTime() - getTxnSortDate(b).getTime();
      if (timeDiff !== 0) return timeDiff;

      const aId = Number(a.id || 0);
      const bId = Number(b.id || 0);
      if (!Number.isNaN(aId) && !Number.isNaN(bId) && aId !== bId) {
        return aId - bId;
      }

      return String(a.description || a.note || '').localeCompare(String(b.description || b.note || ''));
    });

    const runningBalancesByAccount = { ...openingBalancesByAccount };
    const tableRowBlocks = [];
    if (orderedLedgerTransactions.length === 0) {
      tableRowBlocks.push(buildRowLines(['', '', '', '', '', 'Tidak ada data transaksi.', '', '', formatCurrency(openingBalance, 'IDR')]));
    } else {
      orderedLedgerTransactions.forEach((t, idx) => {
        const accountKey = getAccountKey(t);
        const amount = Number(t.amount || 0);
        const isIncome = String(t.type || '').toLowerCase() === 'income';
        const debitValue = isIncome ? amount : 0;
        const creditValue = isIncome ? 0 : amount;
        if (runningBalancesByAccount[accountKey] === undefined) {
          runningBalancesByAccount[accountKey] = 0;
        }
        runningBalancesByAccount[accountKey] += debitValue - creditValue;

        tableRowBlocks.push(
          buildRowLines([
            String(idx + 1),
            formatDateCLI(t.created_at || t.date),
            formatTimeCLI(t.created_at || t.date),
            buildTxnRef(t, idx),
            t.account?.name || '-',
            t.description || t.note || t.category?.name || '-',
            debitValue > 0 ? formatCurrency(debitValue, 'IDR') : '-',
            creditValue > 0 ? formatCurrency(creditValue, 'IDR') : '-',
            formatCurrency(runningBalancesByAccount[accountKey], 'IDR'),
          ])
        );
      });
    }

    let y = 10;
    let currentPage = 1;

    const ensurePageSpace = (lineCount = 1) => {
      if (y + (lineCount * lineHeight) > pageBottomY) {
        doc.addPage();
        currentPage += 1;
        y = 10;
        writeHeader(true);
      }
    };

    const writeLine = (line, fontStyle = 'normal') => {
      ensurePageSpace(1);

      doc.setFont('courier', fontStyle);
      doc.text(line, marginLeft, y);
      y += lineHeight;
    };

    const formatDateForMeta = (dateValue) => {
      if (!dateValue) return '-';
      const d = new Date(dateValue);
      if (Number.isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
    };

    const writeHeader = (isContinued = false) => {
      writeLine('UANGAN CLI STATEMENT  ::  GENERAL LEDGER', 'bold');
      writeLine(`Statement Ref : ${statementRef}${isContinued ? '  (continued)' : ''}`);
      writeLine(`Scope         : Bulan ini (${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })})`);
      writeLine(`Generated     : ${now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB  |  Rows: ${ledgerTransactions.length}`);
      writeLine(`Period        : ${formatDateForMeta(periodStart)} -> ${formatDateForMeta(periodEnd)}`);
      writeLine('');
    };

    const writeSectionTitle = (title) => {
      writeLine(`[ ${title} ]`, 'bold');
      writeLine('-'.repeat(Math.max(24, title.length + 4)));
    };

    const writeSummary = () => {
      writeSectionTitle('SUMMARY');
      writeLine(`Total Income   : ${formatCurrency(totalIncome, 'IDR')}`);
      writeLine(`Total Expense  : ${formatCurrency(totalExpense, 'IDR')}`);
      writeLine(`Net Balance    : ${formatCurrency(totalIncome - totalExpense, 'IDR')}`);
      writeLine(`Avg Txn Value  : ${formatCurrency(ledgerTransactions.length > 0 ? (totalIncome + totalExpense) / ledgerTransactions.length : 0, 'IDR')}`);
      writeLine('');
    };

    const writeStatementSummary = () => {
      writeSectionTitle('STATEMENT TOTALS');
      writeLine(`Opening Balance: ${formatCurrency(openingBalance, 'IDR')}`);
      writeLine(`Total Debit    : ${formatCurrency(totalIncome, 'IDR')}`);
      writeLine(`Total Credit   : ${formatCurrency(totalExpense, 'IDR')}`);
      writeLine(`Closing Balance: ${formatCurrency(closingBalance, 'IDR')}`);
      writeLine('');
    };

    const writeHealthCheck = () => {
      writeSectionTitle('HEALTH CHECK');

      const ratioText = expenseRatio === null ? 'N/A' : `${expenseRatio.toFixed(1)}%`;
      const ratioStatus = expenseRatio === null
        ? ''
        : expenseRatio <= 70
          ? ' (healthy)'
          : expenseRatio <= 100
            ? ' (watch)'
            : ' (overspend)';

      writeLine(`Expense Ratio  : ${ratioText}${ratioStatus}`);
      writeLine(`Avg Daily Exp  : ${formatCurrency(avgDailyExpense, 'IDR')}  (${periodDays} days period)`);

      if (largestExpenseTxn) {
        writeLine(`Largest Exp    : ${formatCurrency(Number(largestExpenseTxn.amount || 0), 'IDR')} | ${largestExpenseTxn.category?.name || 'Tanpa Kategori'} | ${formatDateCLI(largestExpenseTxn.date || largestExpenseTxn.created_at)}`);
      } else {
        writeLine('Largest Exp    : -');
      }

      if (largestIncomeTxn) {
        writeLine(`Largest Income : ${formatCurrency(Number(largestIncomeTxn.amount || 0), 'IDR')} | ${largestIncomeTxn.category?.name || 'Tanpa Kategori'} | ${formatDateCLI(largestIncomeTxn.date || largestIncomeTxn.created_at)}`);
      } else {
        writeLine('Largest Income : -');
      }

      writeLine(`Last 7 Days    : +${formatCurrency(recent7Income, 'IDR')} / -${formatCurrency(recent7Expense, 'IDR')}  (${recent7Transactions.length} txn)`);
      writeLine('');
    };

    const writeTopCategoryTable = () => {
      writeSectionTitle('TOP EXPENSE CATEGORIES (BULAN INI)');
      const catHeader = `${padCell('No', 3, true)} | ${padCell('Kategori', 28)} | ${padCell('Nominal', 16, true)} | ${padCell('Share', 8, true)}`;
      writeLine(catHeader);
      writeLine('-'.repeat(catHeader.length));

      if (topExpenseCategories.length === 0) {
        writeLine('  Tidak ada data pengeluaran kategori bulan ini.');
      } else {
        topExpenseCategories.forEach((item, idx) => {
          const share = totalExpenseCurrentMonth > 0 ? `${((item.amount / totalExpenseCurrentMonth) * 100).toFixed(1)}%` : '0.0%';
          writeLine(`${padCell(String(idx + 1), 3, true)} | ${padCell(item.name, 28)} | ${padCell(formatCurrency(item.amount, 'IDR'), 16, true)} | ${padCell(share, 8, true)}`);
        });
      }

      writeLine('');
    };

    const writeTopAccountTable = () => {
      writeSectionTitle('ACCOUNT ACTIVITY');
      const accHeader = `${padCell('No', 3, true)} | ${padCell('Akun', 26)} | ${padCell('Txn', 6, true)} | ${padCell('Volume', 16, true)}`;
      writeLine(accHeader);
      writeLine('-'.repeat(accHeader.length));

      if (topAccounts.length === 0) {
        writeLine('  Tidak ada aktivitas akun.');
      } else {
        topAccounts.forEach((item, idx) => {
          writeLine(`${padCell(String(idx + 1), 3, true)} | ${padCell(item.name, 26)} | ${padCell(String(item.count), 6, true)} | ${padCell(formatCurrency(item.amount, 'IDR'), 16, true)}`);
        });
      }

      writeLine('');
    };

    const writeLedgerTableHeader = () => {
      writeSectionTitle('GENERAL LEDGER');
      writeLine(headerLine);
      writeLine(headerRule);
    };

    doc.setTextColor(0, 0, 0);
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    writeHeader(false);
    writeStatementSummary();
    writeSummary();
    writeHealthCheck();
    writeTopCategoryTable();
    writeTopAccountTable();
    writeLedgerTableHeader();

    tableRowBlocks.forEach((rowLines, rowIdx) => {
      const hasSeparator = rowIdx < tableRowBlocks.length - 1;
      const requiredLines = rowLines.length + 1;

      if (y + (requiredLines * lineHeight) > pageBottomY) {
        doc.addPage();
        currentPage += 1;
        y = 10;
        doc.setTextColor(0, 0, 0);
        doc.setFont('courier', 'normal');
        doc.setFontSize(7.5);
        writeHeader(true);
        writeLedgerTableHeader();
      }

      rowLines.forEach((line) => {
        writeLine(line);
      });

      if (hasSeparator) {
        writeLine(rowRule);
      } else {
        writeLine('');
      }
    });

    writeLine('');
    writeSectionTitle('LEGAL');
    writeLine('This statement is system-generated for personal finance tracking.');
    writeLine('Please verify all entries against source transaction records.');
    writeLine('END OF LEDGER OUTPUT');

    const totalPages = doc.getNumberOfPages();
    if (totalPages > 1) {
      for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        doc.setFont('courier', 'normal');
        doc.setFontSize(8);
        doc.text(`PAGE ${page}/${totalPages}`, pageWidth - marginRight, pageHeight - 4, { align: 'right' });
      }
    }

    const stamp = now.toISOString().replace(/[-:]/g, '').slice(0, 15);
    doc.save(`general-ledger-cli-monthly-${stamp}.pdf`);
  };

  const exportPDF = () => {
    if (pdfExportMode === 'cli') {
      exportCliGeneralLedgerPDF();
      return;
    }

    try {

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const now = new Date();
    const pageWidth = doc.internal.pageSize.getWidth();

    // ============ HELPER FUNCTIONS FOR DECISION-FOCUSED REPORT ============

    // Total debts
    const totalHutang = debts.reduce((sum, d) => sum + (Number(d.remaining_amount || Math.max(d.total_amount - d.paid_amount, 0))), 0);
    const totalPiutang = credits.reduce((sum, c) => sum + (Number(c.remaining_amount || Math.max(c.total_amount - c.received_amount, 0))), 0);

    const safeToSpend = Number(computeSafeToSpend?.safeToSpend || 0);

    // Calculate affordability score (0-100)
    const calculateAffordabilityScore = () => {
      const surplusScore = isSurplusOverall ? 40 : 20;
      const savingsRateScore = Math.min((savingsRate / 30) * 30, 30); // Max 30 points
      const debtsScore = accounts.length > 0 ? (totalHutang + totalPiutang > 0 ? 10 : 20) : 0;
      const bufferScore = safeToSpend > 0 ? 10 : 0;
      return Math.min(100, Math.round(surplusScore + savingsRateScore + debtsScore + bufferScore));
    };

    // Get affordability status
    const affordabilityScore = calculateAffordabilityScore();
    const getAffordabilityStatus = () => {
      if (affordabilityScore >= 70) return { status: 'AMAN MEMBELI', color: [34, 197, 94], severity: 'GOOD' };
      if (affordabilityScore >= 50) return { status: 'PERTIMBANGKAN MATANG-MATANG', color: [251, 146, 60], severity: 'CAUTION' };
      return { status: 'HARUS FOKUS SAVING', color: [239, 68, 68], severity: 'CRITICAL' };
    };

    const affordabilityStatus = getAffordabilityStatus();

    // Calculate spending capacity
    const getSpendingCapacity = () => {
      if (!isSurplusOverall) return 0;
      return Math.max(0, safeToSpend - (safeToSpend * 0.2)); // Reserve 20% buffer
    };

    const spendingCapacity = getSpendingCapacity();

    // ============ PAGE 1: AFFORDABILITY ASSESSMENT ============
    doc.setFillColor(...affordabilityStatus.color);
    doc.rect(0, 0, pageWidth, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(affordabilityStatus.status, 14, 18);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Laporan Keputusan Finansial | Dibuat: ${now.toLocaleString('id-ID')}`, 14, 28);
    doc.text(`Analisa: ${isSurplusOverall ? 'Surplus' : 'Deficit'} | Skor Affordability: ${affordabilityScore}/100`, 14, 35);

    // ============ AFFORDABILITY SCORE BOX ============
    doc.setTextColor(31, 41, 55);
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(14, 52, 180, 25, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SKOR AFFORDABILITY', 18, 60);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Skor: ${affordabilityScore}/100`, 18, 69);
    doc.text(`Status Keuangan: ${isSurplusOverall ? 'Positif (Ada Surplus)' : 'Negatif (Ada Deficit)'}`, 95, 69);
    doc.text(`Savings Rate: ${savingsRate.toFixed(1)}%`, 18, 77);
    doc.text(`Recommended Action: ${affordabilityScore >= 70 ? 'Bisa membeli' : affordabilityScore >= 50 ? 'Pertimbang matang' : 'Fokus saving'}`, 95, 77);

    // ============ KEY METRICS ============
    doc.setTextColor(31, 41, 55);
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(14, 80, 180, 22, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('RINGKASAN KEUANGAN ANDA', 18, 88);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const currentBalance = accounts.reduce((sum, a) => sum + (Number(a.balance || 0)), 0);
    doc.text(`Saldo Saat Ini: ${formatCurrency(currentBalance, 'IDR')}`, 18, 96);
    doc.text(`Aman untuk Belanja: ${formatCurrency(spendingCapacity, 'IDR')}`, 110, 96);
    doc.text(`Sisa Buffer (Safety): ${formatCurrency(Math.max(0, safeToSpend - spendingCapacity), 'IDR')}`, 18, 103);

    // ============ DECISION BOX (Main Focus) ============
    doc.setFillColor(...affordabilityStatus.color);
    doc.roundedRect(14, 105, 180, 30, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('KEPUTUSAN PEMBELIAN', 18, 117);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (affordabilityScore >= 70) {
      doc.text('Anda AMAN untuk melakukan pembelian dalam jumlah wajar.', 18, 127);
      doc.text(`  Kapasitas belanja tersedia: ${formatCurrency(spendingCapacity, 'IDR')}`, 18, 134);
    } else if (affordabilityScore >= 50) {
      doc.text('Pertimbangkan pembelian dengan MATANG. Surplus Anda terbatas.', 18, 127);
      doc.text(`  Rekomendasi: Batasi pembelian hingga ${formatCurrency(spendingCapacity * 0.5, 'IDR')}`, 18, 134);
    } else {
      doc.text('Sebaiknya FOKUS SAVING dulu. Anda belum siap untuk pembelian besar.', 18, 127);
      doc.text(`  Targetkan surplus minimal: ${formatCurrency(Math.abs(overallNetBalance) * 0.1, 'IDR')}`, 18, 134);
    }

    // ============ HEALTH METRICS GRID ============
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Metrik Kesehatan Keuangan', 14, 142);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setFillColor(243, 244, 246);
    
    // Box 1: Net Balance
    doc.roundedRect(14, 148, 42, 18, 1, 1, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text('Net Balance', 16, 153);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(overallNetBalance >= 0 ? 34 : 220, overallNetBalance >= 0 ? 197 : 38, overallNetBalance >= 0 ? 94 : 38);
    doc.text(formatCurrency(overallNetBalance, 'IDR'), 16, 161);

    // Box 2: Living Expense (Monthly)
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(60, 148, 42, 18, 1, 1, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text('Living Expense', 62, 153);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(220, 38, 38);
    doc.text(formatCurrency(livingExpenseOnly, 'IDR'), 62, 161);

    // Box 3: Savings Rate
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(106, 148, 42, 18, 1, 1, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text('Savings Rate', 108, 153);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(34, 197, 94);
    doc.text(`${savingsRate.toFixed(1)}%`, 108, 161);

    // Box 4: Remaining Debt
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(152, 148, 42, 18, 1, 1, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text('Sisa Hutang', 154, 153);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(220, 38, 38);
    doc.text(formatCurrency(totalHutang, 'IDR'), 154, 161);

    // ============ PAGE 2: FINANCIAL SNAPSHOT & TREND ============
    doc.addPage();
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Financial Overview - 6 Bulan Terakhir', 14, 9);

    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Tabel 1 - Ringkasan Bulanan (Income vs Expense vs Net)', 14, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Tren 6 bulan untuk melihat pola pengeluaran dan pemasukan Anda', 14, 31);
    doc.setTextColor(31, 41, 55);

    autoTable(doc, {
      startY: 36,
      head: [['Bulan', 'Pemasukan', 'Pengeluaran', 'Net', 'Status']],
      body: (monthlyData.length > 0 ? monthlyData : [{ month: '-', income: 0, expense: 0 }]).map((m) => {
        const net = (m.income || 0) - (m.expense || 0);
        return [
          m.month,
          formatCurrency(m.income, 'IDR'),
          formatCurrency(m.expense, 'IDR'),
          formatCurrency(net, 'IDR'),
          net >= 0 ? 'Surplus' : 'Deficit',
        ];
      }),
      styles: { fontSize: 9, cellPadding: 2.5, textColor: [31, 41, 55] },
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 14, right: 14 },
      theme: 'grid',
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'center' },
      },
    });

    const table1FinalY = doc.lastAutoTable?.finalY || 50;

    // Expense breakdown
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Tabel 2 - Pengeluaran: Living vs Loan Expenses', 14, table1FinalY + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Pisahkan pengeluaran untuk kebutuhan pokok vs tanggungan pinjaman', 14, table1FinalY + 15);
    doc.setTextColor(31, 41, 55);

    const expenseBreakdownData = [
      ['Living Expenses (Kebutuhan)', formatCurrency(livingExpenseOnly, 'IDR'), `${totalExpense > 0 ? ((livingExpenseOnly / totalExpense) * 100).toFixed(1) : 0}%`],
      ['Loan Expenses (Cicilan)', formatCurrency(loanExpenseOnly, 'IDR'), `${totalExpense > 0 ? ((loanExpenseOnly / totalExpense) * 100).toFixed(1) : 0}%`],
      ['TOTAL PENGELUARAN', formatCurrency(totalExpense, 'IDR'), '100%'],
    ];

    autoTable(doc, {
      startY: table1FinalY + 18,
      head: [['Jenis Pengeluaran', 'Nominal', 'Porsi']],
      body: expenseBreakdownData,
      styles: { fontSize: 9, cellPadding: 2.5, textColor: [31, 41, 55] },
      headStyles: { fillColor: [16, 185, 129] },
      margin: { left: 14, right: 14 },
      theme: 'grid',
      didDrawCell: (data) => {
        if (data.row.index === 2) { // Total row
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [243, 244, 246];
        }
      },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
      },
    });

    const table2FinalY = doc.lastAutoTable?.finalY || table1FinalY + 40;

    // Key insights
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Insight Penting', 14, table2FinalY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const livingPercent = totalExpense > 0 ? ((livingExpenseOnly / totalExpense) * 100).toFixed(1) : 0;
    const insights = [
      `• Living Expense Ratio: ${livingPercent}% dari total pengeluaran`,
      `• Rata-rata Net Monthly: ${formatCurrency(monthlyData.length > 0 ? monthlyData.reduce((sum, m) => sum + ((m.income || 0) - (m.expense || 0)), 0) / monthlyData.length : 0, 'IDR')}`,
      `• Trend: ${monthlyData.length > 1 && monthlyData[monthlyData.length - 1].income > monthlyData[0].income ? 'Pemasukan meningkat' : 'Pemasukan menurun'}`,
    ];

    insights.forEach((line, idx) => {
      doc.text(line, 16, table2FinalY + 17 + idx * 5);
    });

    // ============ PAGE 3: SPENDING SIMULATION & RISK ASSESSMENT ============
    doc.addPage();
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Simulasi Pembelian & Risk Assessment', 14, 9);

    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Simulasi: Jika Saya Membeli Barang Seharga X', 14, 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    // Simulate different purchase amounts
    const simulationAmounts = [
      { label: 'Rp 500.000', amount: 500000 },
      { label: 'Rp 1.000.000', amount: 1000000 },
      { label: 'Rp 2.000.000', amount: 2000000 },
      { label: 'Rp 5.000.000', amount: 5000000 },
    ];

    const safeBuffer = Math.max(0, safeToSpend - spendingCapacity);

    const simulationData = simulationAmounts.map((sim) => {
      const remainingAfter = currentBalance - sim.amount;
      const bufferAfter = remainingAfter - livingExpenseOnly;
      const riskLevel = bufferAfter < 0 ? 'BERISIKO' : bufferAfter < safeBuffer * 0.5 ? 'HATI-HATI' : 'AMAN';

      return [sim.label, formatCurrency(remainingAfter, 'IDR'), formatCurrency(bufferAfter, 'IDR'), riskLevel];
    });

    autoTable(doc, {
      startY: 36,
      head: [['Pembelian', 'Saldo Setelah', 'Buffer Setelah', 'Risk Level']],
      body: simulationData,
      styles: { fontSize: 9, cellPadding: 2.5, textColor: [31, 41, 55] },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14, right: 14 },
      theme: 'grid',
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'center' },
      },
    });

    const simTableFinalY = doc.lastAutoTable?.finalY || 60;

    // Current capacity
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Kapasitas Belanja Anda Saat Ini', 14, simTableFinalY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(14, simTableFinalY + 16, 180, 11, 1, 1, 'F');
    doc.setTextColor(31, 41, 55);
    doc.text(`Safe-to-Spend Amount: ${formatCurrency(safeToSpend, 'IDR')}`, 18, simTableFinalY + 21);

    doc.setFillColor(243, 244, 246);
    doc.roundedRect(14, simTableFinalY + 29, 180, 11, 1, 1, 'F');
    doc.text(`Recommended Spending Capacity: ${formatCurrency(spendingCapacity, 'IDR')} (dengan 20% buffer)`, 18, simTableFinalY + 34);

    doc.setFillColor(243, 244, 246);
    doc.roundedRect(14, simTableFinalY + 42, 180, 11, 1, 1, 'F');
    doc.text(`Safety Buffer: ${formatCurrency(safeBuffer, 'IDR')}`, 18, simTableFinalY + 47);

    // Risk indicators
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Interpretasi Risk Level', 14, simTableFinalY + 60);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(34, 197, 94);
    doc.text('AMAN: Buffer masih cukup untuk living expense bulanan', 18, simTableFinalY + 68);
    doc.setTextColor(251, 146, 60);
    doc.text('HATI-HATI: Buffer mulai berkurang, pertimbang lagi', 18, simTableFinalY + 74);
    doc.setTextColor(239, 68, 68);
    doc.text('BERISIKO: Buffer terlalu kecil, tidak disarankan membeli', 18, simTableFinalY + 80);

    // ============ PAGE 4: EXPENSE ANALYSIS & AWARENESS ============
    doc.addPage();
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, pageWidth, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Analisis Pengeluaran - Kategori Terbesar', 14, 9);

    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Top 10 Kategori Pengeluaran Anda', 14, 28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Fokus pada kategori ini untuk peluang penghematan', 14, 33);
    doc.setTextColor(31, 41, 55);

    autoTable(doc, {
      startY: 38,
      head: [['Kategori', 'Nominal', 'Porsi', 'Status']],
      body: expenseByCategory.slice(0, 10).map((item) => {
        const percentage = totalExpense > 0 ? (item.value / totalExpense) * 100 : 0;
        const status = percentage > 15 ? 'Tinggi' : percentage > 10 ? 'Perlu Monitor' : 'Normal';
        return [
          item.name,
          formatCurrency(item.value, 'IDR'),
          `${percentage.toFixed(1)}%`,
          status,
        ];
      }),
      styles: { fontSize: 9, cellPadding: 2.5, textColor: [31, 41, 55] },
      headStyles: { fillColor: [16, 185, 129] },
      margin: { left: 14, right: 14 },
      theme: 'grid',
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'center' },
        3: { halign: 'center' },
      },
    });

    const expenseTableFinalY = doc.lastAutoTable?.finalY || 80;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Peluang Penghematan', 14, expenseTableFinalY + 10);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Identify top 3 categories for savings opportunities
    const topExpenseCategories = expenseByCategory.slice(0, 3);
    const savingsOpportunities = topExpenseCategories.map((cat, idx) => {
      const potentialSaving = Math.round(cat.value * 0.1); // 10% reduction potential
      return `${idx + 1}. ${cat.name}: Hemat ${formatCurrency(potentialSaving, 'IDR')} (10% dari ${formatCurrency(cat.value, 'IDR')})`;
    });

    savingsOpportunities.forEach((opportunity, idx) => {
      doc.text(opportunity, 18, expenseTableFinalY + 20 + idx * 6);
    });

    // Summary of total potential savings
    const totalPotentialSavings = topExpenseCategories.reduce((sum, cat) => sum + Math.round(cat.value * 0.1), 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(14, expenseTableFinalY + 42, 180, 12, 1, 1, 'F');
    doc.setTextColor(22, 163, 74);
    doc.text(`Total Potensi Penghematan (dari top 3 kategori): ${formatCurrency(totalPotentialSavings, 'IDR')}`, 18, expenseTableFinalY + 49);

    // ============ PAGE 5: ACTION PLAN & NEXT STEPS ============
    doc.addPage();
    doc.setFillColor(249, 115, 22);
    doc.rect(0, 0, pageWidth, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Rencana Aksi & Rekomendasi Berikutnya', 14, 9);

    doc.setTextColor(31, 41, 55);
    
    // Main recommendation based on affordability score
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Rekomendasi Utama', 14, 26);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(14, 32, 180, 38, 2, 2, 'F');
    
    doc.setTextColor(31, 41, 55);
    let recommendationY = 40;
    
    if (affordabilityScore >= 70) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text('AMAN MEMBELI DALAM JUMLAH WAJAR', 18, recommendationY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(9);
      doc.text(`Kapasitas belanja Anda: ${formatCurrency(spendingCapacity, 'IDR')}`, 18, recommendationY + 8);
      doc.text('Pastikan pembelian tidak melebihi kapasitas ini untuk menjaga safety buffer', 18, recommendationY + 14);
      doc.text(`Sisa buffer yang aman: ${formatCurrency(safeBuffer, 'IDR')}`, 18, recommendationY + 20);
      doc.text('Prioritaskan kebutuhan dibanding keinginan', 18, recommendationY + 26);
    } else if (affordabilityScore >= 50) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(251, 146, 60);
      doc.text('PERTIMBANGAN MATANG SEBELUM MEMBELI', 18, recommendationY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(9);
      doc.text(`Rekomendasi: batasi pembelian hingga ${formatCurrency(spendingCapacity * 0.5, 'IDR')}`, 18, recommendationY + 8);
      doc.text('Diskusikan kebutuhan vs keinginan secara detail', 18, recommendationY + 14);
      doc.text('Tunda pembelian non-essential setidaknya 1 minggu', 18, recommendationY + 20);
      doc.text(`Target peningkatan surplus: ${formatCurrency(Math.abs(overallNetBalance) * 0.15, 'IDR')} per bulan`, 18, recommendationY + 26);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(239, 68, 68);
      doc.text('FOKUS SAVING - TUNDA PEMBELIAN BESAR', 18, recommendationY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(9);
      doc.text(`Deficit saat ini: ${formatCurrency(Math.abs(overallNetBalance), 'IDR')}`, 18, recommendationY + 8);
      doc.text('Prioritaskan kurangi pengeluaran sebelum membeli barang baru', 18, recommendationY + 14);
      doc.text(`Target surplus sebelum membeli: minimum ${formatCurrency(Math.abs(overallNetBalance) * 0.2, 'IDR')}`, 18, recommendationY + 20);
      doc.text('Fokus pada kategori pengeluaran terbesar untuk penghematan', 18, recommendationY + 26);
    }

    // Action items
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55);
    doc.text('Daftar Tindakan Berikutnya', 14, 78);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const actionItems = [];
    
    // Action 1: Savings opportunity
    if (totalPotentialSavings > 0) {
      actionItems.push(`1. Implementasi penghematan pada top 3 kategori: ${formatCurrency(totalPotentialSavings, 'IDR')} per bulan`);
    }
    
    // Action 2: Debt management
    if (totalHutang > 0) {
      actionItems.push(`2. Prioritaskan pembayaran hutang: ${formatCurrency(totalHutang, 'IDR')} sisa`);
    }
    
    // Action 3: Emergency fund
    if (safeToSpend < livingExpenseOnly * 3) {
      actionItems.push(`3. Kembangkan emergency fund hingga 3x living expense`);
    }
    
    // Action 4: Living expense optimization
    if (livingPercent > 50) {
      actionItems.push(`4. Analisis living expense (${livingPercent}%) untuk potensi efisiensi`);
    }
    
    // Action 5: Review schedule
    actionItems.push(`5. Review laporan keuangan setiap akhir bulan untuk tracking progress`);
    
    if (actionItems.length === 0) {
      actionItems.push('Kondisi keuangan stabil - lanjutkan monitoring rutin');
    }

    actionItems.slice(0, 5).forEach((action, idx) => {
      doc.text(action, 18, 88 + idx * 7);
    });

    // Key metrics summary at bottom
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Ringkasan Metrik Kunci', 14, 130);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(14, 136, 180, 70, 1, 1, 'F');

    const metrics = [
      [`Skor Affordability:`, `${affordabilityScore}/100`, affordabilityStatus.severity === 'GOOD' ? [34, 197, 94] : affordabilityStatus.severity === 'CAUTION' ? [251, 146, 60] : [239, 68, 68]],
      [`Status Keuangan:`, isSurplusOverall ? 'Surplus' : 'Deficit', isSurplusOverall ? [34, 197, 94] : [239, 68, 68]],
      [`Saldo Tersedia:`, formatCurrency(currentBalance, 'IDR'), [37, 99, 235]],
      [`Aman untuk Belanja:`, formatCurrency(spendingCapacity, 'IDR'), [34, 197, 94]],
      [`Savings Rate:`, `${savingsRate.toFixed(1)}%`, savingsRate >= 20 ? [34, 197, 94] : savingsRate >= 10 ? [251, 146, 60] : [239, 68, 68]],
      [`Sisa Hutang:`, formatCurrency(totalHutang, 'IDR'), [239, 68, 68]],
    ];

    let metricsY = 143;
    metrics.forEach((metric, idx) => {
      doc.setTextColor(...metric[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(metric[0], 18, metricsY + idx * 10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(metric[1], 100, metricsY + idx * 10);
    });

    // Footer
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Laporan Keputusan Finansial | Dibuat: ${now.toLocaleString('id-ID')} | Semua angka berdasarkan data real-time`,
      14,
      270
    );

    doc.save(`uangan-affordability-report-${now.toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('Full PDF export failed:', error);
      alert(`Gagal export PDF Full: ${error?.message || 'Unknown error'}`);
    }
  };

  const exportBackupJson = async () => {
    try {
      const response = await backupAPI.export();
      const payload = response?.data;
      if (!payload) {
        alert('Gagal export backup: payload kosong');
        return;
      }

      const content = JSON.stringify(payload, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      anchor.href = url;
      anchor.download = `uangan-backup-${stamp}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Gagal export backup: ${error?.message || 'Unknown error'}`);
    }
  };

  const onPickImportBackup = () => {
    if (importFileRef.current) {
      importFileRef.current.value = '';
      importFileRef.current.click();
    }
  };

  const importBackupJson = async (event) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const text = await file.text();
      const backup = JSON.parse(text);

      const preview = await backupAPI.import(backup, true);
      const p = preview?.data || {};

      const confirmed = window.confirm(
        'Preview Import (Dry Run):\n' +
        `Accounts: +${p?.accounts?.created || 0}, update ${p?.accounts?.updated || 0}\n` +
        `Categories: +${p?.categories?.created || 0}, update ${p?.categories?.updated || 0}\n` +
        `Transactions: +${p?.transactions?.created || 0}, update ${p?.transactions?.updated || 0}\n` +
        `Debts: +${p?.debts?.created || 0}, Credits: +${p?.credits?.created || 0}\n\n` +
        'Lanjutkan import merge beneran?'
      );
      if (!confirmed) return;

      const response = await backupAPI.import(backup);
      const summary = response?.data || {};
      await loadInitialData();
      await Promise.allSettled([creditAPI.list(), debtAPI.list()]).then(([creditsRes, debtsRes]) => {
        if (creditsRes.status === 'fulfilled') setCredits(creditsRes.value?.data || []);
        if (debtsRes.status === 'fulfilled') setDebts(debtsRes.value?.data || []);
      });

      alert(
        'Import merge selesai.\n' +
        `Accounts +${summary?.accounts?.created || 0}, update ${summary?.accounts?.updated || 0}\n` +
        `Transactions +${summary?.transactions?.created || 0}, update ${summary?.transactions?.updated || 0}\n` +
        `Credits +${summary?.credits?.created || 0}, Debts +${summary?.debts?.created || 0}`
      );
    } catch (error) {
      alert(`Gagal import backup: ${error?.message || 'Format JSON tidak valid'}`);
    }
  };

  const rollbackLastImport = async () => {
    try {
      const confirmed = window.confirm('Rollback akan mengembalikan data ke kondisi sebelum import terakhir. Lanjutkan?');
      if (!confirmed) return;

      await backupAPI.rollback();
      await loadInitialData();
      await Promise.allSettled([creditAPI.list(), debtAPI.list()]).then(([creditsRes, debtsRes]) => {
        if (creditsRes.status === 'fulfilled') setCredits(creditsRes.value?.data || []);
        if (debtsRes.status === 'fulfilled') setDebts(debtsRes.value?.data || []);
      });

      alert('Rollback import terakhir berhasil.');
    } catch (error) {
      alert(`Rollback gagal: ${error?.message || 'Unknown error'}`);
    }
  };

  const pdfModeMeta = pdfExportMode === 'cli'
      ? {
          title: 'CLI-Style',
          description: 'General Ledger hitam putih gaya terminal tanpa border, dengan insight audit ringkas.',
        }
      : {
          title: 'Full Report',
          description: 'Laporan lengkap multi halaman dengan visual analitik.',
        };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="pb-24 md:pb-0">
      <div className="relative overflow-hidden bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 text-white p-6 md:rounded-b-2xl">
        <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-36 w-36 rounded-full bg-cyan-300/20 blur-2xl" />

        <div className="relative flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-50">
              <Sparkles size={14} />
              Smart Export Center
            </p>
            <h1 className="mt-3 text-2xl md:text-3xl font-bold">Reports & Analytics</h1>
            <p className="mt-2 text-sm text-blue-100">Lihat ringkasan dulu, lalu eksplor detail atau export laporan.</p>
          </div>

          <div className="w-full xl:w-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur px-4 py-4 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Mode PDF</p>
            <div className="mt-2 inline-flex w-full rounded-xl bg-white/15 p-1">
              <button
                type="button"
                onClick={() => setPdfExportMode('full')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  pdfExportMode === 'full'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-blue-100 hover:text-white'
                }`}
              >
                Full
              </button>
              <button
                type="button"
                onClick={() => setPdfExportMode('cli')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  pdfExportMode === 'cli'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-blue-100 hover:text-white'
                }`}
              >
                CLI-Style
              </button>
            </div>

            <p className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-blue-50">
              <CircleDot size={14} />
              Mode aktif: <span className="font-semibold">{pdfModeMeta.title}</span>
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={exportExcel}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-blue-700 px-4 py-2.5 text-sm font-semibold hover:bg-blue-50 transition"
              >
                <FileSpreadsheet size={18} />
                Export Excel
              </button>
              <button
                type="button"
                onClick={exportPDF}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 transition"
              >
                <FileText size={18} />
                Export PDF
              </button>
            </div>

            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={exportBackupJson}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700 transition"
              >
                <Download size={18} />
                Export Backup JSON
              </button>
              <button
                type="button"
                onClick={onPickImportBackup}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 text-white px-4 py-2.5 text-sm font-semibold hover:bg-amber-600 transition"
              >
                <Upload size={18} />
                Import + Merge JSON
              </button>
              <input
                ref={importFileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={importBackupJson}
              />
            </div>

            <div className="mt-2">
              <button
                type="button"
                onClick={rollbackLastImport}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-rose-700 transition"
              >
                <RotateCcw size={18} />
                Rollback Import Terakhir
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        <div className="flex justify-end">
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <label className="text-xs font-semibold text-gray-600">Periode:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">Semua Periode</option>
              {periodOptions.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards - Paling Atas */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="card-lg text-center">
            <p className="text-gray-600 text-sm mb-2">Total Income ({selectedPeriodLabel})</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalIncome, 'IDR')}
            </p>
          </div>
          <div className="card-lg text-center">
            <p className="text-gray-600 text-sm mb-2">Total Expense ({selectedPeriodLabel})</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpense, 'IDR')}
            </p>
          </div>
          <div className="card-lg text-center">
            <p className="text-gray-600 text-sm mb-2">Net ({selectedPeriodLabel})</p>
            <p className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalIncome - totalExpense, 'IDR')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-lg">
            <p className="text-sm text-gray-500 mb-1">Savings Rate</p>
            <p className={`text-2xl font-bold ${savingsRate >= 20 ? 'text-green-600' : 'text-amber-600'}`}>
              {savingsRate.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Target ideal: minimal 20% dari income.</p>
          </div>

          <div className="card-lg">
            <p className="text-sm text-gray-500 mb-1">Expense Ratio</p>
            <p className={`text-2xl font-bold ${livingExpenseRatio <= 80 ? 'text-green-600' : 'text-red-600'}`}>
              {livingExpenseRatio.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Hanya biaya hidup rutin / total income (Piutang Diberikan dikeluarkan).</p>
            <p className="text-xs text-gray-500 mt-1">
              Living: {formatCurrency(livingExpenseOnly, 'IDR')} | Non-rutin: {formatCurrency(loanExpenseOnly, 'IDR')}
            </p>
          </div>

          <div className="card-lg">
            <p className="text-sm text-gray-500 mb-1">Rata-rata per Kategori</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(averageExpense, 'IDR')}
            </p>
            <p className="text-xs text-gray-500 mt-1">Rata-rata nominal pengeluaran per kategori pada periode terpilih.</p>
          </div>
        </div>

        <div className="card-lg border border-emerald-200 bg-emerald-50/50">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Safe-to-Spend</h3>
          <p className="text-xs text-gray-600 mb-3">Simulasi nominal spend sampai awal siklus berikutnya.</p>
          <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Mau spend berapa?</label>
              <input
                type="number"
                min={0}
                value={plannedSpendAmount}
                onChange={(e) => setPlannedSpendAmount(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <label className="mt-6 inline-flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={spendOnlyWhenSurplus}
                onChange={(e) => setSpendOnlyWhenSurplus(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              Hanya saat kondisi keseluruhan surplus
            </label>
          </div>
          <div className="space-y-1 text-sm text-gray-700">
            <p>Saldo saat ini: <span className="font-semibold">{formatCurrency(computeSafeToSpend.currentBalance, 'IDR')}</span></p>
            <p>Sisa hari siklus: <span className="font-semibold">{computeSafeToSpend.remainingDays} hari</span></p>
            <p>Avg Daily Exp: <span className="font-semibold">{formatCurrency(computeSafeToSpend.avgDailyLivingExp, 'IDR')}</span></p>
            <p>Safe to Spend: <span className="font-semibold">{formatCurrency(computeSafeToSpend.safeToSpend, 'IDR')}</span></p>
            <p>Status periode aktif: <span className={`font-semibold ${isSurplusSelectedPeriod ? 'text-green-700' : 'text-red-700'}`}>{isSurplusSelectedPeriod ? 'Surplus' : 'Defisit'}</span></p>
            <p>Status keseluruhan: <span className={`font-semibold ${isSurplusOverall ? 'text-green-700' : 'text-red-700'}`}>{isSurplusOverall ? 'Surplus' : 'Defisit'}</span></p>
          </div>
          <p className={`mt-3 text-sm font-semibold ${(remainingSafeBudgetAfterPlannedSpend >= 0 && canSpendByRule) ? 'text-green-700' : 'text-red-700'}`}>
            Jika spend {formatCurrency(plannedSpendAmount, 'IDR')}, sisa ruang aman: {formatCurrency(Math.abs(remainingSafeBudgetAfterPlannedSpend), 'IDR')} {remainingSafeBudgetAfterPlannedSpend >= 0 ? '(tersisa)' : '(defisit)'}.
          </p>
          {!canSpendByRule && (
            <p className="mt-1 text-xs text-red-700">Rule aktif: spend ditunda karena kondisi seluruh periode masih defisit.</p>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Income vs Expense */}
          {monthlyData.length > 0 && (
            <div className="card-lg">
              <h3 className="font-semibold text-gray-900 mb-4">Income vs Expense</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="month" tick={{ fill: '#999', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#999', fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value, 'IDR')}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Income"
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="Expense"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Account Balances */}
          {accountData.length > 0 && (
            <div className="card-lg">
              <h3 className="font-semibold text-gray-900 mb-4">Account Balances</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={accountData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" tick={{ fill: '#999', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#999', fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value, 'IDR')}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                  />
                  <Bar dataKey="balance" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Expense by Category */}
          {expenseMonthOptions.length > 0 && (
            <div className="card-lg md:col-span-2">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Expense by Category (Grouped)</h3>
                  <p className="text-sm text-gray-500">Kategori kecil dikelompokkan ke grup utama agar analisis lebih rapi.</p>
                </div>
                <div className="w-full md:w-72">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Filter Bulan</label>
                  <select
                    value={selectedExpenseMonth}
                    onChange={(e) => setSelectedExpenseMonth(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">Semua Bulan</option>
                    {expenseMonthOptions.map((month) => (
                      <option key={month.key} value={month.key}>{month.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {groupedExpenseByCategoryByMonth.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={groupedExpenseByCategoryByMonth}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, value }) => `${name}: ${selectedExpenseTotal > 0 ? ((value / selectedExpenseTotal) * 100).toFixed(0) : 0}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {groupedExpenseByCategoryByMonth.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value, 'IDR')} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="space-y-2">
                    {groupedExpenseByCategoryByMonth.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 pr-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.color || COLORS[idx % COLORS.length] }}
                            />
                            <span className="text-sm font-medium text-gray-900">{item.name}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Subkategori: {item.subcategories.slice(0, 3).map((sub) => sub.name).join(', ')}
                            {item.subcategories.length > 3 ? ` +${item.subcategories.length - 3} lainnya` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(item.value, 'IDR')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {selectedExpenseTotal > 0 ? ((item.value / selectedExpenseTotal) * 100).toFixed(1) : '0.0'}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
                  Tidak ada data pengeluaran untuk bulan yang dipilih.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
