import sys
import json
from fast_flights import FlightData, Passengers, Result, get_flights
from airportsdata import load

# Major Indian airports mapping (city_name: airport_code)
INDIA_AIRPORTS = {
    "delhi": "DEL",
    "mumbai": "BOM",
    "bangalore": "BLR",
    "bengaluru": "BLR",
    "chennai": "MAA",
    "kolkata": "CCU",
    "hyderabad": "HYD",
    "ahmedabad": "AMD",
    "goa": "GOI",
    "kochi": "COK",
    "jaipur": "JAI",
    "pune": "PNQ",
    "lucknow": "LKO",
    "coimbatore": "CJB",
    "trivandrum": "TRV",
    "thiruvananthapuram": "TRV",
    "varanasi": "VNS",
    "visakhapatnam": "VTZ",
    "amritsar": "ATQ",
    "bhubaneswar": "BBI",
    "srinagar": "SXR",
    "guwahati": "GAU",
    "indore": "IDR",
    "nagpur": "NAG",
    "patna": "PAT",
    "madurai": "IXM",
    "rajkot": "RAJ",
    "vadodara": "BDQ",
    "surat": "STV",
    "ranchi": "IXR",
    "jodhpur": "JDH",
    "dehradun": "DED",
    "agartala": "IXA",
    "chandigarh": "IXC",
    "tiruchirappalli": "TRZ",
    "mangalore": "IXE",
    "aurangabad": "IXU",
    "udaipur": "UDR",
    "gaya": "GAY",
    "dibrugarh": "DIB",
    "dimapur": "DMU",
    "imphal": "IMF",
    "silchar": "IXS",
    "jammu": "IXJ",
    "leh": "IXL",
    "port blair": "IXZ",
    "bagdogra": "IXB",
    "kanpur": "KNU",
    "bareilly": "BEK",
    "belgaum": "IXG",
    "dharamshala": "DHM",
    "gwalior": "GWL",
    "hubli": "HBX",
    "jabalpur": "JLR",
    "kannur": "CNN",
    "kolhapur": "KLH",
    "mysore": "MYQ",
    "pantnagar": "PGH",
    "shillong": "SHL",
    "tezpur": "TEZ",
    "tuticorin": "TCR",
    "vijayawada": "VGA"
}

# Usage: python a.py <from_city> <to_city> <start_date> <end_date>
if len(sys.argv) != 5:
    print(json.dumps({"error": "Usage: python a.py <from_city> <to_city> <start_date> <end_date>"}))
    sys.exit(1)

from_city = sys.argv[1].strip().lower()
to_city = sys.argv[2].strip().lower()
start_date = sys.argv[3]
end_date = sys.argv[4]

def get_airport_code(city_name):
    # Try major Indian airports first
    if city_name in INDIA_AIRPORTS:
        return INDIA_AIRPORTS[city_name]
    # Fallback: try partial match
    for key in INDIA_AIRPORTS:
        if city_name in key:
            return INDIA_AIRPORTS[key]
    return None

from_airport = get_airport_code(from_city)
to_airport = get_airport_code(to_city)

if not from_airport or not to_airport:
    print(json.dumps({"error": f"Could not find airport for city: {from_city if not from_airport else to_city}"}))
    sys.exit(1)

flight_data = [
    FlightData(date=start_date, from_airport=from_airport, to_airport=to_airport),
    FlightData(date=end_date, from_airport=to_airport, to_airport=from_airport)
]

result: Result = get_flights(
    flight_data=flight_data,
    trip="round-trip",
    seat="economy",
    passengers=Passengers(adults=1, children=0, infants_in_seat=0, infants_on_lap=0),
    fetch_mode="fallback",
)

# Normalize to only 2 flights (depart + return) and compute total price if present
try:
    flights = getattr(result, 'flights', []) or []
    selected = flights[:2]
    def parse_price(p):
        if isinstance(p, (int, float)):
            return float(p)
        if isinstance(p, str):
            import re
            s = re.sub(r"[^0-9.]", "", p)
            try:
                return float(s) if s else 0.0
            except:
                return 0.0
        return 0.0
    total = sum(parse_price(getattr(f, 'price', 0)) for f in selected)
    payload = {"flights": [f.__dict__ if hasattr(f, '__dict__') else f for f in selected], "totalPrice": total}
    print(json.dumps(payload, default=lambda o: o.__dict__, ensure_ascii=False))
except Exception:
    # Fallback to original
    print(json.dumps(result, default=lambda o: o.__dict__, ensure_ascii=False))