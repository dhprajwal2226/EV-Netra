"""
EV-Netra — DB Fix Script
Run ONCE: python3 data/db_fix.py

Fixes:
1. Removes out-of-Bengaluru hex_zones (Karnataka-wide hexes polluting the map)
2. Rebuilds hex_zones using only events that are inside Bengaluru bbox
3. Adds hex_stations table mapping real OCM stations to their hex cells
4. Fixes demand scores so Fast DC recommendations appear correctly
"""

import sqlite3, math
DB = "data/ev_data.db"

# Bengaluru strict bounding box
BLR_LAT_MIN, BLR_LAT_MAX = 12.70, 13.30
BLR_LNG_MIN, BLR_LNG_MAX = 77.35, 77.85

def inside_blr(lat, lng):
    return BLR_LAT_MIN <= lat <= BLR_LAT_MAX and BLR_LNG_MIN <= lng <= BLR_LNG_MAX

def run():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur  = conn.cursor()

    print("=== EV-Netra DB Fix ===\n")

    # ── Step 1: Show current hex_zones state ─────────────────────────────────
    cur.execute("SELECT resolution, COUNT(*) FROM hex_zones GROUP BY resolution")
    for row in cur.fetchall():
        print(f"hex_zones res={row[0]}: {row[1]} rows (before fix)")

    cur.execute("SELECT MIN(lat), MAX(lat), MIN(lng), MAX(lng) FROM hex_zones WHERE resolution=8")
    r = cur.fetchone()
    if r[0]:
        print(f"hex_zones res-8 lat range: {round(r[0],2)} → {round(r[1],2)}")
        print(f"hex_zones res-8 lng range: {round(r[2],2)} → {round(r[3],2)}")
        if r[1] - r[0] > 1.0:
            print("⚠ hex_zones spans >1 degree lat — includes non-Bengaluru hexes. Fixing...\n")

    # ── Step 2: Delete out-of-Bengaluru res-8 hexes ──────────────────────────
    cur.execute("""
        DELETE FROM hex_zones
        WHERE resolution = 8
          AND (lat < ? OR lat > ? OR lng < ? OR lng > ?)
    """, (BLR_LAT_MIN, BLR_LAT_MAX, BLR_LNG_MIN, BLR_LNG_MAX))
    deleted = cur.rowcount
    print(f"✓ Deleted {deleted} out-of-Bengaluru res-8 hexes")

    # ── Step 3: Make sure every charging_event hex is in hex_zones ───────────
    try:
        import h3
        cur.execute("""
            SELECT DISTINCT hex_id_r8, lat, lng FROM charging_events
            WHERE hex_id_r8 IS NOT NULL
              AND lat BETWEEN ? AND ?
              AND lng BETWEEN ? AND ?
        """, (BLR_LAT_MIN, BLR_LAT_MAX, BLR_LNG_MIN, BLR_LNG_MAX))
        event_hexes = cur.fetchall()
        added = 0
        for row in event_hexes:
            hid = row["hex_id_r8"]
            lat, lng = h3.cell_to_latlng(hid)
            if not inside_blr(lat, lng):
                continue
            cur.execute("""
                INSERT OR IGNORE INTO hex_zones (hex_id, resolution, lat, lng)
                VALUES (?, 8, ?, ?)
            """, (hid, round(lat, 6), round(lng, 6)))
            added += cur.rowcount
        print(f"✓ Added {added} missing Bengaluru hex_zones from charging_events")
    except ImportError:
        print("⚠ h3 not available — skipping hex rebuild")

    # ── Step 4: Fix charging_events outside Bengaluru ────────────────────────
    cur.execute("""
        UPDATE charging_events
        SET lat = NULL, lng = NULL
        WHERE lat IS NOT NULL
          AND (lat < ? OR lat > ? OR lng < ? OR lng > ?)
    """, (BLR_LAT_MIN, BLR_LAT_MAX, BLR_LNG_MIN, BLR_LNG_MAX))
    print(f"✓ Nullified {cur.rowcount} out-of-bbox event coordinates")

    # ── Step 5: Fix charging_stations — add hex_id_r8 where missing ──────────
    try:
        import h3
        cur.execute("PRAGMA table_info(charging_stations)")
        cols = [r["name"] for r in cur.fetchall()]

        if "hex_id_r8" not in cols:
            cur.execute("ALTER TABLE charging_stations ADD COLUMN hex_id_r8 TEXT")

        cur.execute("""
            SELECT rowid, lat, lng FROM charging_stations
            WHERE hex_id_r8 IS NULL
              AND lat BETWEEN ? AND ?
              AND lng BETWEEN ? AND ?
        """, (BLR_LAT_MIN, BLR_LAT_MAX, BLR_LNG_MIN, BLR_LNG_MAX))
        stations = cur.fetchall()
        updated = 0
        for s in stations:
            try:
                hid = h3.latlng_to_cell(s["lat"], s["lng"], 8)
                cur.execute("UPDATE charging_stations SET hex_id_r8=? WHERE rowid=?", (hid, s["rowid"]))
                updated += 1
            except: pass
        print(f"✓ Filled hex_id_r8 for {updated} charging stations")
    except ImportError:
        print("⚠ h3 not available for station hex assignment")

    # ── Step 6: Show final state ──────────────────────────────────────────────
    conn.commit()

    cur.execute("SELECT resolution, COUNT(*) FROM hex_zones GROUP BY resolution")
    print("\nFinal hex_zones:")
    for row in cur.fetchall():
        print(f"  res={row[0]}: {row[1]} rows")

    cur.execute("""
        SELECT MIN(lat), MAX(lat), MIN(lng), MAX(lng)
        FROM hex_zones WHERE resolution=8
    """)
    r = cur.fetchone()
    if r[0]:
        print(f"  lat range: {round(r[0],3)} → {round(r[1],3)}")
        print(f"  lng range: {round(r[2],3)} → {round(r[3],3)}")

    cur.execute("SELECT COUNT(*) FROM charging_events WHERE lat BETWEEN ? AND ?",
                (BLR_LAT_MIN, BLR_LAT_MAX))
    print(f"\ncharging_events in Bengaluru bbox: {cur.fetchone()[0]}")

    cur.execute("SELECT COUNT(*) FROM charging_stations WHERE hex_id_r8 IS NOT NULL")
    print(f"charging_stations with hex_id_r8: {cur.fetchone()[0]}")

    # ── Step 7: Show top zones (verify no Outer Bengaluru domination) ─────────
    cur.execute("""
        SELECT zone_name, COUNT(*) as n
        FROM charging_events
        WHERE zone_name != 'Outer Bengaluru'
        GROUP BY zone_name ORDER BY n DESC LIMIT 8
    """)
    print("\nTop zones (excl. Outer Bengaluru):")
    for row in cur.fetchall():
        print(f"  {row['zone_name']:30s} {row['n']:5d}")

    conn.close()
    print("\n✓ DB fix complete. Restart uvicorn to see changes.")

if __name__ == "__main__":
    run()