import { useEffect, useState } from "react"
import { api } from "../api"

const iconMap = {
  chart: "📈",
  grid:  "⚡",
  pin:   "📍",
  star:  "🌟",
}

const demandColors = {
  "Very high": "#ef4444",
  "High":      "#f59e0b",
  "Moderate":  "#3b82f6",
  "Low":       "#22c55e",
}

export default function XAIPanel({ hexId, onClose }) {
  const [data,     setData]     = useState(null)
  const [forecast, setForecast] = useState(null)
  const [schedule, setSchedule] = useState(null)
  const [tab,      setTab]      = useState("why")
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    if (!hexId) { setData(null); setForecast(null); setSchedule(null); return }
    setLoading(true)
    setError(null)
    setTab("why")

    Promise.all([
      api.xai(hexId),
      api.forecast(hexId),
      api.schedule(hexId),
    ]).then(([xai, fc, sc]) => {
      setData(xai)
      setForecast(fc)
      setSchedule(sc)
      setLoading(false)
    }).catch(e => {
      setError("Failed to load zone data.")
      setLoading(false)
    })
  }, [hexId])

  if (!hexId) return null

  const dColor = demandColors[data?.demand_level] || "#3b82f6"

  return (
    <div style={{
      width: "340px", flexShrink: 0,
      background: "#1a1d27",
      borderLeft: "1px solid #2a2d3a",
      display: "flex", flexDirection: "column",
      overflowY: "hidden",
    }}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{
        padding: "14px 16px 10px",
        borderBottom: "1px solid #2a2d3a",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "2px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            AI Analysis
          </div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>
            {data?.zone_name || (loading ? "Loading…" : "—")}
          </div>
          {data?.demand_level && (
            <span style={{
              display: "inline-block", marginTop: "5px",
              fontSize: "11px", padding: "3px 10px", borderRadius: "20px",
              background: dColor + "22",
              border: `1px solid ${dColor}44`,
              color: dColor, fontWeight: 600,
            }}>
              {data.demand_level} demand
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", color: "#6b7280",
            cursor: "pointer", fontSize: "20px", lineHeight: 1,
            padding: "2px 4px", borderRadius: "4px",
            transition: "color 0.15s",
          }}
          onMouseEnter={e => e.target.style.color = "#fff"}
          onMouseLeave={e => e.target.style.color = "#6b7280"}
        >×</button>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", borderBottom: "1px solid #2a2d3a", flexShrink: 0 }}>
        {[["why", "🔍 Why?"], ["forecast", "📈 Forecast"], ["schedule", "⚡ Schedule"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, padding: "9px 4px",
            background: "none", border: "none",
            borderBottom: tab === key ? "2px solid #2563eb" : "2px solid transparent",
            color: tab === key ? "#60a5fa" : "#6b7280",
            fontSize: "11px", fontWeight: tab === key ? 600 : 400,
            cursor: "pointer", transition: "color 0.15s",
          }}>{label}</button>
        ))}
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>

        {loading && (
          <div style={{ textAlign: "center", paddingTop: "40px" }}>
            <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "8px" }}>Analysing zone…</div>
            <div style={{ width: "24px", height: "24px", border: "2px solid #2a2d3a", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {error && !loading && (
          <div style={{ color: "#ef4444", fontSize: "13px", textAlign: "center", paddingTop: "24px" }}>
            {error}
          </div>
        )}

        {/* ── WHY TAB ─────────────────────────────────────────────── */}
        {!loading && !error && tab === "why" && data && (
          <div>
            {/* Demand score ring */}
            <div style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "12px", background: "#0f1117", borderRadius: "8px",
              border: "1px solid #2a2d3a", marginBottom: "12px",
            }}>
              <div style={{
                width: "52px", height: "52px", borderRadius: "50%", flexShrink: 0,
                background: `conic-gradient(${dColor} ${Math.round(data.demand_score * 360)}deg, #1e2130 0deg)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  width: "38px", height: "38px", borderRadius: "50%",
                  background: "#0f1117",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "13px", fontWeight: 700, color: dColor,
                }}>
                  {Math.round(data.demand_score * 100)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#9ca3af" }}>Demand score</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: dColor, marginTop: "2px" }}>
                  {data.demand_level}
                </div>
                <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>
                  Action: {data.action === "recommend_station" ? "🔴 Recommend station" : "🟡 Monitor"}
                </div>
              </div>
            </div>

            {/* Reason cards */}
            {(data.reasons || []).map((r, i) => (
              <div key={i} style={{
                marginBottom: "8px", padding: "12px",
                background: "#0f1117", borderRadius: "8px",
                border: "1px solid #2a2d3a",
              }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "5px" }}>
                  <span style={{ fontSize: "14px" }}>{iconMap[r.icon] || "📌"}</span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#e2e8f0" }}>{r.title}</span>
                </div>
                <p style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.6, margin: 0 }}>
                  {r.body}
                </p>
              </div>
            ))}

            {/* Verdict */}
            <div style={{
              padding: "12px", borderRadius: "8px", marginTop: "4px",
              background: dColor + "12",
              border: `1px solid ${dColor}33`,
            }}>
              <div style={{ fontSize: "10px", color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Verdict
              </div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: dColor }}>
                {data.verdict}
              </div>
            </div>

            {/* Hex ID */}
            <div style={{
              marginTop: "10px", padding: "8px 10px",
              background: "#0f1117", borderRadius: "6px",
              border: "1px solid #2a2d3a",
            }}>
              <div style={{ fontSize: "10px", color: "#4b5563", marginBottom: "2px", fontFamily: "monospace" }}>
                H3 CELL ID
              </div>
              <div style={{ fontSize: "11px", color: "#374151", fontFamily: "monospace", wordBreak: "break-all" }}>
                {hexId}
              </div>
            </div>
          </div>
        )}

        {/* ── FORECAST TAB ────────────────────────────────────────── */}
        {!loading && !error && tab === "forecast" && forecast && (
          <ForecastTab forecast={forecast} />
        )}

        {/* ── SCHEDULE TAB ────────────────────────────────────────── */}
        {!loading && !error && tab === "schedule" && schedule && (
          <ScheduleTab schedule={schedule} />
        )}

      </div>
    </div>
  )
}

// ── Forecast tab — bar chart + table ──────────────────────────────────────────
function ForecastTab({ forecast }) {
  const preds  = forecast.predictions || []
  const maxKwh = Math.max(...preds.map(p => p.predicted_kwh), 1)

  // Group into morning/afternoon/evening/night for summary
  const peakHours    = preds.filter(p => p.is_peak)
  const discountHours = preds.filter(p => p.off_peak_discount > 0)
  const peakTotal    = peakHours.reduce((s, p) => s + p.predicted_kwh, 0)
  const offTotal     = preds.filter(p => !p.is_peak).reduce((s, p) => s + p.predicted_kwh, 0)

  return (
    <div>
      <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "10px" }}>
        24-hour demand forecast · <span style={{ color: "#3b82f6" }}>{forecast.model}</span> model
      </div>

      {/* Summary pills */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
        <div style={{ flex: 1, padding: "8px", background: "#3b1f1f", borderRadius: "6px", textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#ef4444" }}>{Math.round(peakTotal)} kWh</div>
          <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "2px" }}>Peak demand</div>
        </div>
        <div style={{ flex: 1, padding: "8px", background: "#0f2a1a", borderRadius: "6px", textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#22c55e" }}>{Math.round(offTotal)} kWh</div>
          <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "2px" }}>Off-peak</div>
        </div>
        <div style={{ flex: 1, padding: "8px", background: "#1e1b4b", borderRadius: "6px", textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#818cf8" }}>{discountHours.length}h</div>
          <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "2px" }}>Discount hrs</div>
        </div>
      </div>

      {/* Bar chart */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "72px", marginBottom: "8px" }}>
        {preds.map(p => {
          const h   = Math.max(3, Math.round((p.predicted_kwh / maxKwh) * 68))
          const col = p.is_peak ? "#ef4444" : p.off_peak_discount > 0 ? "#22c55e" : "#3b82f6"
          return (
            <div
              key={p.hour}
              title={`${p.hour}:00 — ${p.predicted_kwh} kWh${p.off_peak_discount > 0 ? ` (-${p.off_peak_discount}%)` : ""}`}
              style={{
                flex: 1, height: `${h}px`, background: col,
                borderRadius: "2px 2px 0 0", cursor: "pointer",
                opacity: 0.85, transition: "opacity 0.1s",
              }}
              onMouseEnter={e => e.target.style.opacity = 1}
              onMouseLeave={e => e.target.style.opacity = 0.85}
            />
          )
        })}
      </div>

      {/* X-axis labels */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#4b5563", marginBottom: "12px" }}>
        <span>12AM</span><span>6AM</span><span>12PM</span><span>6PM</span><span>11PM</span>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "10px", fontSize: "10px", color: "#6b7280", marginBottom: "12px" }}>
        <span><span style={{ color: "#ef4444" }}>■</span> Peak hours</span>
        <span><span style={{ color: "#22c55e" }}>■</span> Off-peak discount</span>
        <span><span style={{ color: "#3b82f6" }}>■</span> Normal</span>
      </div>

      {/* Best discount windows */}
      <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px", fontWeight: 500 }}>
        Best charging windows
      </div>
      {discountHours.slice(0, 4).map(p => (
        <div key={p.hour} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "7px 10px", background: "#0f1117", borderRadius: "6px",
          border: "1px solid #2a2d3a", marginBottom: "4px",
        }}>
          <span style={{ fontSize: "12px", color: "#e2e8f0", fontWeight: 500 }}>
            {String(p.hour).padStart(2, "0")}:00 – {String((p.hour + 1) % 24).padStart(2, "0")}:00
          </span>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "#9ca3af" }}>{p.predicted_kwh} kWh</span>
            <span style={{
              fontSize: "10px", padding: "2px 6px", borderRadius: "10px",
              background: "#14532d", color: "#22c55e", fontWeight: 600,
            }}>
              -{p.off_peak_discount}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Schedule tab ──────────────────────────────────────────────────────────────
function ScheduleTab({ schedule }) {
  const windows = schedule.windows || []

  return (
    <div>
      {/* Peak reduction highlight */}
      <div style={{
        padding: "14px", borderRadius: "8px",
        background: "linear-gradient(135deg, #0f2a1a, #0f1117)",
        border: "1px solid #166534",
        marginBottom: "14px", textAlign: "center",
      }}>
        <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Potential peak reduction
        </div>
        <div style={{ fontSize: "36px", fontWeight: 800, color: "#22c55e", lineHeight: 1 }}>
          {schedule.potential_peak_reduction_pct}%
        </div>
        <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "6px", lineHeight: 1.5 }}>
          {/* ← FIXED: was schedule.summary, correct field is recommendation_summary */}
          {schedule.recommendation_summary}
        </div>
      </div>

      {/* Peak vs off-peak breakdown */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
        <div style={{ flex: 1, padding: "10px", background: "#3b1f1f", borderRadius: "6px" }}>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#ef4444" }}>{schedule.peak_sessions_pct}%</div>
          <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "2px" }}>Sessions at peak</div>
        </div>
        <div style={{ flex: 1, padding: "10px", background: "#0f2a1a", borderRadius: "6px" }}>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#22c55e" }}>{schedule.total_windows_found}</div>
          <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "2px" }}>Off-peak windows</div>
        </div>
      </div>

      {/* Windows list */}
      <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "8px", fontWeight: 500 }}>
        Recommended charging windows
      </div>

      {windows.length === 0 && (
        <div style={{ color: "#6b7280", fontSize: "12px", textAlign: "center", padding: "16px" }}>
          No optimal windows found for this zone.
        </div>
      )}

      {windows.map((w, i) => (
        <div key={i} style={{
          padding: "10px 12px", borderRadius: "8px",
          background: "#0f1117", border: "1px solid #2a2d3a",
          marginBottom: "6px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderLeft: `3px solid ${w.recommendation === "Ideal" ? "#22c55e" : "#f59e0b"}`,
        }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>
              {w.time_label}
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "3px" }}>
              <span style={{ fontSize: "10px", color: "#6b7280" }}>
                Grid surplus: <span style={{ color: "#22c55e" }}>{w.grid_surplus_pct}%</span>
              </span>
              <span style={{ fontSize: "10px", color: "#6b7280" }}>
                Score: <span style={{ color: "#9ca3af" }}>{w.window_score}</span>
              </span>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{
              fontSize: "11px", padding: "3px 8px", borderRadius: "20px",
              background: w.recommendation === "Ideal" ? "#14532d" : "#292524",
              color:      w.recommendation === "Ideal" ? "#22c55e" : "#a3a3a3",
              fontWeight: 600, marginBottom: "4px",
            }}>
              {w.recommendation}
            </div>
            <div style={{ fontSize: "12px", color: "#22c55e", fontWeight: 700 }}>
              Save {w.discount_pct}%
            </div>
            <div style={{ fontSize: "10px", color: "#6b7280" }}>
              {w.incentive_label}
            </div>
          </div>
        </div>
      ))}

      {/* BESCOM tip */}
      <div style={{
        marginTop: "10px", padding: "10px 12px",
        background: "#0f1117", border: "1px solid #2a2d3a",
        borderRadius: "8px", fontSize: "11px", color: "#6b7280", lineHeight: 1.6,
      }}>
        💡 <strong style={{ color: "#9ca3af" }}>BESCOM tip:</strong> Offering time-of-use tariffs
        during highlighted windows can shift {schedule.potential_peak_reduction_pct}% of EV load
        to grid-surplus hours automatically.
      </div>
    </div>
  )
}