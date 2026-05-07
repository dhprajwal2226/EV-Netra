const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000"

async function withFallback(fetchFn, cacheKey) {
  try {
    return await fetchFn()
  } catch (err) {
    console.warn(`API failed for ${cacheKey} — trying demo cache`)
    try {
      const cache = await fetch("/demo_cache.json").then(r => r.json())
      const val   = cache[cacheKey]
      return val !== undefined ? val : []
    } catch {
      return []
    }
  }
}

function safeFetch(url, opts) {
  return fetch(url, opts).then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
}

export const api = {
  health: () => fetch(`${BASE}/api/health`).then(r => r.json()),

  hexDemand: (hour = 18) => withFallback(
    () => safeFetch(`${BASE}/api/hex-demand?hour=${hour}`),
    "hexDemand"
  ),

  forecast: (hexId) => withFallback(
    () => safeFetch(`${BASE}/api/forecast/${hexId}`),
    "forecast"
  ),

  schedule: (hexId) => withFallback(
    () => safeFetch(`${BASE}/api/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hex_id: hexId }),
    }),
    "schedule"
  ),

  sitesRecommend: () => withFallback(
    () => safeFetch(`${BASE}/api/sites/recommend`),
    "sitesRecommend"
  ),

  sitesRural: () => withFallback(
    () => safeFetch(`${BASE}/api/sites/rural`),
    "sitesRural"
  ),

  xai: (hexId) => withFallback(
    () => safeFetch(`${BASE}/api/xai/${hexId}`),
    "xai"
  ),

  dashboardSummary: () => withFallback(
    () => safeFetch(`${BASE}/api/dashboard/summary`),
    "dashboardSummary"
  ),

  gridLoad: () => withFallback(
    () => safeFetch(`${BASE}/api/grid/load`),
    "gridLoad"
  ),

  priorities: () => withFallback(
    () => safeFetch(`${BASE}/api/priorities`),
    "priorities"
  ),

  priorityTasks: () => withFallback(
    () => safeFetch(`${BASE}/api/priority-tasks`),
    "priorityTasks"
  ),
  hexGrid:        () => withFallback(() => fetch(`${BASE}/api/hex-grid`).then(r => r.json()), "hexGrid"),
stateDistricts: () => withFallback(() => fetch(`${BASE}/api/state/districts`).then(r => r.json()), "stateDistricts"),
statsHourly:    () => withFallback(() => fetch(`${BASE}/api/stats/hourly`).then(r => r.json()), "statsHourly"),
}