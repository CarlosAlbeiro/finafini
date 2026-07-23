import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { formatCurrency } from '../utils/currency';
import type { CurrencyCode } from '../utils/currency';
import { ProgressBar } from '../components/ProgressBar';
import { EditDebtModal } from '../components/EditDebtModal';
import { ServerErrorFallback } from '../components/ServerErrorFallback';
import { ApiError } from '../utils/api';
import { HandCoins, Plus, Search, ArrowUpRight, ArrowDownLeft, Trash2, Edit3 } from 'lucide-react';

interface DebtsListProps {
  onOpenNewDebt: () => void;
  onOpenPaymentModal: (debtId: string, currency: CurrencyCode, amount?: number) => void;
}

export const DebtsList: React.FC<DebtsListProps> = ({ onOpenNewDebt, onOpenPaymentModal }) => {
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'creditor' | 'debtor'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paid'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | CurrencyCode>('all');
  const [editingDebt, setEditingDebt] = useState<any>(null);

  const navigate = useNavigate();

  const fetchDebts = async () => {
    try {
      setLoading(true);
      setServerError(false);
      const data = await apiFetch('/debts');
      setDebts(data.debts || []);
    } catch (err: any) {
      console.error('Error al cargar préstamos:', err);
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
    fetchDebts();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de eliminar este préstamo?')) return;
    try {
      await apiFetch(`/debts/${id}`, { method: 'DELETE' });
      fetchDebts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (debt: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDebt(debt);
  };

  const filteredDebts = debts.filter((d) => {
    const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
      (d.creditor_name && d.creditor_name.toLowerCase().includes(search.toLowerCase())) ||
      (d.debtor_name && d.debtor_name.toLowerCase().includes(search.toLowerCase()));

    const matchesRole = roleFilter === 'all' || d.userRole === roleFilter;
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesCurrency = currencyFilter === 'all' || d.currency === currencyFilter;

    return matchesSearch && matchesRole && matchesStatus && matchesCurrency;
  });

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <HandCoins className="w-6 h-6 text-sky-500" />
            Mis Préstamos y Deudas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Control de montos, cuotas y abonos realizados
          </p>
        </div>

        <button
          onClick={onOpenNewDebt}
          className="flex items-center gap-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Registrar Préstamo
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar préstamo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Filtro Rol */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold"
          >
            <option value="all">Todos los Roles</option>
            <option value="creditor">💵 Yo Presté (Acreedor)</option>
            <option value="debtor">💳 Yo Debo (Deudor)</option>
          </select>

          {/* Filtro Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold"
          >
            <option value="all">Todos los Estados</option>
            <option value="active">Activos</option>
            <option value="paid">Saldados</option>
          </select>

          {/* Filtro Moneda */}
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold"
          >
            <option value="all">Todas las Monedas</option>
            <option value="COP">COP ($)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </select>
        </div>
      </div>

      {/* Lista / Grid de Préstamos */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
        </div>
      ) : serverError ? (
        <ServerErrorFallback onRetry={fetchDebts} />
      ) : filteredDebts.length === 0 ? (
        <div className="glass-panel p-12 text-center space-y-3">
          <HandCoins className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            No se encontraron préstamos
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Comienza registrando tu primer préstamo o cambia los filtros de búsqueda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDebts.map((debt) => {
            const isCreditor = debt.userRole === 'creditor';

            return (
              <div
                key={debt.id}
                onClick={() => navigate(`/debts/${debt.id}`)}
                className="glass-card p-5 cursor-pointer hover:border-sky-500/50 flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                        isCreditor
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {isCreditor ? (
                        <>
                          <ArrowUpRight className="w-3 h-3" /> Presté (Cobro)
                        </>
                      ) : (
                        <>
                          <ArrowDownLeft className="w-3 h-3" /> Debo (Pago)
                        </>
                      )}
                    </span>

                    <div className="flex items-center gap-1">
                      {debt.interest_rate > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          %{debt.interest_rate} Interés
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          debt.status === 'paid'
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            : 'bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400'
                        }`}
                      >
                        {debt.status === 'paid' ? 'Saldado' : 'Activo'}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    {debt.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {debt.description || `Inicio: ${debt.start_date}`}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500">Monto Total:</span>
                    <span className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                      {formatCurrency(debt.total_payable || debt.total_amount, debt.currency)}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-500">Saldo Restante:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {formatCurrency(debt.remaining_amount, debt.currency)}
                    </span>
                  </div>

                  <ProgressBar percentage={debt.progress_percentage} />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {debt.installments_count} cuotas de {formatCurrency(debt.installment_amount, debt.currency)}
                  </span>

                  <div className="flex items-center gap-1">
                    {debt.status !== 'paid' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPaymentModal(debt.id, debt.currency);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-500 transition-colors shadow-sm"
                      >
                        Abonar
                      </button>
                    )}
                    <button
                      onClick={(e) => handleEdit(debt, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                      title="Editar Préstamo"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(debt.id, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Editar Préstamo */}
      <EditDebtModal
        isOpen={Boolean(editingDebt)}
        debt={editingDebt}
        onClose={() => setEditingDebt(null)}
        onSuccess={() => fetchDebts()}
      />
    </div>
  );
};
