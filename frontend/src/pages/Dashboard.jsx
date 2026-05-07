import { useEffect, useState } from "react"
import {
  BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell
} from "recharts"
import { api } from "../api"

export default function Dashboard() {
  const [data,    setData]    = useState(null)
  const [sites,   setSites]   = useState([])
  const [tasks,   setTasks]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.dashboardSummary(),
      api.sitesRecommend(),
      api.priorityTasks(),
    ])
      .then(([d, s, t]) => {
        setData(d)
        setSites(s?.recommendations || [])
        setTasks(t)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{
      height:"100%", display:"flex", alignItems:"center",
      justifyContent:"center", background:"#0f1117",
      color:"#6b7280", fontSize:"13px", flexDirection:"column", gap:"12px",
    }}>
      <div style={{ fontSize:"24px" }}>⚡</div>
      Loading dashboard…
    </div>
  )

  if (!data) return (
    <div style={{
      height:"100%", display:"flex", alignItems:"center",
      justifyContent:"center", background:"#0f1117",
      color:"#ef4444", fontSize:"13px",
    }}>
      Failed to load. Is the backend running on port 8000?
    </div>
  )

  // KPI cards config
  const kpis = [
    {
      label: "Sessions (90d)",
      value: data.total_sessions_30d?.toLocaleString(),
      sub:   "real charging events",
      color: "#60a5fa",
    },
    {
      label: "Total energy",
      value: `${Math.round(data.total_kwh_30d / 1000)}k kWh`,
      sub:   "consumed",
      color: "#a78bfa",
    },
    {
      label: "Coverage",
      value: `${data.coverage_pct}%`,
      sub:   "zones with station",
      color: "#f59e0b",
    },
    {
      label: "Peak load reduction",
      value: `${data.peak_load_reduction_pct}%`,
      sub:   "if recs applied",
      color: "#22c55e",
    },
    {
      label: "Rural taluks",
      value: data.rural_taluks_flagged,
      sub:   "need infrastructure",
      color: "#fb923c",
    },
    {
      label: "CO₂ offset",
      value: `${(data.co2_saved_kg / 1000).toFixed(1)}t`,
      sub:   "vs petrol equiv.",
      color: "#34d399",
    },
  ]

  const BAR_COLORS = ["#3b82f6","#6366f1","#8b5cf6","#a855f7","#ec4899"]

  // Priority task summary from API
  const taskSummary = tasks?.summary || { high:0, medium:0, low:0, total_est_cost_L:0 }

  // Export CSV
  function exportCSV() {
    const rows = [
      ["Metric","Value"],
      ["Total sessions (90d)", data.total_sessions_30d],
      ["Total kWh",            data.total_kwh_30d],
      ["Coverage %",           data.coverage_pct],
      ["Peak load reduction %",data.peak_load_reduction_pct],
      ["Rural taluks flagged", data.rural_taluks_flagged],
      ["CO2 offset (kg)",      data.co2_saved_kg],
      [],
      ["Top Zone","Sessions","kWh"],
      ...(data.top_zones || []).map(z => [z.zone_name, z.sessions, z.kwh]),
      [],
      ["Rank","Zone","Score %","Charger Type","Stations Needed"],
      ...sites.slice(0,10).map(r => [
        r.rank, r.zone_name,
        (r.composite_score*100).toFixed(0),
        r.charger_type_rec,
        r.estimated_stations_needed,
      ]),
    ]
    const csv  = rows.map(r => r.join(",")).join("\n")
    const blob = new Blob([csv], { type:"text/csv" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url; a.download = "ev-netra-dashboard.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{
      height:"100%", overflowY:"auto",
      padding:"24px", background:"#0f1117",
    }}>
      <div style={{ maxWidth:"1100px", margin:"0 auto" }}>

        {/* Title */}
        <div style={{ marginBottom:"24px" }}>
          <h1 style={{ fontSize:"18px", fontWeight:600, color:"#fff", margin:"0 0 4px" }}>
            BESCOM Planner Dashboard
          </h1>
          <p style={{ fontSize:"12px", color:"#6b7280", margin:0 }}>
            EV-Netra intelligence · Synthetic data (OCM-anchored) · 90-day window
          </p>
        </div>

        {/* KPI cards */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",
          gap:"12px", marginBottom:"24px",
        }}>
          {kpis.map(k => (
            <div key={k.label} style={{
              background:"#1a1d27",
              border:"1px solid #2a2d3a",
              borderRadius:"10px", padding:"16px",
            }}>
              <div style={{ fontSize:"11px", color:"#6b7280", marginBottom:"6px", fontWeight:500 }}>
                {k.label}
              </div>
              <div style={{ fontSize:"24px", fontWeight:700, color:k.color, lineHeight:1 }}>
                {k.value}
              </div>
              <div style={{ fontSize:"11px", color:"#4b5563", marginTop:"4px" }}>
                {k.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"1fr 1fr",
          gap:"16px", marginBottom:"24px",
        }}>

          {/* Top zones bar chart */}
          <div style={{
            background:"#1a1d27", border:"1px solid #2a2d3a",
            borderRadius:"10px", padding:"16px",
          }}>
            <div style={{ fontSize:"13px", fontWeight:500, color:"#e2e8f0", marginBottom:"16px" }}>
              Top zones by sessions
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={data.top_zones || []}
                layout="vertical"
                margin={{ left:0, right:16 }}
              >
                <XAxis
                  type="number"
                  tick={{ fill:"#6b7280", fontSize:11 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  type="category" dataKey="zone_name"
                  tick={{ fill:"#9ca3af", fontSize:11 }}
                  width={110} axisLine={false} tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background:"#1a1d27", border:"1px solid #2a2d3a",
                    borderRadius:"8px", fontSize:"12px",
                  }}
                  labelStyle={{ color:"#e2e8f0" }}
                  itemStyle={{ color:"#9ca3af" }}
                />
                <Bar dataKey="sessions" radius={[0,4,4,0]}>
                  {(data.top_zones || []).map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Coverage gap summary */}
          <div style={{
            background:"#1a1d27", border:"1px solid #2a2d3a",
            borderRadius:"10px", padding:"16px",
          }}>
            <div style={{ fontSize:"13px", fontWeight:500, color:"#e2e8f0", marginBottom:"16px" }}>
              Coverage gap summary
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              {[
                { label:"Hex zones analysed",      value: data.total_hex_zones,              color:"#60a5fa" },
                { label:"Real stations deployed",  value: data.stations_deployed,            color:"#22c55e" },
                { label:"Avg kWh per session",     value: `${data.avg_kwh_per_session} kWh`, color:"#a78bfa" },
                { label:"High-growth rural zones", value: data.rural_taluks_flagged,         color:"#fb923c" },
                { label:"Gaps identified",         value: sites.length,                      color:"#f59e0b" },
                {
                  label:"Est. total investment",
                  value: `₹${taskSummary.total_est_cost_L || 0}L`,
                  color:"#34d399",
                },
              ].map(r => (
                <div key={r.label} style={{
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                }}>
                  <span style={{ fontSize:"12px", color:"#9ca3af" }}>{r.label}</span>
                  <span style={{ fontSize:"14px", fontWeight:600, color:r.color }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Priority task summary cards */}
        {tasks && (
          <div style={{ marginBottom:"24px" }}>
            <div style={{ fontSize:"13px", fontWeight:500, color:"#e2e8f0", marginBottom:"12px" }}>
              Priority task overview
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:"10px" }}>
              {[
                { label:"High priority", value:taskSummary.high,   color:"#ef4444", bg:"#1e0a0a", border:"#4a1a1a" },
                { label:"Medium priority",value:taskSummary.medium, color:"#f59e0b", bg:"#1c1505", border:"#3a2a00" },
                { label:"Low priority",  value:taskSummary.low,    color:"#22c55e", bg:"#0f2a1a", border:"#1a4a2a" },
                {
                  label:"Total est. cost",
                  value:`₹${taskSummary.total_est_cost_L}L`,
                  color:"#a78bfa", bg:"#12093a", border:"#2e1a6e",
                },
              ].map(p => (
                <div key={p.label} style={{
                  background:p.bg, border:`1px solid ${p.border}`,
                  borderRadius:"10px", padding:"14px",
                  textAlign:"center",
                }}>
                  <div style={{ fontSize:"26px", fontWeight:700, color:p.color, lineHeight:1 }}>
                    {p.value}
                  </div>
                  <div style={{ fontSize:"11px", color:"#6b7280", marginTop:"6px" }}>
                    {p.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top recommended sites — live from API */}
        <div style={{
          background:"#1a1d27", border:"1px solid #2a2d3a",
          borderRadius:"10px", padding:"16px", marginBottom:"24px",
        }}>
          <div style={{
            display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:"14px",
          }}>
            <div style={{ fontSize:"13px", fontWeight:500, color:"#e2e8f0" }}>
              Top recommended sites — live data
            </div>
            <button
              onClick={exportCSV}
              style={{
                padding:"6px 14px", borderRadius:"6px",
                border:"1px solid #2a2d3a", background:"transparent",
                color:"#9ca3af", fontSize:"12px", cursor:"pointer",
              }}
            >
              ⬇ Export CSV
            </button>
          </div>

          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
              <thead>
                <tr style={{ borderBottom:"1px solid #2a2d3a" }}>
                  {["Rank","Zone","Score","Type","Est. Cost","Stations needed"].map(h => (
                    <th key={h} style={{
                      textAlign:"left", padding:"8px 10px",
                      color:"#6b7280", fontWeight:500, fontSize:"11px",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sites.slice(0, 10).map(rec => {
                  const pct   = Math.round(rec.composite_score * 100)
                  const color = rec.composite_score > 0.6 ? "#ef4444"
                              : rec.composite_score > 0.4 ? "#f59e0b"
                              : "#22c55e"
                  const cost  = rec.composite_score > 0.6 ? 45
                              : rec.composite_score > 0.4 ? 30 : 15
                  return (
                    <tr key={rec.hex_id} style={{ borderBottom:"1px solid #1a1d27" }}>
                      <td style={{ padding:"10px", color:"#6b7280" }}>#{rec.rank}</td>
                      <td style={{ padding:"10px", color:"#e2e8f0", fontWeight:500 }}>
                        {rec.zone_name}
                      </td>
                      <td style={{ padding:"10px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                          <div style={{
                            width:"40px", height:"4px",
                            background:"#2a2d3a", borderRadius:"2px", overflow:"hidden",
                          }}>
                            <div style={{
                              width:`${pct}%`, height:"100%",
                              background:color, borderRadius:"2px",
                            }}/>
                          </div>
                          <span style={{ color:"#9ca3af" }}>{pct}%</span>
                        </div>
                      </td>
                      <td style={{ padding:"10px", color:"#9ca3af" }}>
                        {rec.charger_type_rec === "fast_dc" ? "⚡ Fast DC" : "🔌 Slow AC"}
                      </td>
                      <td style={{ padding:"10px", color:"#a78bfa" }}>₹{cost}L</td>
                      <td style={{ padding:"10px" }}>
                        <span style={{
                          padding:"2px 8px", borderRadius:"20px", fontSize:"11px",
                          background: rec.estimated_stations_needed > 1 ? "#3b1f1f" : "#14532d",
                          color:      rec.estimated_stations_needed > 1 ? "#f87171" : "#22c55e",
                        }}>
                          {rec.estimated_stations_needed} needed
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {sites.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding:"20px", textAlign:"center", color:"#6b7280" }}>
                      No recommendations loaded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}