import React, { useState, useEffect } from 'react';
import { X, Edit3, Percent, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../utils/api';
import type { CurrencyCode } from '../utils/currency';
import { calculateFinancials } from '../utils/financial';

interface EditDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  debt: any;
}

const formatDateForInput = (rawDate: any): string => {
  if (!rawDate) return new Date().toISOString().split('T')[0];
  if (typeof rawDate === 'string') {
    return rawDate.split('T')[0];
  }
  if (rawDate instanceof Date) {
    return rawDate.toISOString().split('T')[0];
  }
  return String(rawDate).split('T')[0];
};

export const EditDebtModal: React.FC<EditDebtModalProps> = ({ isOpen, onClose, onSuccess, debt }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('COP');
  const [installmentsCount, setInstallmentsCount] = useState('1');
  const [alreadyPaidInstallments, setAlreadyPaidInstallments] = useState('0');
  const [interestRate, setInterestRate] = useState('0');
  const [startDate, setStartDate] = useState('');
  const [dueDay, setDueDay] = useState('5');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (debt) {
      setTitle(debt.title || '');
      setDescription(debt.description || '');
      setTotalAmount(debt.total_amount ? debt.total_amount.toString() : '');
      setCurrency(debt.currency || 'COP');
      setInstallmentsCount(debt.installments_count ? debt.installments_count.toString() : '1');
      setAlreadyPaidInstallments(debt.paid_installments_count !== undefined ? debt.paid_installments_count.toString() : '0');
      setInterestRate(debt.interest_rate ? debt.interest_rate.toString() : '0');
      setStartDate(formatDateForInput(debt.start_date));
      setDueDay(debt.due_day ? debt.due_day.toString() : '5');
      setStatus(debt.status || 'active');
    }
  }, [debt]);

  if (!isOpen || !debt) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiFetch(`/debts/${debt.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title,
          description,
          total_amount: parseFloat(totalAmount),
          currency,
          installments_count: parseInt(installmentsCount, 10),
          already_paid_installments: parseInt(alreadyPaidInstallments || '0', 10),
          interest_rate: parseFloat(interestRate || '0'),
          start_date: startDate,
          due_day: parseInt(dueDay, 10),
          status
        })
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el préstamo.');
    } finally {
      setLoading(false);
    }
  };

  const financials = calculateFinancials(totalAmount, interestRate, installmentsCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-sky-500" />
            Editar Información del Préstamo
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Título o Concepto *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Descripción
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles adicionales..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm"
            />
          </div>

          {/* Monto y Moneda */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Monto Base *
              </label>
              <input
                type="number"
                step="any"
                required
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Moneda
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-bold"
              >
                <option value="COP">COP ($)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          {/* Interés %, Cuotas Totales, Cuotas Ya Pagadas y Estado */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5" /> Interés (%)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                max="100"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Cuotas Totales *
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={installmentsCount}
                onChange={(e) => setInstallmentsCount(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Cuotas Pagadas
              </label>
              <input
                type="number"
                min="0"
                max={installmentsCount}
                value={alreadyPaidInstallments}
                onChange={(e) => setAlreadyPaidInstallments(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Estado
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs font-bold"
              >
                <option value="active">Activo</option>
                <option value="paid">Saldado</option>
              </select>
            </div>
          </div>

          {/* Desglose de cálculos con Tasa Efectiva Anual (E.A.) */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
            {financials.totalInterest > 0 && (
              <>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Tasa Mensual Efectiva (EM):</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">%{financials.monthlyRatePercentage} / mes</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Intereses totales (E.A.):</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">+{financials.totalInterest.toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800 dark:text-slate-100">
                  <span>Total a pagar con Intereses:</span>
                  <span>{financials.totalPayable.toFixed(2)} {currency}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-sky-600 dark:text-sky-400 font-semibold pt-0.5">
              <span>Valor por cuota ({installmentsCount} cuotas):</span>
              <span>{financials.installmentAmount.toFixed(2)} {currency}</span>
            </div>
          </div>

          {/* Fecha Inicio y Día de Pago */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Fecha de Inicio *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Día de Pago (Mes)
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
