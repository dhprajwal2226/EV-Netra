import { useEffect, useState, useRef, useCallback } from "react"
import {
  MapContainer, TileLayer, Polygon,
  Circle, CircleMarker, Tooltip, useMap
} from "react-leaflet"
import { cellToLatLng, cellToVertexes, vertexToLatLng } from "h3-js"
import "leaflet/dist/leaflet.css"
import { api } from "../api"
import XAIPanel from "../components/XAIPanel"

// ── Color helpers ─────────────────────────────────────────────────────────────
function demandColor(score, alpha = 0.75) {
  if (score > 0.7) return `rgba(239,68,68,${alpha})`
  if (score > 0.4) return `rgba(245,158,11,${alpha})`
  return             `rgba(34,197,94,${alpha})`
}

// ── Fly-to animation ──────────────────────────────────────────────────────────
function FlyTo({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 1.0 })
  }, [center, zoom])
  return null
}

// ── Split hexes into chunks for progressive rendering ─────────────────────────
// Renders uncovered hexes first in one batch, then active hexes on top
// This avoids the browser freezing on 1261 polygons at once
function useChunkedHexes(hexData) {
  const [rendered, setRendered] = useState([])

  useEffect(() => {
    if (!hexData.length) return
    setRendered([])

    // Batch 1: all uncovered hexes (background grid) — render immediately
    const uncovered = hexData.filter(h => !h.has_data)
    const active    = hexData.filter(h => h.has_data)

    // Use requestIdleCallback so UI stays responsive during render
    const render = () => {
      setRendered(uncovered)
      // Batch 2: active hexes after a short delay
      setTimeout(() => {
        setRendered([...uncovered, ...active])
      }, 80)
    }

    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(render)
    } else {
      setTimeout(render, 0)
    }
  }, [hexData])

  return rendered
}

export default function HexMap() {
  const [hexData,      setHexData]      = useState([])
  const [hour,         setHour]         = useState(18)
  const [selectedHex,  setSelectedHex]  = useState(null)
  const [flyTarget,    setFlyTarget]    = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [viewMode,     setViewMode]     = useState("demand")
  const [showCircles,  setShowCircles]  = useState(false)
  const [showVertices, setShowVertices] = useState(false)
  const rendered = useChunkedHexes(hexData)

  useEffect(() => {
    setLoading(true)
    api.hexDemand(hour)
      .then(data => { setHexData(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [hour])

  function handleHexClick(h) {
    setSelectedHex(h.hex_id)
    try {
      const [lat, lng] = cellToLatLng(h.hex_id)
      setFlyTarget({ center: [lat, lng], zoom: 14 })
    } catch {
      const b = h.boundary
      if (b?.length) setFlyTarget({ center: [b[0][0], b[0][1]], zoom: 14 })
    }
  }

  // High-demand hexes for coverage circles
  const hotHexes = hexData.filter(h => h.has_data && h.demand_score > 0.5)

  // ── Build polygons ────────────────────────────────────────────────────────
  const hexPolygons = rendered.map(h => {
    const positions = (h.boundary || []).map(([lat, lng]) => [lat, lng])
    if (!positions.length) return null
    const isSelected = selectedHex === h.hex_id

    // ── UNCOVERED hex — visible grid outline ─────────────────────────────────
    // fillOpacity 0.45 (was 0.25) makes the grid visible as a dark mesh
    // border opacity 0.15 (was 0.04) gives clear hex grid lines
    if (!h.has_data) {
      return (
        <Polygon
          key={h.hex_id}
          positions={positions}
          pathOptions={{
            fillColor:   "#1a1f35",
            fillOpacity: 0.45,
            color:       "rgba(255,255,255,0.15)",
            weight:      0.6,
          }}
        />
      )
    }

    // ── ACTIVE hex — colored by demand or grid load ──────────────────────────
    const score = viewMode === "grid"
      ? h.grid_load_pct / 100
      : h.demand_score
    const color = demandColor(score)

    return (
      <Polygon
        key={h.hex_id + hour}
        positions={positions}
        pathOptions={{
          fillColor:   color,
          fillOpacity: isSelected ? 0.95 : 0.72,
          color:       isSelected
            ? "rgba(255,255,255,0.95)"
            : "rgba(255,255,255,0.18)",
          weight: isSelected ? 2.5 : 1.0,
        }}
        eventHandlers={{
          click:     () => handleHexClick(h),
          mouseover: (e) => e.target.setStyle({ fillOpacity: 0.92, weight: 2 }),
          mouseout:  (e) => e.target.setStyle({
            fillOpacity: isSelected ? 0.95 : 0.72,
            weight:      isSelected ? 2.5  : 1.0,
          }),
        }}
      >
        <Tooltip sticky>
          <div style={{ fontSize:"12px", lineHeight:1.6 }}>
            <strong>{h.zone_name}</strong><br/>
            Sessions: {h.sessions}<br/>
            Energy: {h.total_kwh} kWh<br/>
            Grid load: {h.grid_load_pct}%
          </div>
        </Tooltip>
      </Polygon>
    )
  }).filter(Boolean)

  // ── Coverage circles ──────────────────────────────────────────────────────
  // Radius: 5km for ultra-high demand (red), 3km for medium (amber)
  const coverageCircles = showCircles
    ? hotHexes.map(h => {
        try {
          const [lat, lng] = cellToLatLng(h.hex_id)
          const isHigh  = h.demand_score > 0.7
          const radius  = isHigh ? 5000 : 3000
          const color   = isHigh ? "#ef4444" : "#3b82f6"
          return (
            <Circle
              key={h.hex_id + "-cov"}
              center={[lat, lng]}
              radius={radius}
              pathOptions={{
                color,
                fillColor:   color,
                fillOpacity: 0.05,
                weight:      1.5,
                dashArray:   "6 4",
              }}
            />
          )
        } catch { return null }
      }).filter(Boolean)
    : []

  // ── Vertex station markers ────────────────────────────────────────────────
  const vertexMarkers = (showVertices && selectedHex)
    ? (() => {
        try {
          const vIds = cellToVertexes(selectedHex)
          return vIds.map((vId, i) => {
            try {
              const [lat, lng] = vertexToLatLng(vId)
              return (
                <CircleMarker
                  key={`v-${selectedHex}-${i}`}
                  center={[lat, lng]}
                  radius={7}
                  pathOptions={{
                    fillColor:   "#22c55e",
                    fillOpacity: 0.92,
                    color:       "#fff",
                    weight:      2,
                  }}
                >
                  <Tooltip permanent direction="top">
                    <span style={{ fontSize:"11px" }}>
                      Station {i+1} — serves 3 zones
                    </span>
                  </Tooltip>
                </CircleMarker>
              )
            } catch { return null }
          }).filter(Boolean)
        } catch { return [] }
      })()
    : []

  const hourLabel = h => {
    const s = h >= 12 ? "PM" : "AM"
    const d = h % 12 === 0 ? 12 : h % 12
    return `${d}:00 ${s}`
  }

  const activeCount   = hexData.filter(h => h.has_data).length
  const uncoveredCount = hexData.filter(h => !h.has_data).length

  return (
    <div style={{ display:"flex", height:"100%", position:"relative" }}>

      {/* ── Map ─────────────────────────────────────────────────────── */}
      <div style={{ flex:1, position:"relative" }}>
        <MapContainer
          center={[12.97, 77.59]}
          zoom={11}
          style={{ height:"100%", width:"100%", background:"#0a0d16" }}
          preferCanvas={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="© OpenStreetMap © CARTO"
          />

          {flyTarget && <FlyTo center={flyTarget.center} zoom={flyTarget.zoom} />}

          {/* Grid + active hexes — rendered in chunks for performance */}
          {hexPolygons}

          {/* Coverage circles */}
          {coverageCircles}

          {/* Vertex markers */}
          {vertexMarkers}
        </MapContainer>

        {/* ── Stats pill ─────────────────────────────────────────────── */}
        <div style={{
          position:"absolute", top:12, left:12, zIndex:1000,
          background:"rgba(15,17,26,0.95)", borderRadius:"8px",
          padding:"8px 14px", border:"1px solid rgba(255,255,255,0.08)",
          fontSize:"12px", color:"#9ca3af", backdropFilter:"blur(8px)",
        }}>
          <span style={{ color:"#fff", fontWeight:600 }}>{activeCount}</span>
          {" active · "}
          <span style={{ color:"#374151" }}>{uncoveredCount}</span>
          {" uncovered · "}
          <span
            style={{ color:"#60a5fa", cursor:"pointer" }}
            onClick={() => setFlyTarget({ center:[12.97,77.59], zoom:11 })}
          >
            click any zone
          </span>
        </div>

        {/* ── Controls ───────────────────────────────────────────────── */}
        <div style={{
          position:"absolute", bottom:24, left:"50%",
          transform:"translateX(-50%)", zIndex:1000,
          background:"rgba(15,17,26,0.97)",
          borderRadius:"14px", padding:"14px 20px",
          border:"1px solid rgba(255,255,255,0.08)",
          minWidth:"400px", backdropFilter:"blur(12px)",
          boxShadow:"0 8px 32px rgba(0,0,0,0.6)",
        }}>
          {/* Time slider */}
          <div style={{ marginBottom:"12px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
              <span style={{ fontSize:"12px", color:"#9ca3af" }}>Time of day</span>
              <span style={{ fontSize:"13px", fontWeight:600, color:"#60a5fa" }}>
                {hourLabel(hour)}
              </span>
            </div>
            <input
              type="range" min={0} max={23} value={hour}
              onChange={e => setHour(Number(e.target.value))}
              style={{ width:"100%", accentColor:"#2563eb", cursor:"pointer" }}
            />
            <div style={{
              display:"flex", justifyContent:"space-between",
              fontSize:"10px", color:"#4b5563", marginTop:"2px",
            }}>
              {["12 AM","6 AM","12 PM","6 PM","11 PM"].map(t => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
            <ToggleBtn
              active={viewMode === "grid"}
              onClick={() => setViewMode(m => m==="demand" ? "grid" : "demand")}
              label={viewMode==="demand" ? "⚡ Grid load" : "📊 EV demand"}
            />
            <ToggleBtn
              active={showCircles}
              onClick={() => setShowCircles(s => !s)}
              label="⭕ Coverage"
            />
            <ToggleBtn
              active={showVertices}
              onClick={() => setShowVertices(s => !s)}
              label="📍 Stations"
              disabled={!selectedHex}
              title={!selectedHex ? "Click a hex first" : "Show vertex station positions"}
            />
            {flyTarget && (
              <ToggleBtn
                active={false}
                onClick={() => {
                  setFlyTarget({ center:[12.97,77.59], zoom:11 })
                  setSelectedHex(null)
                }}
                label="🗺 City view"
              />
            )}

            {/* Legend */}
            <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"8px" }}>
              {[["#22c55e","Low"],["#f59e0b","Med"],["#ef4444","High"]].map(([c,l]) => (
                <div key={l} style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                  <div style={{ width:9, height:9, borderRadius:"2px", background:c }}/>
                  <span style={{ fontSize:"10px", color:"#9ca3af" }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div style={{
            position:"absolute", inset:0, zIndex:999,
            background:"rgba(10,13,22,0.80)",
            display:"flex", alignItems:"center", justifyContent:"center",
            flexDirection:"column", gap:"10px",
          }}>
            <div style={{ color:"#60a5fa", fontSize:"14px", fontWeight:500 }}>
              Loading hex grid…
            </div>
            <div style={{
              width:"120px", height:"3px", background:"#1a1d27",
              borderRadius:"2px", overflow:"hidden",
            }}>
              <div style={{
                height:"100%", background:"#2563eb",
                borderRadius:"2px", width:"60%",
                animation:"pulse 1s ease-in-out infinite",
              }}/>
            </div>
          </div>
        )}
      </div>

      {/* ── XAI Panel ────────────────────────────────────────────────── */}
      <XAIPanel
        hexId={selectedHex}
        onClose={() => {
          setSelectedHex(null)
          setFlyTarget({ center:[12.97,77.59], zoom:11 })
        }}
      />

      <style>{`
        @keyframes pulse {
          0%,100% { opacity:1; transform:scaleX(1); }
          50%      { opacity:0.6; transform:scaleX(0.8); }
        }
      `}</style>
    </div>
  )
}

function ToggleBtn({ active, onClick, label, disabled, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding:"5px 12px", borderRadius:"6px",
        border:"1px solid",
        borderColor: active ? "#2563eb" : "rgba(255,255,255,0.08)",
        background:  active ? "#1e3a5f" : "transparent",
        color:       disabled ? "#2a2d3a"
                   : active   ? "#60a5fa"
                   : "#9ca3af",
        fontSize:"11px",
        cursor: disabled ? "not-allowed" : "pointer",
        transition:"all 0.15s",
      }}
    >
      {label}
    </button>
  )
}