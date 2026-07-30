import { useEffect, useRef, useState } from 'react';
import { inboxAPI } from '../services/api';

export default function WhatsAppQRModal({ empresaId, onClose, onConnected }) {
  const [canal, setCanal] = useState(null);
  const [estado, setEstado] = useState({ status: 'connecting' });
  const [error, setError] = useState(null);
  const [firstSeenDisconnected, setFirstSeenDisconnected] = useState(Date.now());
  const pollRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const res = await inboxAPI.crearCanalQR(empresaId, { nombre: 'WhatsApp (QR)' });
        setCanal(res.canal);
      } catch (err) {
        const status = err.response?.status;
        const data = err.response?.data;
        const detail = data?.details || data?.message || data?.error || err.message;
        console.error('Error creando canal QR:', status, data);
        setError(status ? `[${status}] ${detail}` : detail || 'No se pudo iniciar la vinculación por QR.');
      }
    })();

    return () => clearInterval(pollRef.current);
  }, [empresaId]);

  useEffect(() => {
    if (!canal?.id) return;

    async function poll() {
      try {
        const res = await inboxAPI.getEstadoCanalQR(canal.id);
        setEstado(res);

        if (res.status === 'connected') {
          clearInterval(pollRef.current);
          onConnected?.();
          return;
        }

        if (res.status !== 'disconnected') {
          setFirstSeenDisconnected(Date.now());
        }
      } catch {
        // se ignoran fallos puntuales de polling
      }
    }

    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, [canal?.id, onConnected]);

  const secondsDisconnected = (Date.now() - firstSeenDisconnected) / 1000;
  const showTimeoutWarning = estado.status === 'disconnected' && !estado.qrPng && secondsDisconnected > 15;

  const handleClose = async () => {
    if (canal?.id && estado.status !== 'connected') {
      try { await inboxAPI.desconectarCanalQR(canal.id); } catch {}
    }
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark shadow-xl p-8 max-w-sm w-full text-center relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 size-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-text-sub-light hover:text-red-500 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        <div className="size-12 rounded-2xl bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/20 mx-auto mb-4">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>

        <h3 className="font-black text-text-main-light dark:text-white text-lg mb-1">Vincular con QR</h3>
        <p className="text-xs text-text-sub-light mb-6">
          Abre WhatsApp en tu teléfono → Dispositivos vinculados → Vincular un dispositivo, y escanea el código.
        </p>

        {error ? (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">
            {error}
          </div>
        ) : (
          <>
            {estado.qrPng ? (
              <div className="mb-4">
                <img src={estado.qrPng} alt="QR WhatsApp" className="mx-auto rounded-xl" width={240} height={240} />
              </div>
            ) : (
              <div className="w-[240px] h-[240px] mx-auto mb-4 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-text-sub-light animate-spin">progress_activity</span>
              </div>
            )}

            {estado.status === 'qr' && (
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-500">
                <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                Esperando escaneo...
              </div>
            )}
            {estado.status === 'connecting' && (
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400">
                <span className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
                Conectando...
              </div>
            )}
            {estado.status === 'disconnected' && !showTimeoutWarning && (
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-text-sub-light">
                <span className="size-1.5 rounded-full bg-gray-400 animate-pulse" />
                Generando código...
              </div>
            )}
            {showTimeoutWarning && (
              <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
                No se pudo generar el QR. Cierra esta ventana e inténtalo de nuevo.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
