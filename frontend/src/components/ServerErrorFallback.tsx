import React, { useState } from 'react';
import { WifiOff, RefreshCw, ServerOff, AlertCircle } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface ServerErrorFallbackProps {
  onRetry?: () => void;
  title?: string;
  message?: string;
}

export const ServerErrorFallback: React.FC<ServerErrorFallbackProps> = ({
  onRetry,
  title = "El servidor no responde",
  message = "No fue posible conectar con el backend de finafini. Revisa si el servidor está encendido o tu conexión a internet."
}) => {
  const [retrying, setRetrying] = useState(false);

  const handleRetryClick = async () => {
    setRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else {
        await apiFetch('/auth/me').catch(() => {});
        window.location.reload();
      }
    } finally {
      setTimeout(() => setRetrying(false), 800);
    }
  };

  return (
    <div className="min-h-[400px] w-full flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-md w-full glass-panel p-8 text-center relative overflow-hidden shadow-2xl border border-rose-500/20 dark:border-rose-900/40">
        
        {/* Fondo con brillo animado */}
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl animate-pulse pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl animate-pulse delay-700 pointer-events-none" />

        {/* Ícono animado del servidor fuera de línea */}
        <div className="relative mx-auto w-24 h-24 mb-6 flex items-center justify-center">
          {/* Anillos concéntricos pulsantes */}
          <div className="absolute inset-0 rounded-full bg-rose-500/10 dark:bg-rose-500/20 animate-ping opacity-75" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-rose-500/20 to-amber-500/20 blur-sm" />

          {/* Contenedor central del ícono */}
          <div className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-600 p-0.5 shadow-lg shadow-rose-500/30">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-rose-400">
              <ServerOff className="w-10 h-10 animate-bounce" />
            </div>
          </div>

          <div className="absolute -bottom-1 -right-1 bg-rose-600 text-white p-1.5 rounded-full shadow-md">
            <WifiOff className="w-4 h-4" />
          </div>
        </div>

        {/* Textos Informativos */}
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2 mb-2">
          <AlertCircle className="w-5 h-5 text-rose-500" />
          {title}
        </h2>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
          {message}
        </p>

        {/* Botón de reintento con animación de giro */}
        <button
          onClick={handleRetryClick}
          disabled={retrying}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
          {retrying ? 'Reconectando...' : 'Reintentar Conexión'}
        </button>
      </div>
    </div>
  );
};
