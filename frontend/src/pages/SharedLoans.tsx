import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { formatCurrency } from '../utils/currency';
import { Users, Check, X, UserPlus, Clock } from 'lucide-react';

export const SharedLoans: React.FC = () => {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/participants/my-invitations');
      setInvitations(data.invitations || []);

      const userRes = await apiFetch('/auth/users');
      setUsers(userRes.users || []);
    } catch (err) {
      console.error('Error al cargar invitaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleRespond = async (id: string, accept: boolean) => {
    try {
      await apiFetch(`/participants/invitations/${id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ accept })
      });
      fetchInvitations();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Users className="w-6 h-6 text-sky-500" />
          Préstamos Compartidos e Invitaciones
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gestiona invitaciones a préstamos entre usuarios registrados
        </p>
      </div>

      {/* Seccion de Invitaciones Pendientes */}
      <div className="glass-panel p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          Invitaciones Pendientes de Aceptación
        </h2>

        {loading ? (
          <div className="py-6 text-center text-xs text-slate-400">Cargando invitaciones...</div>
        ) : invitations.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No tienes invitaciones pendientes por responder.
          </p>
        ) : (
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    {inv.inviter_name} te ha invitado como {inv.role === 'debtor' ? 'Deudor' : 'Acreedor'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Préstamo: <span className="font-semibold text-slate-700 dark:text-slate-300">{inv.debt_title}</span> •{' '}
                    {formatCurrency(inv.total_amount, inv.currency)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRespond(inv.id, true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" /> Aceptar
                  </button>
                  <button
                    onClick={() => handleRespond(inv.id, false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-100 dark:hover:bg-rose-950/40 hover:text-rose-600 text-xs font-semibold"
                  >
                    <X className="w-3.5 h-3.5" /> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usuarios Disponibles en el sistema para vincular */}
      <div className="glass-panel p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-sky-500" />
          Directorio de Usuarios Registrados
        </h2>
        <p className="text-xs text-slate-500">
          Puedes ingresar su correo electrónico al crear o editar un préstamo para compartir el registro con ellos.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 font-bold flex items-center justify-center text-xs">
                {u.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                  {u.name}
                </span>
                <span className="text-[11px] text-slate-400 block truncate">{u.email}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
