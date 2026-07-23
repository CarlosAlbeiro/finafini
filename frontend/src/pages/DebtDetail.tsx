import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { formatCurrency } from '../utils/currency';
import type { CurrencyCode } from '../utils/currency';
import { ProgressBar } from '../components/ProgressBar';
import { EditDebtModal } from '../components/EditDebtModal';
import { ServerErrorFallback } from '../components/ServerErrorFallback';
import { ApiError } from '../utils/api';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileText,
  Plus,
  ShieldAlert,
  ExternalLink,
  Edit3
} from 'lucide-react';

interface DebtDetailProps {
  onOpenPaymentModal: (debtId: string, currency: CurrencyCode, amount?: number, instId?: string) => void;
}

export const DebtDetail: React.FC<DebtDetailProps> = ({ onOpenPaymentModal }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setServerError(false);
      const res = await apiFetch(`/debts/${id}`);
      setData(res);
    } catch (err: any) {
      console.error('Error al cargar préstamo:', err);
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
    if (id) fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (serverError) {
    return <ServerErrorFallback onRetry={fetchDetail} />;
  }

  if (!data || !data.debt) {
    return (
      <div className="glass-panel p-8 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Préstamo no encontrado</h2>
        <button
          onClick={() => navigate('/debts')}
          className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-semibold"
        >
          Volver a mis préstamos
        </button>
      </div>
    );
  }

  const { debt, installments, payments } = data;

  return (
    <div className="space-y-6">
      {/* Botón Volver */}
      <button
        onClick={() => navigate('/debts')}
        className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a la lista
      </button>

      {/* Tarjeta Principal de Detalle */}
      <div className="glass-panel p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Detalle de Préstamo ({debt.currency})
            </span>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {debt.title}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {debt.description || 'Sin descripción adicional'}
              </p>
              {debt.interest_rate > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Tasa de Interés: %{debt.interest_rate}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition-colors"
            >
              <Edit3 className="w-4 h-4 text-sky-500" />
              Editar Préstamo
            </button>
            <button
              onClick={() => onOpenPaymentModal(debt.id, debt.currency)}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Registrar Abono
            </button>
          </div>
        </div>

        {/* Métricas Principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 block">
              {debt.interest_rate > 0 ? 'Monto a Pagar (con int.)' : 'Monto Total'}
            </span>
            <span className="text-lg font-black text-slate-800 dark:text-slate-100">
              {formatCurrency(debt.total_payable || debt.total_amount, debt.currency)}
            </span>
            {debt.interest_rate > 0 && (
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Capital: {formatCurrency(debt.total_amount, debt.currency)}
              </span>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 block">Total Abonado</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(debt.total_paid, debt.currency)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 block">Saldo Restante</span>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400">
              {formatCurrency(debt.remaining_amount, debt.currency)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 block">Cuotas Pactadas</span>
            <span className="text-lg font-black text-slate-800 dark:text-slate-100">
              {debt.installments_count} Cuotas
            </span>
          </div>
        </div>

        <ProgressBar percentage={debt.progress_percentage} />
      </div>

      {/* Tablas de Cronograma de Cuotas e Historial de Pagos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cronograma de Cuotas */}
        <div className="glass-panel p-5 space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-500" />
            Cronograma de Cuotas
          </h3>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {installments?.map((inst: any) => {
              const isPaid = inst.status === 'paid';
              const isPartial = inst.status === 'partial';

              return (
                <div
                  key={inst.id}
                  className={`p-3.5 rounded-xl border transition-colors flex items-center justify-between ${
                    isPaid
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                      : isPartial
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Cuota #{inst.number}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isPaid
                            ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300'
                            : isPartial
                            ? 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-300'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {isPaid ? 'Pagada' : isPartial ? 'Abonado parcial' : 'Pendiente'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 mt-1">
                      Vence: {inst.due_date} | Abonado: {formatCurrency(inst.paid_amount, debt.currency)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                      {formatCurrency(inst.amount, debt.currency)}
                    </span>
                    {!isPaid && (
                      <button
                        onClick={() =>
                          onOpenPaymentModal(
                            debt.id,
                            debt.currency,
                            inst.amount - (inst.paid_amount || 0),
                            inst.id
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-500"
                      >
                        Abonar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Historial de Pagos con Comprobantes */}
        <div className="glass-panel p-5 space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Historial de Abonos
          </h3>

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {payments?.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                Aún no hay abonos registrados para este préstamo.
              </p>
            ) : (
              payments?.map((pay: any) => (
                <div
                  key={pay.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block">
                      +{formatCurrency(pay.amount, debt.currency)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {pay.note || 'Abono'} • {new Date(pay.paid_at).toLocaleDateString()}
                    </span>
                  </div>

                  {pay.receipt_url ? (
                    <button
                      onClick={() => setSelectedReceipt(`http://localhost:5000${pay.receipt_url}`)}
                      className="flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline bg-sky-50 dark:bg-sky-950/60 px-2.5 py-1 rounded-lg border border-sky-200 dark:border-sky-800"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Comprobante
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Sin comprobante</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Editar Préstamo */}
      <EditDebtModal
        isOpen={isEditModalOpen}
        debt={debt}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => fetchDetail()}
      />

      {/* Modal para ver comprobante */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-800 rounded-2xl p-4 max-w-xl w-full max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800">
              <span className="text-sm font-bold text-slate-100">Comprobante de Pago</span>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Cerrar ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-2">
              <img
                src={selectedReceipt}
                alt="Comprobante de pago"
                className="max-h-[65vh] object-contain rounded-lg border border-slate-800"
              />
            </div>
            <div className="pt-2 text-center">
              <a
                href={selectedReceipt}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-sky-400 hover:underline flex items-center justify-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir imagen completa
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
