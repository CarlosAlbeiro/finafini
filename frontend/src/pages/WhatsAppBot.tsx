import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { MessageSquare, QrCode, CheckCircle, Send, PhoneCall, AlertCircle } from 'lucide-react';

export const WhatsAppBot: React.FC = () => {
  const [status, setStatus] = useState<string>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [phoneConnected, setPhoneConnected] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [phoneInput, setPhoneInput] = useState('+573001234567');

  const fetchStatus = async () => {
    try {
      const data = await apiFetch('/notifications/whatsapp/status');
      setStatus(data.status);
      setQrCode(data.qrCode);
      setPhoneConnected(data.phoneConnected);

      const histData = await apiFetch('/notifications/whatsapp/history');
      setHistory(histData.notifications || []);
    } catch (err) {
      console.error('Error al obtener estado WhatsApp:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleGenerateQR = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/notifications/whatsapp/init', { method: 'POST' });
      setStatus(data.status);
      setQrCode(data.qrCode);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePairing = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/notifications/whatsapp/connect-simulate', {
        method: 'POST',
        body: JSON.stringify({ phone: phoneInput })
      });
      setStatus(data.status);
      setPhoneConnected(data.phoneConnected);
      setQrCode(null);
      fetchStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-emerald-500" />
          Bot de Recordatorios por WhatsApp
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Envía notificaciones y alertas automáticas de vencimiento de cuotas vía WhatsApp Web
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel de Conexión y Código QR */}
        <div className="glass-panel p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Estado de la Sesión
            </h2>

            <span
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                status === 'connected'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : status === 'qr_ready'
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {status === 'connected' ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5" /> Vinculado ({phoneConnected})
                </>
              ) : status === 'qr_ready' ? (
                <>
                  <QrCode className="w-3.5 h-3.5" /> Código QR Listo
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" /> Desconectado
                </>
              )}
            </span>
          </div>

          {/* Mostrar QR si está en qr_ready */}
          {status === 'qr_ready' && qrCode && (
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 text-center">
                Abre WhatsApp en tu teléfono ➔ Dispositivos vinculados ➔ Escanea este QR:
              </span>
              <img src={qrCode} alt="Código QR WhatsApp" className="w-48 h-48 bg-white p-2 rounded-xl shadow-md border" />
              
              <div className="w-full pt-2 flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Número de teléfono (+57...)"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                />
                <button
                  onClick={handleSimulatePairing}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Simular Confirmación de Escaneo
                </button>
              </div>
            </div>
          )}

          {status === 'disconnected' && (
            <div className="text-center py-8 space-y-4">
              <QrCode className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Inicia el proceso para generar el código QR y vincular tu número de WhatsApp.
              </p>
              <button
                onClick={handleGenerateQR}
                disabled={loading}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-xs shadow-md"
              >
                {loading ? 'Generando QR...' : 'Generar Código QR de WhatsApp'}
              </button>
            </div>
          )}

          {status === 'connected' && (
            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs space-y-2">
              <span className="font-bold flex items-center gap-1.5 text-sm">
                <PhoneCall className="w-4 h-4" /> Servicio de Envíos Automáticos Activo
              </span>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                Los recordatorios de cuotas próximas a vencer se enviarán desde el número {phoneConnected}.
              </p>
            </div>
          )}
        </div>

        {/* Historial de Notificaciones */}
        <div className="glass-panel p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Send className="w-5 h-5 text-sky-500" />
            Historial de Recordatorios Enviados
          </h2>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {history.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                Aún no se han enviado notificaciones.
              </p>
            ) : (
              history.map((n) => (
                <div
                  key={n.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1"
                >
                  <div className="flex justify-between items-center text-[11px] font-semibold text-slate-400">
                    <span className="text-emerald-500">WhatsApp Sent</span>
                    <span>{new Date(n.sent_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {n.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
