import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { formatCurrency } from '../utils/currency';
import type { CurrencyCode } from '../utils/currency';
import {
  Receipt,
  Plus,
  TrendingDown,
  TrendingUp,
  Trash2,
  PieChart as PieIcon,
  X,
  Tag,
  Calendar,
  Repeat,
  CheckCircle2,
  Edit3,
  Clock
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { ServerErrorFallback } from '../components/ServerErrorFallback';
import { ApiError } from '../utils/api';

const CATEGORIES = [
  'Alimentación y Mercados',
  'Transporte y Combustible',
  'Servicios Públicos',
  'Vivienda y Arriendo',
  'Entretenimiento y Ocio',
  'Salud y Medicinas',
  'Educación',
  'Compras y Ropa',
  'Otros Gastos'
];

export const Expenses: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<any[]>([]);
  const [summaryByCategory, setSummaryByCategory] = useState<any[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('COP');
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'fixed'>('history');

  // Modal State para Transacciones normales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('COP');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal State para Gastos Fijos
  const [isFixedModalOpen, setIsFixedModalOpen] = useState(false);
  const [editingFixedId, setEditingFixedId] = useState<string | null>(null);
  const [fixedTitle, setFixedTitle] = useState('');
  const [fixedCategory, setFixedCategory] = useState(CATEGORIES[0]);
  const [fixedAmount, setFixedAmount] = useState('');
  const [fixedCurrency, setFixedCurrency] = useState<CurrencyCode>('COP');
  const [fixedDueDay, setFixedDueDay] = useState('1');
  const [fixedNote, setFixedNote] = useState('');
  const [fixedSaving, setFixedSaving] = useState(false);
  const [payingFixedId, setPayingFixedId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setServerError(false);
      
      const [txRes, catRes, fixedRes] = await Promise.all([
        apiFetch(`/transactions?currency=${selectedCurrency}`),
        apiFetch(`/transactions/summary-by-category?currency=${selectedCurrency}`),
        apiFetch(`/fixed-expenses?currency=${selectedCurrency}`)
      ]);

      setTransactions(txRes.transactions || []);
      setSummaryByCategory(catRes.summaryByCategory || []);
      setFixedExpenses(fixedRes.fixedExpenses || []);
    } catch (err: any) {
      console.error('Error al cargar datos de gastos:', err);
      if (err instanceof ApiError && err.isServerError) {
        setServerError(true);
      } else if (err?.message?.includes('Failed to fetch') || err?.message?.includes('servidor')) {
        setServerError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCurrency]);

  // Manejo de formulario de Transacción Normal
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    setSaving(true);
    try {
      await apiFetch('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type,
          category,
          amount: parseFloat(amount),
          currency,
          date,
          note
        })
      });

      setIsModalOpen(false);
      setAmount('');
      setNote('');
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('¿Deseas eliminar este registro de gasto?')) return;
    try {
      await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Manejo de formulario de Gasto Fijo
  const handleOpenNewFixedModal = () => {
    setEditingFixedId(null);
    setFixedTitle('');
    setFixedCategory(CATEGORIES[0]);
    setFixedAmount('');
    setFixedCurrency(selectedCurrency);
    setFixedDueDay('1');
    setFixedNote('');
    setIsFixedModalOpen(true);
  };

  const handleOpenEditFixedModal = (exp: any) => {
    setEditingFixedId(exp.id);
    setFixedTitle(exp.title);
    setFixedCategory(exp.category);
    setFixedAmount(String(exp.amount));
    setFixedCurrency(exp.currency);
    setFixedDueDay(String(exp.due_day));
    setFixedNote(exp.note || '');
    setIsFixedModalOpen(true);
  };

  const handleSubmitFixedExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixedTitle.trim() || !fixedAmount || parseFloat(fixedAmount) <= 0) return;

    setFixedSaving(true);
    try {
      const payload = {
        title: fixedTitle,
        category: fixedCategory,
        amount: parseFloat(fixedAmount),
        currency: fixedCurrency,
        due_day: parseInt(fixedDueDay, 10),
        note: fixedNote
      };

      if (editingFixedId) {
        await apiFetch(`/fixed-expenses/${editingFixedId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch('/fixed-expenses', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      setIsFixedModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setFixedSaving(false);
    }
  };

  const handleDeleteFixedExpense = async (id: string) => {
    if (!confirm('¿Deseas eliminar este gasto fijo recurrente?')) return;
    try {
      await apiFetch(`/fixed-expenses/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePayFixedExpenseNow = async (id: string) => {
    try {
      setPayingFixedId(id);
      await apiFetch(`/fixed-expenses/${id}/pay`, { method: 'POST' });
      await fetchData();
    } catch (err) {
      console.error('Error al registrar pago de gasto fijo:', err);
    } finally {
      setPayingFixedId(null);
    }
  };

  // Cálculos métricos
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);

  const totalFixedMonthly = fixedExpenses
    .filter(f => f.is_active)
    .reduce((acc, f) => acc + (parseFloat(f.amount) || 0), 0);

  const chartData = summaryByCategory.map(c => ({
    name: c.category.split(' ')[0],
    fullName: c.category,
    amount: parseFloat(c.total_amount)
  }));

  const chartColors = ['#f43f5e', '#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

  if (serverError) {
    return <ServerErrorFallback onRetry={fetchData} />;
  }

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-rose-500" />
            Control de Gastos e Ingresos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gestiona tus movimientos diarios y presupuesto de gastos fijos
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Selector de Monedas */}
          <div className="flex items-center p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl border border-slate-300/50 dark:border-slate-700">
            {(['COP', 'USD', 'EUR'] as CurrencyCode[]).map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCurrency(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedCurrency === c
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <button
            onClick={handleOpenNewFixedModal}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <Repeat className="w-3.5 h-3.5" />
            Nuevo Gasto Fijo
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Movimiento
          </button>
        </div>
      </div>

      {/* Cards de resumen de Gastos (4 columnas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gastos Fijos Mensuales */}
        <div className="glass-card p-4 border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              Gastos Fijos Mensuales
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Repeat className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-indigo-700 dark:text-indigo-300">
            {formatCurrency(totalFixedMonthly, selectedCurrency)}
          </p>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1 inline-block">
            {fixedExpenses.filter(f => f.is_active).length} gastos fijos programados
          </span>
        </div>

        {/* Total Gastos Registrados */}
        <div className="glass-card p-4 border-l-4 border-l-rose-500">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Gastos Registrados
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400">
            {formatCurrency(totalExpenses, selectedCurrency)}
          </p>
          <span className="text-[10px] text-slate-500 mt-1 inline-block">
            {transactions.filter(t => t.type === 'expense').length} transacciones este mes
          </span>
        </div>

        {/* Total Ingresos */}
        <div className="glass-card p-4 border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Ingresos
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalIncome, selectedCurrency)}
          </p>
          <span className="text-[10px] text-slate-500 mt-1 inline-block">
            Ingresos extra o salario
          </span>
        </div>

        {/* Balance Neto */}
        <div className="glass-card p-4 border-l-4 border-l-sky-500">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Balance Neto
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className={`text-xl font-black ${totalIncome - totalExpenses >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600'}`}>
            {formatCurrency(totalIncome - totalExpenses, selectedCurrency)}
          </p>
          <span className="text-[10px] text-slate-500 mt-1 inline-block">
            Ingresos menos Gastos ({selectedCurrency})
          </span>
        </div>
      </div>

      {/* Selector de Pestañas: Transacciones / Gastos Fijos */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          Historial de Transacciones
        </button>

        <button
          onClick={() => setActiveTab('fixed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'fixed'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          Gastos Fijos Recurrentes
          <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] px-2 py-0.5 rounded-full font-black">
            {fixedExpenses.length}
          </span>
        </button>
      </div>

      {/* VISTA 1: Historial y Gráfico */}
      {activeTab === 'history' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Gráfico Recharts por Categoría */}
          <div className="lg:col-span-2 glass-panel p-5 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-rose-500" />
                Gastos por Categoría ({selectedCurrency})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Distribución de tus egresos principales
              </p>
            </div>

            <div className="h-56 w-full">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Sin datos de gastos para graficar.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <Tooltip
                      formatter={(val: any) => formatCurrency(val, selectedCurrency)}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                    />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Lista Histórica de Transacciones */}
          <div className="lg:col-span-3 glass-panel p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Tag className="w-4 h-4 text-sky-500" />
              Historial de Transacciones ({selectedCurrency})
            </h3>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Cargando gastos...</div>
              ) : transactions.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">
                  Aún no has registrado gastos en moneda {selectedCurrency}.
                </p>
              ) : (
                transactions.map((t) => {
                  const isExpense = t.type === 'expense';
                  return (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isExpense
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            {isExpense ? 'Gasto' : 'Ingreso'}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {t.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {t.note || 'Sin nota'} • {t.date}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`font-black text-sm ${isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {isExpense ? '-' : '+'}{formatCurrency(t.amount, t.currency)}
                        </span>
                        <button
                          onClick={() => handleDeleteTransaction(t.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: Gastos Fijos Recurrentes */}
      {activeTab === 'fixed' && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Repeat className="w-4 h-4 text-indigo-500" />
                Gastos Fijos Programados ({selectedCurrency})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Obligaciones que se repiten mes a mes en una fecha determinada (Arriendo, Servicios, Suscripciones, etc.)
              </p>
            </div>

            <button
              onClick={handleOpenNewFixedModal}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar Gasto Fijo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
            {loading ? (
              <div className="col-span-2 py-8 text-center text-xs text-slate-400">Cargando gastos fijos...</div>
            ) : fixedExpenses.length === 0 ? (
              <div className="col-span-2 py-12 text-center space-y-2 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
                <Repeat className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  No tienes gastos fijos programados en {selectedCurrency}.
                </p>
                <p className="text-[11px] text-slate-400">
                  Registra tus gastos mensuales recurrentes como arriendo o facturas para llevar un control automático.
                </p>
              </div>
            ) : (
              fixedExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-3 hover:border-indigo-500/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {exp.title}
                        </h4>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {exp.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          Día {exp.due_day} de cada mes
                        </span>
                        {exp.note && (
                          <span className="text-[11px] text-slate-400 italic">
                            ({exp.note})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black text-indigo-600 dark:text-indigo-400 block">
                        {formatCurrency(exp.amount, exp.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800/80 pt-2.5">
                    <div>
                      {exp.paid_this_month ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Pagado este mes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg">
                          <Clock className="w-3.5 h-3.5" />
                          Pendiente este mes
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!exp.paid_this_month && (
                        <button
                          onClick={() => handlePayFixedExpenseNow(exp.id)}
                          disabled={payingFixedId === exp.id}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 active:scale-95 disabled:opacity-50"
                        >
                          {payingFixedId === exp.id ? (
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Registrar Pago
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEditFixedModal(exp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
                        title="Editar Gasto Fijo"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteFixedExpense(exp.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Eliminar Gasto Fijo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal para Registrar Nueva Transacción Normal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-500" />
                Registrar Movimiento Financiero
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTransaction} className="space-y-4">
              {/* Tipo: Gasto o Ingreso */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold border transition-all ${
                    type === 'expense'
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-600 dark:text-rose-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  🔴 Registrar Gasto
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold border transition-all ${
                    type === 'income'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  🟢 Registrar Ingreso
                </button>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Categoría *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Monto y Moneda */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Monto *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Monto..."
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Moneda
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="w-full px-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-bold"
                  >
                    <option value="COP">COP ($)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              {/* Fecha y Nota */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Nota u Observación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Mercado mensual..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md"
                >
                  {saving ? 'Guardando...' : 'Guardar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Crear / Editar Gasto Fijo Recurrente */}
      {isFixedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Repeat className="w-5 h-5 text-indigo-500" />
                {editingFixedId ? 'Editar Gasto Fijo' : 'Nuevo Gasto Fijo Recurrente'}
              </h2>
              <button
                onClick={() => setIsFixedModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitFixedExpense} className="space-y-4">
              {/* Título del Gasto Fijo */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Nombre del Gasto Fijo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Arriendo Apto, Internet Tigo, Netflix..."
                  value={fixedTitle}
                  onChange={(e) => setFixedTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Categoría *
                </label>
                <select
                  value={fixedCategory}
                  onChange={(e) => setFixedCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Monto y Moneda */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Monto Mensual *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Monto fijo..."
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Moneda
                  </label>
                  <select
                    value={fixedCurrency}
                    onChange={(e) => setFixedCurrency(e.target.value as CurrencyCode)}
                    className="w-full px-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-bold"
                  >
                    <option value="COP">COP ($)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              {/* Día del Mes y Nota */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Día de Pago del Mes (1-31) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    placeholder="15"
                    value={fixedDueDay}
                    onChange={(e) => setFixedDueDay(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Nota u Observación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Pago por débito auto..."
                    value={fixedNote}
                    onChange={(e) => setFixedNote(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFixedModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={fixedSaving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md"
                >
                  {fixedSaving ? 'Guardando...' : editingFixedId ? 'Actualizar Gasto Fijo' : 'Guardar Gasto Fijo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
