import { useEffect, useState } from "react"
import {
  MapContainer, TileLayer, CircleMarker,
  Polygon, Circle, Tooltip, useMap
} from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { api } from "../api"

const PRIORITY_COLORS = { high:"#ef4444", medium:"#f59e0b", low:"#22c55e" }

// Fly to selected site
function FlyTo({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 0.8 })
  }, [center, zoom])
  return null
}

export default function SiteRecommend() {
  const [mode,          setMode]          = useState("urban")
  const [urban,         setUrban]         = useState(null)
  const [rural,         setRural]         = useState(null)
  const [selected,      setSelected]      = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [showCircles,   setShowCircles]   = useState(false)
  const [showHexes,     setShowHexes]     = useState(true)
  const [flyTarget,     setFlyTarget]     = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([api.sitesRecommend(), api.sitesRural()])
      .then(([u, r]) => { setUrban(u); setRural(r); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const urbanList  = urban?.recommendations || []
  const ruralList  = rural?.taluks          || []
  const activeList = mode === "urban" ? urbanList : ruralList
  const mapCenter  = mode === "urban" ? [12.97, 77.59] : [13.5, 76.8]
  const mapZoom    = mode === "urban" ? 11 : 7

  function handleSelect(item) {
    setSelected(item)
    // Fly to selected item
    const lat = item.center_lat || item.lat || item.boundary?.[0]?.[0]
    const lng = item.center_lng || item.lng || item.boundary?.[0]?.[1]
    if (lat && lng) setFlyTarget({ center:[lat,lng], zoom:13 })
  }

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden" }}>

      {/* ── Left panel ──────────────────────────────────────────── */}
      <div style={{
        width:"340px", flexShrink:0,
        background:"#1a1d27",
        borderRight:"1px solid #2a2d3a",
        display:"flex", flexDirection:"column",
        overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{ padding:"14px 16px", borderBottom:"1px solid #2a2d3a", flexShrink:0 }}>
          <div style={{ fontSize:"15px", fontWeight:600, color:"#fff", marginBottom:"10px" }}>
            📍 Site Recommendations
          </div>

          {/* Urban / Rural toggle */}
          <div style={{ display:"flex", gap:"6px", marginBottom:"10px" }}>
            {["urban","rural"].map(m => (
              <button key={m} onClick={() => { setMode(m); setSelected(null); setFlyTarget(null) }} style={{
                flex:1, padding:"7px", borderRadius:"8px",
                border:"1px solid",
                borderColor: mode===m ? "#2563eb" : "#2a2d3a",
                background:  mode===m ? "#1e3a5f" : "transparent",
                color:       mode===m ? "#60a5fa" : "#6b7280",
                fontSize:"12px", fontWeight: mode===m ? 600 : 400,
                cursor:"pointer",
              }}>
                {m === "urban" ? "🏙 Urban (Bengaluru)" : "🌾 Rural (Karnataka)"}
              </button>
            ))}
          </div>

          {/* Stats row */}
          {!loading && (
            <div style={{ display:"flex", gap:"8px" }}>
              {mode === "urban" ? (
                <>
                  <StatBox val={urbanList.length}  label="gaps found" />
                  <StatBox val={urbanList.filter(r=>r.composite_score>0.4).length} label="high priority" />
                  <StatBox val={`₹${urbanList.reduce((s,r)=>s+(r.total_cost_L||0),0)}L`} label="total cost" />
                </>
              ) : (
                <>
                  <StatBox val={ruralList.length} label="taluks" />
                  <StatBox val={ruralList.filter(r=>r.priority==="high").length} label="high growth" />
                  <StatBox val={ruralList.reduce((s,r)=>s+(r.stations_needed||0),0)} label="stations needed" />
                </>
              )}
            </div>
          )}
        </div>

        {/* List */}
        <div style={{ flex:1, overflowY:"auto", padding:"10px" }}>
          {loading && (
            <div style={{ color:"#6b7280", fontSize:"13px", textAlign:"center", paddingTop:"40px" }}>
              Loading recommendations…
            </div>
          )}

          {!loading && mode === "urban" && urbanList.map(rec => (
            <div
              key={rec.hex_id}
              onClick={() => handleSelect(rec)}
              style={{
                padding:"10px 12px", borderRadius:"8px",
                border:"1px solid",
                borderColor: selected?.hex_id===rec.hex_id ? "#2563eb" : "#2a2d3a",
                background:  selected?.hex_id===rec.hex_id ? "#0f1e38" : "#0f1117",
                marginBottom:"6px", cursor:"pointer",
              }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                  <span style={{
                    width:"22px", height:"22px", borderRadius:"50%",
                    background:"#1e3a5f", color:"#60a5fa",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"10px", fontWeight:700, flexShrink:0,
                  }}>{rec.rank}</span>
                  <span style={{ fontSize:"13px", fontWeight:500, color:"#e2e8f0" }}>
                    {rec.zone_name}
                  </span>
                </div>
                <ScoreBar score={rec.composite_score} />
              </div>

              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                <Pill label={`${rec.sessions_90d || rec.sessions_30d || 0} sessions`} color="#1e3a5f" text="#60a5fa" />
                <Pill
                  label={rec.charger_type_rec==="fast_dc" ? "⚡ Fast DC" : "🔌 Slow AC"}
                  color="#14532d" text="#22c55e"
                />
                <Pill
                  label={`₹${rec.total_cost_L || "—"}L`}
                  color="#2d1f00" text="#f59e0b"
                />
              </div>

              {selected?.hex_id===rec.hex_id && (
                <div style={{ marginTop:"8px", paddingTop:"8px", borderTop:"1px solid #2a2d3a" }}>
                  {(rec.reasons||[]).map((r,i) => (
                    <div key={i} style={{ fontSize:"11px", color:"#9ca3af", lineHeight:1.6, marginBottom:"2px" }}>
                      • {r}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {!loading && mode === "rural" && ruralList.map(t => (
            <div
              key={t.taluk}
              onClick={() => handleSelect(t)}
              style={{
                padding:"10px 12px", borderRadius:"8px",
                border:"1px solid",
                borderColor: selected?.taluk===t.taluk ? "#d97706" : "#2a2d3a",
                background:  selected?.taluk===t.taluk ? "#1c1505" : "#0f1117",
                marginBottom:"6px", cursor:"pointer",
              }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:"13px", fontWeight:500, color:"#e2e8f0" }}>{t.taluk}</div>
                  <div style={{ fontSize:"11px", color:"#6b7280", marginTop:"2px" }}>
                    {t.district} · {t.highway || ""}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:"18px", fontWeight:700, color:PRIORITY_COLORS[t.priority] }}>
                    +{t.ev_growth_pct}%
                  </div>
                  <div style={{ fontSize:"10px", color:"#6b7280" }}>EV growth</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:"6px", marginTop:"6px", flexWrap:"wrap" }}>
                <Pill label={`${t.ev_registrations} EVs`} color="#1e3a5f" text="#60a5fa" />
                <Pill label={`${t.stations_existing} stations`} color="#1a1a1a" text="#9ca3af" />
                <Pill
                  label={t.priority.toUpperCase()}
                  color={t.priority==="high"?"#3b1f1f":t.priority==="medium"?"#2d1f00":"#0f2a1a"}
                  text={PRIORITY_COLORS[t.priority]}
                />
              </div>
              {selected?.taluk===t.taluk && (
                <div style={{ marginTop:"8px", fontSize:"11px", color:"#9ca3af", lineHeight:1.6, paddingTop:"8px", borderTop:"1px solid #2a2d3a" }}>
                  {t.reason}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Map ─────────────────────────────────────────────────── */}
      <div style={{ flex:1, position:"relative" }}>
        <MapContainer
          key={mode}
          center={mapCenter}
          zoom={mapZoom}
          style={{ height:"100%", width:"100%", background:"#0a0d16" }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="© OpenStreetMap © CARTO"
          />

          {flyTarget && <FlyTo center={flyTarget.center} zoom={flyTarget.zoom} />}

          {/* Urban — hex polygons + center dots */}
          {mode === "urban" && urbanList.map(rec => {
            const isSelected = selected?.hex_id === rec.hex_id
            const score  = rec.composite_score || 0
            const color  = score > 0.5 ? "#ef4444" : score > 0.35 ? "#f59e0b" : "#22c55e"

            // Use center_lat/center_lng — NOT boundary[0] which is a corner
            const clat = rec.center_lat || rec.boundary?.[0]?.[0] || 12.97
            const clng = rec.center_lng || rec.boundary?.[0]?.[1] || 77.59

            return (
              <div key={rec.hex_id}>
                {/* Hex polygon background — shows the actual zone shape */}
                {showHexes && rec.boundary?.length > 0 && (
                  <Polygon
                    positions={rec.boundary}
                    pathOptions={{
                      fillColor:   color,
                      fillOpacity: isSelected ? 0.35 : 0.18,
                      color:       color,
                      weight:      isSelected ? 2 : 1,
                    }}
                    eventHandlers={{ click: () => handleSelect(rec) }}
                  />
                )}

                {/* Coverage circle — 5km radius */}
                {showCircles && (
                  <Circle
                    center={[clat, clng]}
                    radius={5000}
                    pathOptions={{
                      color,
                      fillColor:   color,
                      fillOpacity: 0.04,
                      weight:      1.5,
                      dashArray:   "6 4",
                    }}
                  />
                )}

                {/* Center dot — correctly positioned at centroid */}
                <CircleMarker
                  center={[clat, clng]}
                  radius={isSelected ? 14 : 9}
                  pathOptions={{
                    fillColor:   color,
                    fillOpacity: isSelected ? 0.95 : 0.80,
                    color:       "#fff",
                    weight:      isSelected ? 2.5 : 1.5,
                  }}
                  eventHandlers={{ click: () => handleSelect(rec) }}
                >
                  <Tooltip permanent={isSelected} direction="top">
                    <div style={{ fontSize:"12px" }}>
                      <strong>#{rec.rank} {rec.zone_name}</strong><br/>
                      Score: {Math.round(score*100)}% · ₹{rec.total_cost_L||"?"}L<br/>
                      {rec.estimated_stations_needed} station{rec.estimated_stations_needed>1?"s":""} needed
                    </div>
                  </Tooltip>
                </CircleMarker>
              </div>
            )
          })}

          {/* Rural taluk polygons */}
          {mode === "rural" && ruralList.map(t => {
            if (!t.boundary?.length) return null
            const isSelected = selected?.taluk === t.taluk
            const color = PRIORITY_COLORS[t.priority]
            return (
              <Polygon
                key={t.taluk}
                positions={t.boundary}
                pathOptions={{
                  fillColor:   color,
                  fillOpacity: isSelected ? 0.65 : 0.35,
                  color,
                  weight:      isSelected ? 2.5 : 1,
                }}
                eventHandlers={{ click: () => handleSelect(t) }}
              >
                <Tooltip>
                  <div style={{ fontSize:"12px" }}>
                    <strong>{t.taluk}</strong><br/>
                    EV growth: +{t.ev_growth_pct}%<br/>
                    {t.ev_registrations} EVs · {t.stations_existing} stations
                  </div>
                </Tooltip>
              </Polygon>
            )
          })}
        </MapContainer>

        {/* Map toggle buttons */}
        {mode === "urban" && (
          <div style={{
            position:"absolute", bottom:16, left:"50%",
            transform:"translateX(-50%)", zIndex:1000,
            display:"flex", gap:"6px",
            background:"rgba(15,17,26,0.95)", padding:"8px 12px",
            borderRadius:"10px", border:"1px solid rgba(255,255,255,0.08)",
          }}>
            <MapToggle active={showHexes}   onClick={() => setShowHexes(v=>!v)}   label="⬡ Hex zones" />
            <MapToggle active={showCircles} onClick={() => setShowCircles(v=>!v)} label="⭕ Coverage 5km" />
            {flyTarget && (
              <MapToggle active={false}
                onClick={() => { setFlyTarget({center:mapCenter,zoom:mapZoom}); setSelected(null) }}
                label="🗺 Reset view"
              />
            )}
          </div>
        )}

        {/* Legend */}
        <div style={{
          position:"absolute", top:12, right:12, zIndex:1000,
          background:"rgba(15,17,26,0.95)", borderRadius:"8px",
          padding:"10px 14px", border:"1px solid rgba(255,255,255,0.08)",
          fontSize:"12px",
        }}>
          <div style={{ color:"#9ca3af", marginBottom:"6px", fontWeight:500 }}>
            {mode === "urban" ? "Station priority" : "Growth level"}
          </div>
          {[["#ef4444","High priority"],["#f59e0b","Medium"],["#22c55e","Lower priority"]].map(([c,l]) => (
            <div key={l} style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"3px" }}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:c }}/>
              <span style={{ color:"#9ca3af" }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MapToggle({ active, onClick, label }) {
  return (
    <button onClick={onClick} style={{
      padding:"4px 12px", borderRadius:"6px", fontSize:"11px",
      border:"1px solid",
      borderColor: active ? "#2563eb" : "rgba(255,255,255,0.08)",
      background:  active ? "#1e3a5f" : "transparent",
      color:       active ? "#60a5fa" : "#9ca3af",
      cursor:"pointer",
    }}>{label}</button>
  )
}

function Pill({ label, color, text }) {
  return (
    <span style={{
      fontSize:"10px", padding:"2px 7px", borderRadius:"20px",
      background:color, color:text, fontWeight:500,
    }}>{label}</span>
  )
}

function ScoreBar({ score }) {
  const pct   = Math.round(score * 100)
  const color = score > 0.5 ? "#ef4444" : score > 0.35 ? "#f59e0b" : "#22c55e"
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
      <div style={{ width:"50px", height:"5px", background:"#2a2d3a", borderRadius:"3px", overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:"3px" }}/>
      </div>
      <span style={{ fontSize:"11px", color:"#6b7280" }}>{pct}%</span>
    </div>
  )
}

function StatBox({ val, label }) {
  return (
    <div style={{
      flex:1, background:"#0f1117", borderRadius:"6px",
      padding:"6px 8px", textAlign:"center",
    }}>
      <div style={{ fontSize:"15px", fontWeight:600, color:"#fff" }}>{val}</div>
      <div style={{ fontSize:"10px", color:"#6b7280", marginTop:"2px" }}>{label}</div>
    </div>
  )
}