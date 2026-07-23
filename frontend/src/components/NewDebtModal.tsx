import React, { useState } from 'react';
import { X, DollarSign, UserCheck, CheckCircle2, Percent } from 'lucide-react';
import { apiFetch } from '../utils/api';
import type { CurrencyCode } from '../utils/currency';
import { calculateFinancials } from '../utils/financial';

interface NewDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewDebtModal: React.FC<NewDebtModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [role, setRole] = useState<'creditor' | 'debtor'>('creditor'); // 'creditor' = Yo presté dinero | 'debtor' = Yo debo dinero
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('COP');
  const [installmentsCount, setInstallmentsCount] = useState('1');
  const [alreadyPaidInstallments, setAlreadyPaidInstallments] = useState('0');
  const [interestRate, setInterestRate] = useState('0');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDay, setDueDay] = useState('5');
  const [counterpartEmail, setCounterpartEmail] = useState('');
  const [counterpartName, setCounterpartName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiFetch('/debts', {
        method: 'POST',
        body: JSON.stringify({
          role,
          title,
          description,
          total_amount: parseFloat(totalAmount),
          currency,
          installments_count: parseInt(installmentsCount, 10),
          already_paid_installments: parseInt(alreadyPaidInstallments || '0', 10),
          interest_rate: parseFloat(interestRate || '0'),
          start_date: startDate,
          due_day: parseInt(dueDay, 10),
          counterpart_email: counterpartEmail || undefined,
          counterpart_name: counterpartName || undefined
        })
      });

      onSuccess();
      onClose();
      // Reset form
      setTitle('');
      setTotalAmount('');
      setDescription('');
      setAlreadyPaidInstallments('0');
      setInterestRate('0');
    } catch (err: any) {
      setError(err.message || 'Error al guardar el préstamo.');
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
            <DollarSign className="w-5 h-5 text-sky-500" />
            Registrar Préstamo / Deuda
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
          {/* Selector de Rol */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Tipo de Registro
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('creditor')}
                className={`py-2.5 px-4 rounded-xl text-sm font-semibold border transition-all ${
                  role === 'creditor'
                    ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-600 dark:text-sky-400 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                💵 Presté Dinero (Me Deben)
              </button>
              <button
                type="button"
                onClick={() => setRole('debtor')}
                className={`py-2.5 px-4 rounded-xl text-sm font-semibold border transition-all ${
                  role === 'debtor'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                💳 Pedí Prestado (Debo)
              </button>
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Título o Concepto *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Préstamo viaje, Compra moto..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Monto Base y Moneda */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Monto Base (Capital) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="500000"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Moneda
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="COP">COP ($)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          {/* Interés %, Cuotas Totales y Cuotas Pagadas */}
          <div className="grid grid-cols-3 gap-3">
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
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ya Pagadas
              </label>
              <input
                type="number"
                min="0"
                max={installmentsCount}
                value={alreadyPaidInstallments}
                onChange={(e) => setAlreadyPaidInstallments(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Desglose automático de intereses E.A. y cuotas */}
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
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Día del mes de pago
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Vinculación con Usuario (Opcional) */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-sky-500" />
              Contraparte o Amigo (Opcional)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="email"
                placeholder="Email del usuario..."
                value={counterpartEmail}
                onChange={(e) => setCounterpartEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
              />
              <input
                type="text"
                placeholder="O Nombre de contacto..."
                value={counterpartName}
                onChange={(e) => setCounterpartName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Botones de acción */}
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Crear Préstamo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
