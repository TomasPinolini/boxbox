import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { env } from '../config/env';
import type { ApiEnvelope } from '../models/api';
import type { User } from '../models/user';
import { useAuthStore } from '../store/auth.store';
import { toApiError } from './api-error';

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

interface AuthPayload {
  user: User;
  accessToken: string;
}

// ApiClient: la unica puerta hacia el backend (patron fachada). Una clase, una instancia.
//   - request: Authorization: Bearer <token del store>; withCredentials para la cookie.
//   - response 401 fuera de /auth/*: UN refresh (deduplicado si hay varios 401 a la vez),
//     reintenta el request original; si el refresh falla, cierra la sesion.
//   - cualquier error sale como ApiError. Los componentes nunca ven un AxiosError.
export class ApiClient {
  private readonly http: AxiosInstance;
  private refreshing: Promise<string> | null = null;

  constructor(baseURL: string) {
    this.http = axios.create({ baseURL, withCredentials: true });

    this.http.interceptors.request.use((config) => {
      const token = useAuthStore.getState().accessToken;
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.http.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as RetriableConfig | undefined;
        const isAuthRoute = config?.url?.includes('/auth/') ?? false;
        const canRetry =
          error.response?.status === 401 &&
          config !== undefined &&
          !config._retried &&
          !isAuthRoute &&
          useAuthStore.getState().isLoggedIn();

        if (!canRetry) throw toApiError(error);

        try {
          await this.refreshOnce();
        } catch (refreshErr) {
          useAuthStore.getState().clear();
          throw toApiError(refreshErr);
        }
        config._retried = true;
        return this.http.request(config);
      },
    );
  }

  // refreshOnce: si ya hay un refresh en vuelo, todos esperan el mismo (evita N refresh
  // cuando N requests fallan juntos con 401). El backend devuelve { user, accessToken }.
  refreshOnce(): Promise<string> {
    if (!this.refreshing) {
      this.refreshing = this.post<AuthPayload>('/auth/refresh')
        .then((payload) => {
          useAuthStore.getState().setSession(payload.user, payload.accessToken);
          return payload.accessToken;
        })
        .finally(() => {
          this.refreshing = null;
        });
    }
    return this.refreshing;
  }

  async get<T>(url: string): Promise<T> {
    const res = await this.http.get<ApiEnvelope<T>>(url);
    return res.data.data;
  }

  async post<T>(url: string, body?: unknown): Promise<T> {
    const res = await this.http.post<ApiEnvelope<T>>(url, body ?? {});
    return res.data.data;
  }

  async delete<T = void>(url: string): Promise<T> {
    const res = await this.http.delete<ApiEnvelope<T>>(url);
    return res.data?.data;
  }
}

export const apiClient = new ApiClient(env.apiUrl);
