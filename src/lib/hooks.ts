"use client";

// Simple fetcher hook
import { useState, useEffect, useCallback } from "react";

export function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!url) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, refreshKey]);

  return { data, loading, error, refresh };
}

export async function apiPost(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur");
  return data;
}

export async function apiPatch(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur");
  return data;
}

export async function apiPut(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur");
  return data;
}

export async function apiDelete(url: string) {
  const res = await fetch(url, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur");
  return data;
}

export function formatDate(d: string | Date, locale: string = "fr") {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(locale === "ar" ? "ar-MA" : "fr-FR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShort(d: string | Date, locale: string = "fr") {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(locale === "ar" ? "ar-MA" : "fr-FR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Live "system date" ticker. Returns null during SSR/first render, then the
 * current Date, refreshed every `intervalMs`. Used for current-session detection.
 */
export function useNow(intervalMs: number = 30_000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const t0 = setTimeout(() => setNow(new Date()), 0);
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => {
      clearTimeout(t0);
      clearInterval(timer);
    };
  }, [intervalMs]);
  return now;
}
