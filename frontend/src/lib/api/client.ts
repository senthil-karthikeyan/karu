export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export class ApiError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string = "UNKNOWN_ERROR", statusCode: number = 500) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

const TOKEN_KEY = "karu_access_token";
const REFRESH_TOKEN_KEY = "karu_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(accessToken)}; path=/; max-age=604800; SameSite=Lax`;
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    throw new ApiError("No refresh token available", "AUTH_REQUIRED", 401);
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const payload: ApiResponse<{ accessToken: string; refreshToken: string }> =
    await response.json();

  if (!response.ok || !payload.success || !payload.data) {
    clearTokens();
    throw new ApiError(
      payload.error?.message || "Session expired. Please log in again.",
      payload.error?.code || "UNAUTHORIZED",
      response.status
    );
  }

  setTokens(payload.data.accessToken, payload.data.refreshToken);
  return payload.data.accessToken;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    throw new ApiError(errorMsg, "NETWORK_ERROR", 0);
  }

  // Handle 401 Unauthorized with token refresh (avoid infinite loop on auth endpoints)
  if (
    response.status === 401 &&
    !endpoint.includes("/auth/login") &&
    !endpoint.includes("/auth/register") &&
    !endpoint.includes("/auth/refresh")
  ) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newAccessToken = await refreshAccessToken();
        isRefreshing = false;
        processQueue(null);

        // Retry original request with new token
        headers.set("Authorization", `Bearer ${newAccessToken}`);
        const retryResponse = await fetch(url, { ...options, headers });
        const retryPayload: ApiResponse<T> = await retryResponse.json();

        if (!retryResponse.ok || !retryPayload.success) {
          throw new ApiError(
            retryPayload.error?.message || "Request failed",
            retryPayload.error?.code || "REQUEST_FAILED",
            retryResponse.status
          );
        }

        return retryPayload.data as T;
      } catch (refreshErr) {
        isRefreshing = false;
        processQueue(refreshErr instanceof Error ? refreshErr : new Error("Refresh failed"));
        clearTokens();
        throw refreshErr;
      }
    }

    // Wait for in-flight refresh to complete
    return new Promise<T>((resolve, reject) => {
      failedQueue.push({
        resolve: () => {
          const latestToken = getAccessToken();
          headers.set("Authorization", `Bearer ${latestToken}`);
          fetch(url, { ...options, headers })
            .then(async (res) => {
              const data: ApiResponse<T> = await res.json();
              if (!res.ok || !data.success) {
                reject(
                  new ApiError(
                    data.error?.message || "Request failed",
                    data.error?.code || "REQUEST_FAILED",
                    res.status
                  )
                );
              } else {
                resolve(data.data as T);
              }
            })
            .catch(reject);
        },
        reject,
      });
    });
  }

  let payload: ApiResponse<T>;
  try {
    payload = await response.json();
  } catch {
    if (!response.ok) {
      throw new ApiError("Server returned non-JSON error", "SERVER_ERROR", response.status);
    }
    return {} as T;
  }

  if (!response.ok || !payload.success) {
    throw new ApiError(
      payload.error?.message || "Request failed",
      payload.error?.code || "REQUEST_FAILED",
      response.status
    );
  }

  return payload.data as T;
}
