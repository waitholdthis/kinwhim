import * as Notifications from "expo-notifications";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { api, errorMessage } from "@/lib/api";
import { setBadge } from "@/lib/push";
import type { Dashboard } from "@/lib/types";

type DashboardState = {
  data: Dashboard | null;
  loading: boolean;
  error: string | null;
  circleId: string | null;
  selectCircle: (circleId: string) => Promise<void>;
  refresh: () => Promise<Dashboard | null>;
};

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const circleRef = useRef<string | null>(null);

  // State is only set in promise callbacks so effects can call this safely.
  const load = useCallback(
    (circleId: string | null) =>
      api<Dashboard>(`/api/dashboard${circleId ? `?circle=${encodeURIComponent(circleId)}` : ""}`).then(
        (next) => {
          circleRef.current = next.circle?.id ?? null;
          setData(next);
          setError(null);
          setLoading(false);
          void setBadge(next.badgeCount);
          return next;
        },
        (caught: unknown) => {
          setError(errorMessage(caught, "Kinwhim could not wake up."));
          setLoading(false);
          return null;
        },
      ),
    [],
  );

  const refresh = useCallback(() => load(circleRef.current), [load]);
  const selectCircle = useCallback(async (circleId: string) => {
    circleRef.current = circleId;
    await load(circleId);
  }, [load]);

  useEffect(() => {
    void load(null);
    // Catch up whenever the app returns to the foreground or a memory arrives.
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void load(circleRef.current);
    });
    const received = Notifications.addNotificationReceivedListener(() => void load(circleRef.current));
    return () => {
      appState.remove();
      received.remove();
    };
  }, [load]);

  const value = useMemo(
    () => ({ data, loading, error, circleId: data?.circle?.id ?? null, selectCircle, refresh }),
    [data, loading, error, selectCircle, refresh],
  );
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const value = useContext(DashboardContext);
  if (!value) throw new Error("useDashboard must be inside DashboardProvider");
  return value;
}
