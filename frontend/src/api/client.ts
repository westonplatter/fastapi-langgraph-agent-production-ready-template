export type ApiError = {
  status: number;
  message: string;
};

const DEFAULT_BASE_URL = "http://localhost:8000";

export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.toString().replace(/\/$/, "") || DEFAULT_BASE_URL;

export const toFormBody = (payload: Record<string, string>): URLSearchParams => {
  const params = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    params.append(key, value);
  });
  return params;
};

const buildHeaders = (token?: string, contentType?: string): HeadersInit => {
  const headers: HeadersInit = {};
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const apiRequest = async <T>(
  path: string,
  options: RequestInit & { token?: string; contentType?: string } = {},
): Promise<T> => {
  const { token, contentType, ...fetchOptions } = options;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...fetchOptions,
    headers: {
      ...buildHeaders(token, contentType),
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = (await response.json()) as { detail?: string };
      if (data?.detail) {
        message = data.detail;
      }
    } catch {
      // ignore parse errors
    }
    throw { status: response.status, message } satisfies ApiError;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};
