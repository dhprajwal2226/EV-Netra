import sqlite3, random, math, os
from datetime import datetime, timedelta

try:
    import h3
    def to_hex(lat, lng, res): return h3.latlng_to_cell(lat, lng, res)
    print("✓ H3 library found")
except ImportError:
    print("⚠ H3 not found — run: pip install h3")
    def to_hex(lat, lng, res):
        ql = round(lat * (2**res)); qn = round(lng * (2**res))
        return f"stub_{res}_{int(ql)}_{int(qn)}"

ZONES = [
    ("Koramangala",     12.9352, 77.6245, 0.018, 2.4),
    ("Whitefield",      12.9698, 77.7499, 0.022, 2.1),
    ("Electronic City", 12.8458, 77.6629, 0.020, 1.9),
    ("Indiranagar",     12.9784, 77.6408, 0.015, 1.8),
    ("HSR Layout",      12.9081, 77.6476, 0.016, 1.7),
    ("Marathahalli",    12.9562, 77.7010, 0.018, 1.6),
    ("MG Road",         12.9758, 77.6095, 0.012, 1.8),
    ("BTM Layout",      12.9166, 77.6101, 0.014, 1.5),
    ("Sarjapur Road",   12.9010, 77.6850, 0.022, 1.5),
    ("Jayanagar",       12.9299, 77.5826, 0.015, 1.3),
    ("Hebbal",          13.0354, 77.5950, 0.016, 1.3),
    ("Rajajinagar",     12.9915, 77.5530, 0.015, 1.2),
    ("Malleshwaram",    13.0030, 77.5630, 0.013, 1.2),
    ("JP Nagar",        12.9077, 77.5850, 0.015, 1.2),
    ("Yelahanka",       13.1004, 77.5963, 0.018, 1.0),
    ("Banashankari",    12.9255, 77.5468, 0.016, 1.0),
    ("Kengeri",         12.9080, 77.4830, 0.018, 0.8),
    ("Devanahalli",     13.2488, 77.7121, 0.025, 0.7),
    ("Anekal",          12.7138, 77.6960, 0.022, 0.6),
    ("Doddaballapur",   13.2960, 77.5370, 0.025, 0.5),
]

RURAL = [
    ("Tumkur",         13.3379, 77.1017, 34, "Tumkur"),
    ("Hoskote",        13.0704, 77.7980, 28, "Bengaluru Rural"),
    ("Ramanagara",     12.7157, 77.2817, 22, "Ramanagara"),
    ("Kolar",          13.1360, 78.1294, 19, "Kolar"),
    ("Chikkaballapur", 13.4355, 77.7280, 17, "Chikkaballapur"),
    ("Mandya",         12.5224, 76.8950, 15, "Mandya"),
    ("Hassan",         13.0074, 76.0960, 14, "Hassan"),
    ("Mysuru",         12.2958, 76.6394, 13, "Mysuru"),
    ("Chitradurga",    14.2251, 76.3980, 11, "Chitradurga"),
    ("Davanagere",     14.4644, 75.9218, 10, "Davanagere"),
    ("Shivamogga",     13.9299, 75.5681,  9, "Shivamogga"),
    ("Dharwad",        15.4589, 75.0078,  8, "Dharwad"),
]

ZONES_WITH_STATIONS = [
    "Koramangala","Whitefield","Indiranagar",
    "MG Road","Electronic City","Marathahalli"
]

def pick_zone():
    total = sum(z[4] for z in ZONES)
    r = random.random() * total
    cum = 0.0
    for z in ZONES:
        cum += z[4]
        if r < cum: return z
    return ZONES[0]

def point_in_zone(zone):
    _, lc, nc, spread, _ = zone
    lat = max(12.70, min(13.30, random.gauss(lc, spread)))
    lng = max(77.40, min(77.85, random.gauss(nc, spread)))
    return round(lat, 6), round(lng, 6)

def hour_weight(h):
    if   1  <= h <= 5:  return 0.10
    elif 6  <= h <= 9:  return 1.60
    elif 10 <= h <= 12: return 0.80
    elif 13 <= h <= 15: return 0.70
    elif 16 <= h <= 18: return 1.10
    elif 19 <= h <= 21: return 1.90
    elif 22 <= h <= 23: return 0.60
    else:               return 0.30

def grid_load(h):
    base = 44
    m = 22 * math.exp(-0.5 * ((h - 8)  / 1.5) ** 2)
    e = 34 * math.exp(-0.5 * ((h - 19) / 1.8) ** 2)
    return round(min(98, max(12, base + m + e + random.gauss(0, 2.5))), 1)

def make_events(n=2000):
    events = []
    base = datetime(2024, 12, 1)
    hw = [hour_weight(h) for h in range(24)]
    for i in range(n):
        zone = pick_zone()
        lat, lng = point_in_zone(zone)
        day = random.randint(0, 29)
        hour = random.choices(range(24), weights=hw)[0]
        ts = base + __import__('datetime').timedelta(days=day, hours=hour, minutes=random.randint(0,59))
        vtype = random.choices(["car","scooter","bus","auto"], weights=[0.45,0.35,0.10,0.10])[0]
        kwh = round(random.uniform(*{"car":(15,65),"scooter":(3,14),"bus":(45,130),"auto":(5,16)}[vtype]), 2)
        events.append({
            "session_id":    f"SES{i:05d}",
            "lat":            lat, "lng": lng,
            "zone_name":      zone[0],
            "vehicle_type":   vtype,
            "kwh":            kwh,
            "duration_min":   round(kwh * random.uniform(0.35, 0.75), 1),
            "cost_inr":       round(kwh * (6.50 if (hour < 6 or hour >= 22) else 8.00), 2),
            "timestamp":      ts.isoformat(),
            "hour":           hour,
            "day_of_week":    ts.weekday(),
            "hex_id_r8":      to_hex(lat, lng, 8),
            "hex_id_r7":      to_hex(lat, lng, 7),
            "grid_load_pct":  grid_load(hour),
        })
    return events

def make_stations():
    stations = []; sid = 0
    for zone in ZONES:
        if zone[0] not in ZONES_WITH_STATIONS: continue
        for _ in range(random.randint(1, 3)):
            lat, lng = point_in_zone(zone)
            stations.append({
                "station_id":   f"STN{sid:04d}",
                "name":          f"{zone[0]} EV Point {sid}",
                "lat":            round(lat,6), "lng": round(lng,6),
                "zone_name":      zone[0],
                "charger_type":   random.choice(["slow_ac","fast_dc","ultra_fast"]),
                "ports":          random.randint(2, 8),
                "hex_id_r8":      to_hex(lat, lng, 8),
                "operator":       random.choice(["BESCOM","Tata Power","ChargeZone","Ather","BPCL"]),
            }); sid += 1
    return stations

def make_rural():
    rural = []
    for name, lat, lng, growth, district in RURAL:
        ev_reg = int(growth * random.uniform(9, 16))
        existing = random.randint(0, 2)
        rural.append({
            "taluk": name, "lat": lat, "lng": lng,
            "hex_id_r7":         to_hex(lat, lng, 7),
            "ev_growth_pct":     growth,
            "ev_registrations":  ev_reg,
            "stations_existing": existing,
            "stations_needed":   max(0, math.ceil(ev_reg/20) - existing),
            "priority":          "high" if growth>=20 else ("medium" if growth>=12 else "low"),
            "district":          district,
        })
    return rural

def create_database(db_path="data/ev_data.db"):
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path); c = conn.cursor()
    c.executescript("""
        DROP TABLE IF EXISTS charging_events;
        DROP TABLE IF EXISTS charging_stations;
        DROP TABLE IF EXISTS rural_taluks;
        CREATE TABLE charging_events (
            session_id TEXT PRIMARY KEY, lat REAL, lng REAL,
            zone_name TEXT, vehicle_type TEXT, kwh REAL,
            duration_min REAL, cost_inr REAL, timestamp TEXT,
            hour INTEGER, day_of_week INTEGER,
            hex_id_r8 TEXT, hex_id_r7 TEXT, grid_load_pct REAL
        );
        CREATE TABLE charging_stations (
            station_id TEXT PRIMARY KEY, name TEXT,
            lat REAL, lng REAL, zone_name TEXT,
            charger_type TEXT, ports INTEGER,
            hex_id_r8 TEXT, operator TEXT
        );
        CREATE TABLE rural_taluks (
            taluk TEXT PRIMARY KEY, lat REAL, lng REAL,
            hex_id_r7 TEXT, ev_growth_pct REAL,
            ev_registrations INTEGER, stations_existing INTEGER,
            stations_needed INTEGER, priority TEXT, district TEXT
        );
    """)
    events = make_events(2000)
    stations = make_stations()
    rural = make_rural()
    c.executemany("INSERT INTO charging_events VALUES (:session_id,:lat,:lng,:zone_name,:vehicle_type,:kwh,:duration_min,:cost_inr,:timestamp,:hour,:day_of_week,:hex_id_r8,:hex_id_r7,:grid_load_pct)", events)
    c.executemany("INSERT INTO charging_stations VALUES (:station_id,:name,:lat,:lng,:zone_name,:charger_type,:ports,:hex_id_r8,:operator)", stations)
    c.executemany("INSERT INTO rural_taluks VALUES (:taluk,:lat,:lng,:hex_id_r7,:ev_growth_pct,:ev_registrations,:stations_existing,:stations_needed,:priority,:district)", rural)
    conn.commit(); conn.close()

    print(f"\n✓ Database created: {db_path}")
    print(f"  {len(events):,} charging events")
    print(f"  {len(stations):,} charging stations")
    print(f"  {len(rural):,} rural taluks")
    zone_counts = {}
    for e in events: zone_counts[e["zone_name"]] = zone_counts.get(e["zone_name"],0)+1
    print("\n  Top 5 zones:")
    for name, cnt in sorted(zone_counts.items(), key=lambda x:-x[1])[:5]:
        print(f"    {name:<22} {cnt:>4}  {'█'*(cnt//35)}")
    print("\n  Phase 1 complete ✓\n")

if __name__ == "__main__":
    create_database()