const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export class ApiError extends Error {
  isServerError: boolean;
  status?: number;

  constructor(message: string, isServerError = false, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.isServerError = isServerError;
    this.status = status;
  }
}

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('finanzas_token');

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Si no es FormData, setear Content-Type json por defecto
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const isServerDown = response.status >= 500;
      throw new ApiError(data.error || 'Ocurrió un error en el servidor.', isServerDown, response.status);
    }

    return data;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Error de red / Failed to fetch (servidor caído o fuera de línea)
    throw new ApiError('No se pudo establecer conexión con el servidor backend.', true);
  }
};
