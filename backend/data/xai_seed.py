# ev-netra/backend/data/xai_seed.py
"""
Seeds the explanation table used by the priority panel.
Every recommended hex gets a human-readable reason string.
"""
import sqlite3
from pathlib import Path

DB = Path(__file__).parent / "ev_data.db"

def generate_explanations():
    con = sqlite3.connect(DB)
    cur = con.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS hex_explanations (
            hex_id      TEXT PRIMARY KEY,
            reason      TEXT,
            factors     TEXT   -- JSON array
        )
    """)

    cur.execute("SELECT hex_id, demand, land_cost, hybrid_score, region, charger_type, placement FROM hex_zones ORDER BY hybrid_score DESC LIMIT 50")
    rows = cur.fetchall()

    for row in rows:
        hid, demand, land, hybrid, region, charger, placement = row
        land_inv = max(0, 100 - land // 5)

        factors = []
        if demand >= 80:
            factors.append(f"Very high EV demand ({demand}/100)")
        elif demand >= 60:
            factors.append(f"High EV demand ({demand}/100)")
        else:
            factors.append(f"Moderate EV demand ({demand}/100)")

        if land_inv >= 70:
            factors.append(f"Affordable land (₹{land}L/ac → score {land_inv}/100)")
        elif land_inv >= 50:
            factors.append(f"Moderate land cost (₹{land}L/ac)")
        else:
            factors.append(f"High land cost (₹{land}L/ac) — justified by extreme demand")

        factors.append(f"Charger type: {charger}")
        factors.append(f"Placement: {placement} — {'hub anchors full hex' if placement=='center' else 'vertex serves 3 hexes simultaneously'}")

        reason = f"{region} zone — hybrid score {hybrid}/100. " + ". ".join(factors[:2]) + "."

        import json
        cur.execute("INSERT OR REPLACE INTO hex_explanations VALUES (?,?,?)",
                    (hid, reason, json.dumps(factors)))

    con.commit()
    con.close()
    print(f"✓ Explanations seeded for top 50 hexes")

if __name__ == "__main__":
    generate_explanations()