import Constants from "expo-constants";
import { Platform } from "react-native";

export const API_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "https://kinwhim.app";

export const platform = Platform.OS === "android" ? "android" : "ios";

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

let currentToken: string | null = null;
let onSignedOut: (() => void) | null = null;

export function setApiToken(token: string | null) {
  currentToken = token;
}

export function onUnauthorized(handler: () => void) {
  onSignedOut = handler;
}

export function authHeaders(): Record<string, string> {
  return currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
}

export function absoluteUrl(path: string) {
  return path.startsWith("http") ? path : `${API_URL}${path}`;
}

export async function api<T = Record<string, unknown>>(
  path: string,
  init: { method?: string; body?: unknown; form?: FormData } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(absoluteUrl(path), {
      method: init.method ?? (init.body || init.form ? "POST" : "GET"),
      headers: {
        Accept: "application/json",
        ...(init.form ? {} : { "Content-Type": "application/json" }),
        ...authHeaders(),
      },
      body: init.form ?? (init.body === undefined ? undefined : JSON.stringify(init.body)),
    });
  } catch {
    throw new ApiError("Kinwhim can’t reach the internet right now.", 0, "offline");
  }
  const payload = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
  if (!response.ok) {
    if (response.status === 401 && currentToken) onSignedOut?.();
    throw new ApiError(payload.error || "Something went sideways.", response.status, payload.code);
  }
  return payload as T;
}

export function errorMessage(error: unknown, fallback = "Something went sideways.") {
  return error instanceof Error ? error.message : fallback;
}
