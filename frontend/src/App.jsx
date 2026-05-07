import { BrowserRouter, Routes, Route, NavLink, useNavigate } from "react-router-dom"
import { useState, useEffect, useRef } from "react"
import HexMap        from "./pages/HexMap"
import SiteRecommend from "./pages/SiteRecommend"
import Dashboard     from "./pages/Dashboard"
import PriorityTasks from "./pages/PriorityTasks"
import CostEstimator from "./pages/CostEstimator"
import "leaflet/dist/leaflet.css"
import "./index.css"

const navStyle = ({ isActive }) => ({
  padding:        "6px 14px",
  borderRadius:   "6px",
  textDecoration: "none",
  fontSize:       "13px",
  fontWeight:     isActive ? 600 : 400,
  background:     isActive ? "#2563eb" : "transparent",
  color:          isActive ? "#fff"    : "#9ca3af",
  transition:     "all 0.15s",
  whiteSpace:     "nowrap",
})

// Demo steps: route + label + duration
const DEMO_STEPS = [
  { path: "/",         label: "📍 Live demand heatmap — 6PM Bengaluru peak hour",     duration: 6000 },
  { path: "/sites",    label: "🏗 AI site recommendations — 15 underserved zones",     duration: 5000 },
  { path: "/tasks",    label: "🚨 Priority task board — BESCOM action items",          duration: 5000 },
  { path: "/dashboard",label: "📊 BESCOM KPI dashboard — 12k sessions, 309k kWh",     duration: 6000 },
]

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}

// Inner component so useNavigate works inside BrowserRouter
function AppInner() {
  const navigate = useNavigate()
  const [backendOk, setBackendOk] = useState(null)
  const [demoMode,  setDemoMode]  = useState(false)
  const [demoStep,  setDemoStep]  = useState(0)
  const timerRef = useRef(null)

  // Health check
  useEffect(() => {
    fetch((import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/health")
      .then(r => r.json())
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false))
  }, [])

  // Demo mode — auto-navigate through pages
  useEffect(() => {
    if (!demoMode) {
      clearTimeout(timerRef.current)
      return
    }

    const step = DEMO_STEPS[demoStep]
    navigate(step.path)

    timerRef.current = setTimeout(() => {
      const next = (demoStep + 1) % DEMO_STEPS.length
      setDemoStep(next)
    }, step.duration)

    return () => clearTimeout(timerRef.current)
  }, [demoMode, demoStep])

  function toggleDemo() {
    if (demoMode) {
      // Stop demo
      clearTimeout(timerRef.current)
      setDemoMode(false)
      setDemoStep(0)
    } else {
      // Start demo from step 0
      setDemoStep(0)
      setDemoMode(true)
    }
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh", overflow: "hidden", background: "#0f1117",
    }}>

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav style={{
        display: "flex", alignItems: "center", gap: "4px",
        padding: "0 16px", height: "48px",
        background: "#1a1d27", borderBottom: "1px solid #2a2d3a",
        flexShrink: 0, overflowX: "auto",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "12px", flexShrink: 0 }}>
          <span style={{ fontSize: "18px" }}>⚡</span>
          <span style={{ fontSize: "15px", fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>
            EV-Netra
          </span>
          <span style={{
            fontSize: "10px", padding: "2px 7px", borderRadius: "20px",
            background: "#1e3a5f", color: "#60a5fa", fontWeight: 500,
          }}>BESCOM</span>
        </div>

        {/* Nav links */}
        <NavLink to="/"          style={navStyle}>🗺 Hex Map</NavLink>
        <NavLink to="/sites"     style={navStyle}>📍 Site Planning</NavLink>
        <NavLink to="/tasks"     style={navStyle}>🚨 Priority Tasks</NavLink>
        <NavLink to="/dashboard" style={navStyle}>📊 Dashboard</NavLink>
        <NavLink to="/costs" style={navStyle}>💰 Cost Estimator</NavLink>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>

          {/* Demo mode button */}
          <button onClick={toggleDemo} style={{
            padding: "5px 14px", borderRadius: "6px", fontSize: "12px",
            border: demoMode ? "1px solid #7c3aed" : "1px solid #2a2d3a",
            background: demoMode ? "#4c1d95" : "transparent",
            color: demoMode ? "#c4b5fd" : "#6b7280",
            cursor: "pointer", fontWeight: demoMode ? 600 : 400,
            transition: "all 0.2s",
          }}>
            {demoMode ? "⏹ Stop Demo" : "▶ Demo Mode"}
          </button>

          {/* Backend status dot */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: backendOk === null ? "#f59e0b" : backendOk ? "#22c55e" : "#ef4444",
              boxShadow: backendOk ? "0 0 6px #22c55e" : "none",
            }} />
            <span style={{ fontSize: "11px", color: "#6b7280" }}>
              {backendOk === null ? "Connecting…" : backendOk ? "Live — Real OCM data" : "Backend offline"}
            </span>
          </div>
        </div>
      </nav>

      {/* ── Demo label bar ─────────────────────────────────────────── */}
      {demoMode && (
        <div style={{
          height: "34px", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center", gap: "14px",
          background: "linear-gradient(90deg, #4c1d95, #1e3a5f)",
          fontSize: "12px", color: "#e2e8f0", fontWeight: 500,
        }}>
          <span style={{ opacity: 0.6, fontSize: "10px", letterSpacing: "1px" }}>DEMO</span>
          <span>{DEMO_STEPS[demoStep]?.label}</span>

          {/* Step dots */}
          <div style={{ display: "flex", gap: "5px" }}>
            {DEMO_STEPS.map((_, i) => (
              <div
                key={i}
                onClick={() => setDemoStep(i)}
                style={{
                  width: i === demoStep ? "20px" : "6px",
                  height: "6px", borderRadius: "3px",
                  background: i === demoStep ? "#c4b5fd" : "rgba(255,255,255,0.25)",
                  cursor: "pointer", transition: "all 0.3s",
                }}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div style={{
            position: "absolute", bottom: 0, left: 0,
            height: "2px", background: "#7c3aed",
            animation: `progress ${DEMO_STEPS[demoStep]?.duration}ms linear`,
            width: "100%",
          }} />
        </div>
      )}

      {/* ── Offline banner ─────────────────────────────────────────── */}
      {backendOk === false && (
        <div style={{
          background: "#1e0a0a", borderBottom: "1px solid #4a1a1a",
          padding: "8px 20px", fontSize: "12px", color: "#f87171", flexShrink: 0,
        }}>
          ⚠ Backend offline — run{" "}
          <code style={{ background: "#2a0a0a", padding: "1px 6px", borderRadius: "4px", fontFamily: "monospace" }}>
            cd backend && uvicorn main:app --reload --port 8000
          </code>
        </div>
      )}

      {/* ── Pages ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <Routes>
          <Route path="/"          element={<HexMap />} />
          <Route path="/sites"     element={<SiteRecommend />} />
          <Route path="/tasks"     element={<PriorityTasks />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/costs" element={<CostEstimator />} />
          <Route path="*"          element={<NotFound />} />
        </Routes>
      </div>

      <style>{`
        @keyframes progress {
          from { width: 0% }
          to   { width: 100% }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #1a1d27; }
        ::-webkit-scrollbar-thumb { background: #3a3d52; border-radius: 3px; }
      `}</style>
    </div>
  )
}

function NotFound() {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "100%", color: "#6b7280", gap: "12px",
    }}>
      <div style={{ fontSize: "48px" }}>⚡</div>
      <div style={{ fontSize: "16px", color: "#e2e8f0" }}>Page not found</div>
      <a href="/" style={{ fontSize: "13px", color: "#60a5fa" }}>← Back to Hex Map</a>
    </div>
  )
}