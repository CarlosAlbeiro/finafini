import React, { useState } from 'react';
import { X, Upload, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { formatCurrency } from '../utils/currency';
import type { CurrencyCode } from '../utils/currency';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtId: string;
  currency: CurrencyCode;
  suggestedAmount?: number;
  installmentId?: string;
  onSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  debtId,
  currency,
  suggestedAmount,
  installmentId,
  onSuccess
}) => {
  const [amount, setAmount] = useState<string>(suggestedAmount ? suggestedAmount.toString() : '');
  const [note, setNote] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError('Por favor ingresa un monto válido.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('debt_id', debtId);
      if (installmentId) formData.append('installment_id', installmentId);
      formData.append('amount', amount);
      formData.append('note', note || 'Abono a préstamo');
      if (receiptFile) formData.append('receipt', receiptFile);

      await apiFetch('/payments', {
        method: 'POST',
        body: formData
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al registrar el pago.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Registrar Abono / Pago
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
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Monto a Abonar ({currency}) *
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej: 100000"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="absolute right-4 top-3 text-xs font-bold text-slate-400">{currency}</span>
            </div>
            {suggestedAmount && (
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                Sugerido cuota: {formatCurrency(suggestedAmount, currency)}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Nota o Referencia
            </label>
            <input
              type="text"
              placeholder="Ej: Transferencia Nequi / Bancolombia / Efectivo..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Subir Comprobante */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Comprobante de Pago (Imagen / PDF)
            </label>
            <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-950/50">
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {receiptFile ? receiptFile.name : 'Seleccionar archivo de comprobante'}
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              />
            </label>
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : 'Confirmar Abono'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
