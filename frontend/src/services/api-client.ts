import { env } from '../config/env';
import type { ApiEnvelope } from '../models/api';
import type { User } from '../models/user';
import { useAuthStore } from '../store/auth.store';
import { errorFromResponse, toApiError } from './api-error';

interface AuthPayload {
  user: User;
  accessToken: string;
}

// Un 401 fuera de /auth/* dispara un refresh y reintenta una vez; si el refresh falla, cierra la
// sesion. Todo error sale como ApiError: los componentes nunca ven un Response ni un TypeError.
class ApiClient {
  private readonly baseURL: string;
  private refreshing: Promise<string> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // Si ya hay un refresh en vuelo, todos esperan el mismo: N requests con 401 no disparan N refresh.
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

  get<T>(url: string): Promise<T> {
    return this.request<T>('GET', url);
  }

  post<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', url, body ?? {});
  }

  patch<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', url, body ?? {});
  }

  delete<T = void>(url: string): Promise<T> {
    return this.request<T>('DELETE', url);
  }

  private async request<T>(
    method: string,
    url: string,
    body?: unknown,
    retried = false,
  ): Promise<T> {
    const token = useAuthStore.getState().accessToken;
    let res: Response;
    try {
      res = await fetch(this.baseURL + url, {
        method,
        // La cookie httpOnly del refresh vive en el dominio del backend, no en el del frontend.
        credentials: 'include',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          ...(body !== undefined && { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      throw toApiError(err);
    }

    if (res.ok) {
      // Texto y no res.json(): un 204 de un DELETE viene sin cuerpo.
      const text = await res.text();
      return text ? (JSON.parse(text) as ApiEnvelope<T>).data : (undefined as T);
    }

    const canRetry =
      res.status === 401 &&
      !retried &&
      !url.includes('/auth/') &&
      useAuthStore.getState().isLoggedIn();
    if (!canRetry) throw await errorFromResponse(res);

    try {
      await this.refreshOnce();
    } catch (refreshErr) {
      useAuthStore.getState().clear();
      throw toApiError(refreshErr);
    }
    return this.request<T>(method, url, body, true);
  }
}

export const apiClient = new ApiClient(env.apiUrl);
