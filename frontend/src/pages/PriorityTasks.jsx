import { useEffect, useState } from "react"
import { api } from "../api"

const PRIORITY_CONFIG = {
  high:   { color:"#ef4444", bg:"#1e0a0a", border:"#4a1a1a", badge:"#ef4444", label:"HIGH" },
  medium: { color:"#f59e0b", bg:"#1c1505", border:"#3a2a00", badge:"#f59e0b", label:"MED" },
  low:    { color:"#22c55e", bg:"#0f2a1a", border:"#1a4a2a", badge:"#22c55e", label:"LOW" },
}

const TYPE_ICONS = {
  new_hub:    "🏗",
  congestion: "⚡",
  upgrade:    "🔧",
  rural_gap:  "🌾",
  incentive:  "💰",
}

const TYPE_LABELS = {
  new_hub:    "New EV Hub",
  congestion: "Grid Stress",
  upgrade:    "Upgrade",
  rural_gap:  "Rural Gap",
  incentive:  "Incentive",
}

export default function PriorityTasks() {
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState("all")
  const [selected, setSelected] = useState(null)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    api.priorityTasks()
      .then(d => {
        console.log("PriorityTasks GOT DATA:", d)
        // Handle case where fallback returns [] instead of {summary, tasks}
        if (Array.isArray(d)) {
          setError("Received array instead of task object — API fallback triggered")
          setLoading(false)
          return
        }
        setData(d)
        setLoading(false)
      })
      .catch(e => {
        console.error("PriorityTasks ERROR:", e)
        setError(String(e))
        setLoading(false)
      })
  }, [])

  const tasks    = data?.tasks || []
  const filtered = filter === "all"
    ? tasks
    : tasks.filter(t => t.priority === filter)

  return (
    <div style={{
      height:"100%", display:"flex",
      background:"#0f1117", overflow:"hidden",
    }}>

      {/* ── Left: task list ─────────────────────────────────────── */}
      <div style={{
        width:    selected ? "420px" : "100%",
        maxWidth: selected ? "420px" : "900px",
        margin:   selected ? "0" : "0 auto",
        display:"flex", flexDirection:"column",
        borderRight: selected ? "1px solid #2a2d3a" : "none",
        transition:"width 0.2s",
      }}>

        {/* Header */}
        <div style={{
          padding:"20px 24px 16px",
          borderBottom:"1px solid #2a2d3a", flexShrink:0,
        }}>
          <h1 style={{ fontSize:"18px", fontWeight:600, color:"#fff", margin:"0 0 4px" }}>
            🚨 Priority Task Board
          </h1>
          <p style={{ fontSize:"12px", color:"#6b7280", margin:"0 0 14px" }}>
            Auto-generated from EV demand data · BESCOM action required
          </p>

          {/* Summary pills */}
          {data?.summary?.high !== undefined && (
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"14px" }}>
              {[
                { label:`${data.summary.high} High`,    color:"#ef4444", bg:"#1e0a0a" },
                { label:`${data.summary.medium} Medium`, color:"#f59e0b", bg:"#1c1505" },
                { label:`${data.summary.low} Low`,      color:"#22c55e", bg:"#0f2a1a" },
                { label:`₹${data.summary.total_est_cost_L}L total est.`, color:"#a78bfa", bg:"#12093a" },
              ].map(p => (
                <span key={p.label} style={{
                  fontSize:"12px", padding:"4px 10px", borderRadius:"20px",
                  background:p.bg, color:p.color, fontWeight:500,
                }}>{p.label}</span>
              ))}
            </div>
          )}

          {/* Filter tabs */}
          <div style={{ display:"flex", gap:"6px" }}>
            {["all","high","medium","low"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding:"5px 14px", borderRadius:"6px",
                border:"1px solid",
                borderColor: filter===f ? "#2563eb" : "#2a2d3a",
                background:  filter===f ? "#1e3a5f" : "transparent",
                color:       filter===f ? "#60a5fa" : "#6b7280",
                fontSize:"12px", cursor:"pointer",
                fontWeight: filter===f ? 500 : 400,
                textTransform:"capitalize",
              }}>
                {f === "all"
                  ? `All (${tasks.length})`
                  : `${f} (${tasks.filter(t => t.priority === f).length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Task list */}
        <div style={{ flex:1, overflowY:"auto", padding:"12px 16px" }}>

          {loading && (
            <div style={{ color:"#6b7280", textAlign:"center", paddingTop:"40px" }}>
              Generating priority tasks…
            </div>
          )}

          {!loading && error && (
            <div style={{
              color:"#ef4444", background:"#1e0a0a", border:"1px solid #4a1a1a",
              borderRadius:"8px", padding:"12px 16px", fontSize:"12px", marginTop:"12px",
            }}>
              ⚠️ {error}
            </div>
          )}

          {!loading && !error && filtered.map((task, idx) => {
            const cfg        = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low
            const isSelected = selected?.id === task.id
            return (
              <div
                key={`${task.hex_id}-${idx}`}
                onClick={() => setSelected(isSelected ? null : task)}
                style={{
                  padding:"12px 14px", borderRadius:"10px",
                  border:`1px solid ${isSelected ? cfg.color : cfg.border}`,
                  background: isSelected ? cfg.bg : "#1a1d27",
                  marginBottom:"8px", cursor:"pointer",
                  transition:"all 0.15s",
                }}
              >
                {/* Top row */}
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px" }}>
                  <span style={{ fontSize:"16px" }}>{TYPE_ICONS[task.type] || "📋"}</span>
                  <span style={{
                    fontSize:"10px", padding:"2px 7px", borderRadius:"20px",
                    background:cfg.bg, color:cfg.color,
                    border:`1px solid ${cfg.border}`, fontWeight:700,
                  }}>{cfg.label}</span>
                  <span style={{
                    fontSize:"10px", padding:"2px 7px", borderRadius:"20px",
                    background:"#1a1d27", color:"#6b7280",
                    border:"1px solid #2a2d3a",
                  }}>{TYPE_LABELS[task.type] || task.type}</span>
                  <span style={{ marginLeft:"auto", fontSize:"11px", color:"#6b7280" }}>
                    #{task.id}
                  </span>
                </div>

                {/* Title */}
                <div style={{ fontSize:"13px", fontWeight:500, color:"#e2e8f0", marginBottom:"4px" }}>
                  {task.title}
                </div>

                {/* Description */}
                <div style={{ fontSize:"11px", color:"#9ca3af", lineHeight:1.6, marginBottom:"8px" }}>
                  {task.description}
                </div>

                {/* Bottom chips */}
                <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                  {task.sessions > 0 && (
                    <Chip label={`${task.sessions} sessions`} color="#1e3a5f" text="#60a5fa" />
                  )}
                  <Chip
                    label={task.est_cost_L === 0 ? "₹0 cost" : `₹${task.est_cost_L}L est.`}
                    color={task.est_cost_L === 0 ? "#14532d" : "#12093a"}
                    text={task.est_cost_L  === 0 ? "#22c55e" : "#a78bfa"}
                  />
                  <Chip label={task.charger_rec} color="#1a1d27" text="#6b7280" />
                </div>
              </div>
            )
          })}

          {!loading && !error && filtered.length === 0 && (
            <div style={{ color:"#6b7280", textAlign:"center", paddingTop:"40px", fontSize:"13px" }}>
              No {filter} priority tasks found.
            </div>
          )}
        </div>
      </div>

      {/* ── Right: task detail panel ────────────────────────────── */}
      {selected && (
        <div style={{ flex:1, overflowY:"auto", padding:"24px", background:"#0f1117" }}>
          {(() => {
            const cfg = PRIORITY_CONFIG[selected.priority] || PRIORITY_CONFIG.low
            return (
              <div>
                <button
                  onClick={() => setSelected(null)}
                  style={{
                    background:"none", border:"none", color:"#6b7280",
                    cursor:"pointer", fontSize:"12px", marginBottom:"16px", padding:0,
                  }}
                >← Back to list</button>

                {/* Priority banner */}
                <div style={{
                  padding:"14px 16px", borderRadius:"10px",
                  background:cfg.bg, border:`2px solid ${cfg.color}`,
                  marginBottom:"16px",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                    <span style={{ fontSize:"24px" }}>{TYPE_ICONS[selected.type] || "📋"}</span>
                    <div>
                      <div style={{ fontSize:"10px", color:cfg.color, fontWeight:700, marginBottom:"2px" }}>
                        {cfg.label} PRIORITY
                      </div>
                      <div style={{ fontSize:"15px", fontWeight:600, color:"#fff" }}>
                        {selected.title}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detail rows */}
                {[
                  { label:"Zone",            value: selected.zone },
                  { label:"Action required", value: selected.action },
                  { label:"Recommended",     value: selected.charger_rec },
                  { label:"Est. cost",       value: selected.est_cost_L === 0 ? "₹0 (policy change)" : `₹${selected.est_cost_L} Lakhs` },
                  { label:"Impact",          value: selected.impact },
                ].map(row => (
                  <div key={row.label} style={{
                    display:"flex", gap:"12px", padding:"10px 0",
                    borderBottom:"1px solid #1a1d27",
                  }}>
                    <div style={{ width:"130px", fontSize:"12px", color:"#6b7280", flexShrink:0 }}>
                      {row.label}
                    </div>
                    <div style={{ fontSize:"12px", color:"#e2e8f0", fontWeight:500 }}>
                      {row.value}
                    </div>
                  </div>
                ))}

                {/* Full description */}
                <div style={{
                  marginTop:"16px", padding:"14px",
                  background:"#1a1d27", borderRadius:"8px",
                  border:"1px solid #2a2d3a",
                }}>
                  <div style={{ fontSize:"11px", color:"#6b7280", marginBottom:"6px", fontWeight:500 }}>
                    FULL ANALYSIS
                  </div>
                  <div style={{ fontSize:"13px", color:"#9ca3af", lineHeight:1.7 }}>
                    {selected.description}
                  </div>
                </div>

                {/* H3 cell ID */}
                <div style={{
                  marginTop:"12px", fontSize:"11px",
                  color:"#3a3d52", fontFamily:"monospace",
                }}>
                  H3 Cell: {selected.hex_id}
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

function Chip({ label, color, text }) {
  return (
    <span style={{
      fontSize:"10px", padding:"2px 8px", borderRadius:"20px",
      background:color, color:text, fontWeight:500,
    }}>{label}</span>
  )
}