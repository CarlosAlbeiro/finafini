import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { formatCurrency } from '../utils/currency';
import type { CurrencyCode } from '../utils/currency';
import { ServerErrorFallback } from '../components/ServerErrorFallback';
import { ApiError } from '../utils/api';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Send,
  Plus,
  CheckCircle,
  CreditCard,
  AlertTriangle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  onOpenNewDebt: () => void;
  onOpenPaymentModal: (debtId: string, currency: CurrencyCode, amount?: number, instId?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenNewDebt }) => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('COP');
  const [reminderSent, setReminderSent] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setServerError(false);
      const data = await apiFetch('/dashboard/summary');
      setSummary(data);
    } catch (err: any) {
      console.error('Error al cargar dashboard:', err);
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
    fetchDashboard();
  }, []);

  const [payingInstallmentId, setPayingInstallmentId] = useState<string | null>(null);

  const handleDirectFullPayment = async (debtId: string, instId: string, fullAmount: number, instNumber: number) => {
    try {
      setPayingInstallmentId(instId);
      await apiFetch('/payments', {
        method: 'POST',
        body: JSON.stringify({
          debt_id: debtId,
          installment_id: instId,
          amount: fullAmount,
          note: `Pago completo de cuota #${instNumber}`
        })
      });
      await fetchDashboard();
    } catch (err) {
      console.error('Error al saldar cuota:', err);
    } finally {
      setPayingInstallmentId(null);
    }
  };

  const handleSendReminder = async (debtId: string, instId: string) => {
    try {
      await apiFetch('/notifications/whatsapp/send-reminder', {
        method: 'POST',
        body: JSON.stringify({ debt_id: debtId, installment_id: instId })
      });
      setReminderSent(instId);
      setTimeout(() => setReminderSent(null), 3000);
    } catch (err) {
      console.error('Error al enviar recordatorio:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (serverError) {
    return <ServerErrorFallback onRetry={fetchDashboard} />;
  }

  const currentMonthName = summary?.currentMonthName || 'Este Mes';
  const nextMonthName = summary?.nextMonthName || 'Próximo Mes';

  const currencyData = summary?.summaryByCurrency?.[selectedCurrency] || {
    total_owed: 0,
    total_lent: 0,
    total_due_this_month: 0,
    total_due_next_month: 0,
    total_active: 0,
    total_settled: 0
  };

  const chartData = [
    { name: `Pagar (${currentMonthName})`, amount: currencyData.total_due_this_month, color: '#f59e0b' },
    { name: `Pagar (${nextMonthName})`, amount: currencyData.total_due_next_month, color: '#6366f1' },
    { name: 'Me Deben Total', amount: currencyData.total_lent, color: '#10b981' },
    { name: 'Yo Debo Total', amount: currencyData.total_owed, color: '#f43f5e' }
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado y Selector de Moneda */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">
            Resumen Financiero FinaFini
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Estado de tus compromisos de pago y préstamos
          </p>
        </div>

        {/* Tab selector de monedas COP, USD, EUR */}
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
      </div>

      {/* Cards de Métricas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* CARD 1: Valor a pagar este mes */}
        <div className="glass-card p-4 border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 line-clamp-1">
              A Pagar ({currentMonthName})
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-amber-700 dark:text-amber-300">
            {formatCurrency(currencyData.total_due_this_month, selectedCurrency)}
          </p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1 inline-block line-clamp-1">
            Cuotas de {currentMonthName}
          </span>
        </div>

        {/* CARD 2: Valor a pagar el próximo mes con el Nombre del Mes */}
        <div className="glass-card p-4 border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 line-clamp-1">
              A Pagar ({nextMonthName})
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-indigo-700 dark:text-indigo-300">
            {formatCurrency(currencyData.total_due_next_month, selectedCurrency)}
          </p>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-1 inline-block line-clamp-1">
            Cuotas programadas en {nextMonthName}
          </span>
        </div>

        {/* CARD 3: Total que me deben */}
        <div className="glass-card p-4 border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 line-clamp-1">
              Me Deben (Por Cobrar)
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-800 dark:text-slate-100">
            {formatCurrency(currencyData.total_lent, selectedCurrency)}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 inline-block line-clamp-1">
            Préstamos a otros
          </span>
        </div>

        {/* CARD 4: Total que debo (Global) */}
        <div className="glass-card p-4 border-l-4 border-l-rose-500">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 line-clamp-1">
              Deuda Total Acumulada
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-800 dark:text-slate-100">
            {formatCurrency(currencyData.total_owed, selectedCurrency)}
          </p>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-1 inline-block line-clamp-1">
            Saldo todas las cuotas
          </span>
        </div>

        {/* CARD 5: Estado Préstamos */}
        <div className="glass-card p-4 border-l-4 border-l-sky-500">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 line-clamp-1">
              Préstamos Registrados
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-800 dark:text-slate-100">
              {currencyData.total_active}
            </span>
            <span className="text-[10px] text-slate-500">Activos ({currencyData.total_settled} Saldados)</span>
          </div>
          <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold mt-1 inline-block line-clamp-1">
            En moneda {selectedCurrency}
          </span>
        </div>
      </div>

      {/* Gráfico y Sección de Próximas Cuotas */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Gráfico Recharts de distribución */}
        <div className="lg:col-span-2 glass-panel p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
              Compromisos de Pago ({selectedCurrency})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              A pagar este mes vs. por cobrar vs. deuda total
            </p>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  formatter={(value: any) => formatCurrency(value, selectedCurrency)}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Próximos Vencimientos de Cuotas */}
        <div className="lg:col-span-3 glass-panel p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Próximas Cuotas a Vencer
              </h3>
            </div>
            <button
              onClick={onOpenNewDebt}
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo
            </button>
          </div>

          <div className="space-y-2.5">
            {summary?.upcomingInstallments?.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                🎉 No tienes cuotas pendientes de vencimiento inmediato.
              </p>
            ) : (
              summary?.upcomingInstallments?.map((inst: any) => (
                <div
                  key={inst.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 hover:border-sky-500/50 transition-colors"
                >
                  <div className="space-y-1">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                      {inst.debt_title} (Cuota #{inst.number})
                    </span>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Vence: {inst.due_date}
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {formatCurrency(inst.amount, inst.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSendReminder(inst.debt_id, inst.id)}
                      className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                      title="Enviar recordatorio WhatsApp"
                    >
                      {reminderSent === inst.id ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 animate-bounce" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDirectFullPayment(inst.debt_id, inst.id, inst.pending_amount || inst.amount, inst.number)}
                      disabled={payingInstallmentId === inst.id}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {payingInstallmentId === inst.id ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Pagando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          Pagar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
