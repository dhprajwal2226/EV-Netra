import { useEffect, useState } from "react"

function App() {
  const [status, setStatus] = useState("Connecting...")

  useEffect(() => {
    fetch("http://localhost:8000/api/health")
      .then(r => r.json())
      .then(d => setStatus("Backend connected ✓"))
      .catch(() => setStatus("Backend not reachable ✗"))
  }, [])

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>EV-Netra</h1>
      <p style={{ fontSize: "18px" }}>{status}</p>
    </div>
  )
}

export default App