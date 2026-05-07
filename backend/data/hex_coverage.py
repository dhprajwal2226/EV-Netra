"""
EV-Netra — Hex Coverage Builder
Builds H3 hexagonal grid for Karnataka (Res 7) and Bengaluru (Res 8).
Compatible with H3 version 4+

Run: python data/hex_coverage.py
"""

import sqlite3
import h3
from pathlib import Path

DB = Path(__file__).parent / "ev_data.db"

# ── Karnataka bounding box (Res 7 — district level, ~5 km² per hex) ──────────
KAR_BBOX = [
    [74.0, 11.5], [78.5, 11.5],
    [78.5, 18.5], [74.0, 18.5],
    [74.0, 11.5],
]

# ── Bengaluru bounding box (Res 8 — locality level, ~0.74 km² per hex) ───────
BLR_BBOX = [
    [77.42, 12.72], [77.82, 12.72],
    [77.82, 13.27], [77.42, 13.27],
    [77.42, 12.72],
]


def polyfill(coords_lnglat, resolution):
    """
    Fill a bounding box polygon with H3 cells.
    Works with H3 version 4+
    coords_lnglat: list of [lng, lat] pairs (GeoJSON order)
    """
    geojson_polygon = {
        "type": "Polygon",
        "coordinates": [coords_lnglat]
    }
    try:
        # H3 v4 API
        from h3 import geo_to_h3shape, h3shape_to_cells
        shape = geo_to_h3shape(geojson_polygon)
        return list(h3shape_to_cells(shape, resolution))
    except (ImportError, AttributeError):
        # H3 v3 fallback
        return list(h3.polyfill_geojson(geojson_polygon, resolution))


def cell_center(hex_id):
    """Get (lat, lng) center of a hex cell. Works with H3 v4+"""
    try:
        return h3.cell_to_latlng(hex_id)   # H3 v4
    except AttributeError:
        return h3.h3_to_geo(hex_id)        # H3 v3


def build_hex_table():
    conn = sqlite3.connect(DB)
    c    = conn.cursor()

    # Create table
    c.execute("DROP TABLE IF EXISTS hex_zones")
    c.execute("""
        CREATE TABLE hex_zones (
            hex_id        TEXT PRIMARY KEY,
            resolution    INTEGER,
            lat           REAL,
            lng           REAL,
            region        TEXT,
            demand        INTEGER,
            land_cost     INTEGER,
            hybrid_score  INTEGER,
            charger_type  TEXT,
            placement     TEXT
        )
    """)

    inserted_kar = 0
    inserted_blr = 0

    # ── Karnataka Res 7 ───────────────────────────────────────────────────────
    print("Building Karnataka resolution-7 hexes...")
    kar_hexes = polyfill(KAR_BBOX, resolution=7)
    for hid in kar_hexes:
        lat, lng = cell_center(hid)
        demand   = 40
        land     = 15
        hybrid   = round(demand * 0.65 + max(0, 100 - land / 5) * 0.35)
        charger  = "AC 22kW" if demand < 50 else ("DC 50kW" if demand < 75 else "DC Fast 150kW")
        placement = "vertex" if demand < 55 else "center"
        c.execute(
            "INSERT OR REPLACE INTO hex_zones VALUES (?,?,?,?,?,?,?,?,?,?)",
            (hid, 7, lat, lng, "Karnataka", demand, land, hybrid, charger, placement)
        )
        inserted_kar += 1

    # ── Bengaluru Res 8 ───────────────────────────────────────────────────────
    print("Building Bengaluru resolution-8 hexes...")
    blr_hexes = polyfill(BLR_BBOX, resolution=8)
    for hid in blr_hexes:
        lat, lng = cell_center(hid)
        c.execute(
            "INSERT OR REPLACE INTO hex_zones VALUES (?,?,?,?,?,?,?,?,?,?)",
            (hid, 8, lat, lng, "Bengaluru", 90, 400, 72, "DC Fast 150kW", "center")
        )
        inserted_blr += 1

    conn.commit()
    conn.close()

    total = inserted_kar + inserted_blr
    print(f"\n✓ hex_zones table built successfully")
    print(f"  {inserted_kar:,} Karnataka hexes  (Resolution 7)")
    print(f"  {inserted_blr:,} Bengaluru hexes  (Resolution 8)")
    print(f"  {total:,} total hexes in database")
    print(f"\n  Phase 0 Step 2 complete ✓\n")


if __name__ == "__main__":
    build_hex_table()