import { useState, useEffect, useRef } from "react"
import { Chart, registerables } from "chart.js"
Chart.register(...registerables)

// ─── Data ────────────────────────────────────────────────────────────────────

const COSTS = {
  acSlow: { name: "AC 7kW slow",     equip: 3.5,  civil: 1.2, grid: 0.8, labour: 0.6, om: 0.9,  color: "#1D9E75" },
  acFast: { name: "AC 22kW fast",    equip: 6.5,  civil: 1.8, grid: 1.2, labour: 0.9, om: 1.4,  color: "#0F6E56" },
  dc50:   { name: "DC 50kW",         equip: 18,   civil: 4.5, grid: 3.5, labour: 2.5, om: 4.0,  color: "#185FA5" },
  dc150:  { name: "DC Fast 150kW",   equip: 55,   civil: 10,  grid: 8,   labour: 6,   om: 12,   color: "#534AB7" },
}
const KEYS = ["acSlow", "acFast", "dc50", "dc150"]

const SLIDER_CFG = {
  acSlow: { min: 200,  max: 2000, step: 50,  label: "AC 7kW slow stations" },
  acFast: { min: 100,  max: 1000, step: 25,  label: "AC 22kW fast stations" },
  dc50:   { min: 50,   max: 500,  step: 10,  label: "DC 50kW stations" },
  dc150:  { min: 20,   max: 300,  step: 5,   label: "DC Fast 150kW stations" },
}

const PHASE_PCT = [0.08, 0.14, 0.18, 0.22, 0.20, 0.18]
const YEARS     = ["2025", "2026", "2027", "2028", "2029", "2030"]

const FUNDING = [
  { source: "FAME-II / FAME-III subsidy",   coverage: "AC slow & DC 50kW",    share: "30–40%",      note: "₹10L per AC, ₹20L per DC station" },
  { source: "BESCOM / KPTCL grid upgrade",  coverage: "Grid connection cost",  share: "Fully borne", note: "State utility obligation" },
  { source: "State EV policy 2023 grant",   coverage: "Rural & highway sites", share: "25%",         note: "Priority corridor grant" },
  { source: "Private CPO investment",        coverage: "Urban commercial",      share: "50–60%",      note: "Tata Power, Ather, ChargeZone" },
  { source: "Green bonds / infra debt",      coverage: "Large DC hubs",         share: "20%",         note: "7–8% yield, 10yr tenor" },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n)   { return n >= 100 ? Math.round(n).toLocaleString("en-IN") : n.toFixed(1) }
function fmtCr(n) { return "₹" + fmt(n / 100) + " Cr" }
function fmtL(n)  { return "₹" + fmt(n) + "L" }

// ─── Styles (inline, no external CSS needed) ─────────────────────────────────

const S = {
  page:        { height: "100%", overflowY: "auto", padding: "24px", background: "#0f1117" },
  wrap:        { maxWidth: "1100px", margin: "0 auto" },
  card:        { background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: "10px", padding: "16px" },
  sectionTitle:{ fontSize: "13px", fontWeight: 500, color: "#e2e8f0", marginBottom: "14px" },
  subTitle:    { fontSize: "12px", color: "#6b7280", marginBottom: "8px" },
  th:          { padding: "8px 10px", textAlign: "left",  color: "#6b7280", fontWeight: 500, fontSize: "11px" },
  thR:         { padding: "8px 10px", textAlign: "right", color: "#6b7280", fontWeight: 500, fontSize: "11px" },
  td:          { padding: "10px", color: "#9ca3af", textAlign: "right" },
  tdL:         { padding: "10px", color: "#e2e8f0" },
  dot:         (color) => ({ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: color, marginRight: 6, verticalAlign: "middle" }),
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CostEstimator() {
  const [counts, setCounts] = useState({ acSlow: 800, acFast: 400, dc50: 200, dc150: 80 })
  const chartRef  = useRef(null)
  const chartInst = useRef(null)

  // ── Derived numbers ──────────────────────────────────────────────────────

  const rows = KEYS.map(k => {
    const c = COSTS[k], n = counts[k]
    const perStation = c.equip + c.civil + c.grid + c.labour + c.om
    return { k, c, n, perStation, subtotalL: perStation * n }
  })

  const grandTotalL = rows.reduce((s, r) => s + r.subtotalL, 0)
  const totalStn    = rows.reduce((s, r) => s + r.n, 0)
  const devTotal    = rows.reduce((s, r) => s + (r.c.equip + r.c.civil) * r.n, 0)
  const instTotal   = rows.reduce((s, r) => s + (r.c.grid + r.c.labour + r.c.om) * r.n, 0)

  // phase data: each key → array of 6 ₹Cr values
  const phaseData = KEYS.reduce((acc, k) => {
    const perStn = COSTS[k].equip + COSTS[k].civil + COSTS[k].grid + COSTS[k].labour + COSTS[k].om
    acc[k] = PHASE_PCT.map(p => Math.round(perStn * counts[k] * p / 100))
    return acc
  }, {})
  const phaseTotals = YEARS.map((_, i) => KEYS.reduce((s, k) => s + phaseData[k][i], 0))
  const maxPhase    = Math.max(...phaseTotals)

  // ── Chart ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!chartRef.current) return
    if (chartInst.current) chartInst.current.destroy()
    chartInst.current = new Chart(chartRef.current, {
      type: "bar",
      data: {
        labels: YEARS,
        datasets: KEYS.map(k => ({
          label: COSTS[k].name,
          data:  phaseData[k],
          backgroundColor: COSTS[k].color,
          stack: "a",
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: "#888780" } },
          y: { stacked: true, grid: { color: "rgba(136,135,128,0.15)" },
               ticks: { color: "#888780", callback: v => "₹" + v + "Cr" } },
        },
      },
    })
    return () => { if (chartInst.current) chartInst.current.destroy() }
  }, [counts])

  // ── KPI cards ────────────────────────────────────────────────────────────

  const kpiCards = [
    { val: totalStn.toLocaleString("en-IN"),                      lbl: "Total stations",           color: "#60a5fa" },
    { val: fmtCr(grandTotalL),                                     lbl: "Total investment",         color: "#a78bfa" },
    { val: fmtCr(devTotal),                                        lbl: "Development capex",        color: "#f59e0b" },
    { val: fmtCr(instTotal),                                       lbl: "Install + O&M (3yr)",      color: "#22c55e" },
    { val: "₹" + Math.round(grandTotalL / totalStn) + "L",        lbl: "Avg cost per station",     color: "#fb923c" },
    { val: Math.round(totalStn / 30) + " / district",             lbl: "Karnataka avg (30 dist.)", color: "#34d399" },
  ]

  // ── Dev / Install breakdown rows ─────────────────────────────────────────

  const devItems = [
    { lbl: "Equipment (charger hardware)", val: rows.reduce((s, r) => s + r.c.equip * r.n, 0), note: "FAME-II subsidy eligible" },
    { lbl: "Civil works (foundation, canopy)", val: rows.reduce((s, r) => s + r.c.civil * r.n, 0), note: "Site variability ±30%" },
    { lbl: "Land lease (5yr prepaid)", val: grandTotalL * 0.08, note: "Urban ₹2L/yr, rural ₹0.3L/yr" },
    { lbl: "Software & EMS platform", val: totalStn * 0.25, note: "₹25k per station" },
  ]
  const instItems = [
    { lbl: "Grid connection & transformer", val: rows.reduce((s, r) => s + r.c.grid * r.n, 0), note: "BESCOM tariff order 2023" },
    { lbl: "Installation labour", val: rows.reduce((s, r) => s + r.c.labour * r.n, 0), note: "Certified EVSE technicians" },
    { lbl: "O&M contract (3yr)", val: rows.reduce((s, r) => s + r.c.om * r.n, 0), note: "AMC + parts + remote monitoring" },
    { lbl: "Networking & SIM (3yr)", val: totalStn * 0.15, note: "₹15k/station connectivity" },
  ]

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={S.page}>
      <div style={S.wrap}>

        {/* Header */}
        <div style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "18px", fontWeight: 600, color: "#fff", margin: "0 0 4px" }}>
            💰 EV Infrastructure Cost Estimator
          </h1>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
            Karnataka-wide EV charging rollout · Realistic cost modelling by 2030 · BESCOM / KPTCL aligned
          </p>
        </div>

        {/* ── Sliders ── */}
        <div style={{ ...S.card, marginBottom: "20px" }}>
          <div style={S.sectionTitle}>Adjust rollout targets</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
            {KEYS.map(k => {
              const cfg = SLIDER_CFG[k]
              return (
                <div key={k}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                      <span style={S.dot(COSTS[k].color)} />
                      {cfg.label}
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#e2e8f0", fontFamily: "monospace" }}>
                      {counts[k].toLocaleString("en-IN")} stations
                    </span>
                  </div>
                  <input
                    type="range"
                    min={cfg.min} max={cfg.max} step={cfg.step}
                    value={counts[k]}
                    onChange={e => setCounts(c => ({ ...c, [k]: +e.target.value }))}
                    style={{ width: "100%", accentColor: COSTS[k].color }}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "12px", marginBottom: "20px" }}>
          {kpiCards.map(c => (
            <div key={c.lbl} style={S.card}>
              <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: 6 }}>{c.lbl}</div>
              <div style={{ fontSize: "22px", fontWeight: 600, color: c.color, lineHeight: 1 }}>{c.val}</div>
            </div>
          ))}
        </div>

        {/* ── Cost breakdown table ── */}
        <div style={{ ...S.card, marginBottom: "20px", overflowX: "auto" }}>
          <div style={S.sectionTitle}>Per-station cost breakdown (₹ Lakhs)</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #2a2d3a" }}>
                {["Charger type","Equipment","Civil & install","Grid connection","Labour","O&M 3yr","Total / station","Stations","Subtotal"].map((h, i) => (
                  <th key={h} style={i === 0 ? S.th : S.thR}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.k} style={{ borderBottom: "1px solid #1a1d27" }}>
                  <td style={{ ...S.tdL, padding: "10px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: r.c.color, display: "inline-block", flexShrink: 0 }} />
                    {r.c.name}
                  </td>
                  <td style={S.td}>{fmtL(r.c.equip)}</td>
                  <td style={S.td}>{fmtL(r.c.civil)}</td>
                  <td style={S.td}>{fmtL(r.c.grid)}</td>
                  <td style={S.td}>{fmtL(r.c.labour)}</td>
                  <td style={S.td}>{fmtL(r.c.om)}</td>
                  <td style={{ ...S.td, fontWeight: 600, color: "#e2e8f0" }}>{fmtL(r.perStation)}</td>
                  <td style={{ ...S.td, color: "#60a5fa" }}>{r.n.toLocaleString("en-IN")}</td>
                  <td style={{ ...S.td, fontWeight: 600, color: "#a78bfa" }}>{fmtCr(r.subtotalL)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "#0f1117" }}>
                <td style={{ padding: "10px", color: "#fff", fontWeight: 600 }}>Total</td>
                <td colSpan={5} />
                <td style={{ ...S.td, fontWeight: 600, color: "#fff" }}>—</td>
                <td style={{ ...S.td, fontWeight: 600, color: "#60a5fa" }}>{totalStn.toLocaleString("en-IN")}</td>
                <td style={{ ...S.td, fontWeight: 700, color: "#22c55e", fontSize: "14px" }}>{fmtCr(grandTotalL)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── Dev vs Install split ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
          {[
            { title: "Development costs — one-time capex", items: devItems, color: "#f59e0b", totalVal: devItems.reduce((s, d) => s + d.val, 0), totalLbl: "Total dev capex" },
            { title: "Installation & operational costs",   items: instItems, color: "#22c55e", totalVal: instItems.reduce((s, d) => s + d.val, 0), totalLbl: "Total install + O&M" },
          ].map(panel => (
            <div key={panel.title} style={S.card}>
              <div style={S.sectionTitle}>{panel.title}</div>
              {panel.items.map(d => (
                <div key={d.lbl} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "7px 0", borderBottom: "1px solid #2a2d3a", fontSize: "12px" }}>
                  <span style={{ color: "#9ca3af" }}>
                    {d.lbl}<br />
                    <span style={{ fontSize: "11px", color: "#4b5563" }}>{d.note}</span>
                  </span>
                  <span style={{ fontWeight: 600, color: panel.color, whiteSpace: "nowrap", marginLeft: 12 }}>{fmtCr(d.val)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", fontSize: "13px", fontWeight: 600, color: "#fff" }}>
                <span>{panel.totalLbl}</span>
                <span style={{ color: panel.color }}>{fmtCr(panel.totalVal)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Phase rollout ── */}
        <div style={{ ...S.card, marginBottom: "20px" }}>
          <div style={S.sectionTitle}>Phased rollout 2025–2030 — annual investment (₹ Cr)</div>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "12px" }}>
            Deployment ramp: 8% → 14% → 18% → 22% → 20% → 18% of total
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "12px", fontSize: "11px", color: "#9ca3af" }}>
            {KEYS.map(k => (
              <span key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: COSTS[k].color, display: "inline-block" }} />
                {COSTS[k].name}
              </span>
            ))}
          </div>

          {/* Inline bars */}
          {YEARS.map((yr, i) => {
            const total = phaseTotals[i]
            const segs  = KEYS.map(k => ({ color: COSTS[k].color, w: maxPhase > 0 ? Math.round(phaseData[k][i] / maxPhase * 100) : 0 }))
            return (
              <div key={yr} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, fontSize: 12 }}>
                <span style={{ color: "#6b7280", minWidth: 32 }}>{yr}</span>
                <div style={{ flex: 1, height: 20, borderRadius: 4, overflow: "hidden", background: "#0f1117", display: "flex" }}>
                  {segs.map((s, si) => <div key={si} style={{ width: s.w + "%", background: s.color, height: "100%" }} />)}
                </div>
                <span style={{ color: "#e2e8f0", fontWeight: 600, minWidth: 72, textAlign: "right", fontFamily: "monospace", fontSize: 11 }}>
                  {fmtCr(total)}
                </span>
              </div>
            )
          })}

          {/* Chart.js canvas */}
          <div style={{ position: "relative", width: "100%", height: 200, marginTop: 16 }}>
            <canvas ref={chartRef} role="img" aria-label="Stacked bar chart of EV charging investment by year 2025 to 2030">
              Phase-wise investment breakdown 2025–2030.
            </canvas>
          </div>
        </div>

        {/* ── Funding table ── */}
        <div style={{ ...S.card, marginBottom: "20px" }}>
          <div style={S.sectionTitle}>Funding sources & subsidy model</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #2a2d3a" }}>
                {["Funding source", "Coverage", "Est. share", "Notes"].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FUNDING.map(f => (
                <tr key={f.source} style={{ borderBottom: "1px solid #1a1d27" }}>
                  <td style={{ padding: "9px 10px", color: "#e2e8f0", fontWeight: 500 }}>{f.source}</td>
                  <td style={{ padding: "9px 10px", color: "#9ca3af" }}>{f.coverage}</td>
                  <td style={{ padding: "9px 10px" }}>
                    <span style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", fontSize: "11px", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>
                      {f.share}
                    </span>
                  </td>
                  <td style={{ padding: "9px 10px", color: "#6b7280", fontSize: "11px" }}>{f.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer note */}
        <div style={{ fontSize: "11px", color: "#4b5563", lineHeight: 1.7, marginBottom: "24px" }}>
          Cost references: MNRE/FAME-II published rates 2024, BESCOM connection tariff schedule, CESL tender data,
          Ather Energy & Tata Power CPO benchmarks. All costs in 2024 ₹ with 6% CAGR inflation adjustment for 2030 projection.
        </div>

      </div>
    </div>
  )
}