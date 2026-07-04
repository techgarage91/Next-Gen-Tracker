"""Default catalog seeds for a new shop (compact, users can extend)."""

BM_DEFAULT = {
    "Apple": ["iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16", "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15", "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14", "iPhone 13 Pro Max", "iPhone 13", "iPhone 12", "iPhone 11", "iPhone SE (3rd Gen)"],
    "Samsung": ["Galaxy S25 Ultra", "Galaxy S25+", "Galaxy S25", "Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S23 Ultra", "Galaxy S23", "Galaxy Z Fold 6", "Galaxy Z Flip 6", "Galaxy A55", "Galaxy A35", "Galaxy A15", "Galaxy M35", "Galaxy Note 20 Ultra"],
    "OnePlus": ["13", "12R", "12", "11R", "11", "Nord 4", "Nord CE4", "Nord 3", "10 Pro", "10R", "9 Pro", "9R", "8T"],
    "Xiaomi": ["15 Pro", "15", "14 Ultra", "14 Pro", "14", "13 Pro", "13", "12 Pro", "12", "11 Ultra", "11 Lite"],
    "Redmi": ["Note 14 Pro+", "Note 14 Pro", "Note 14", "Note 13 Pro+", "Note 13 Pro", "Note 13", "Note 12 Pro", "Note 12", "13C", "12C", "A3"],
    "Realme": ["14 Pro+", "14 Pro", "13 Pro+", "13 Pro", "12 Pro+", "12 Pro", "11 Pro+", "GT 6", "Narzo 70 Pro", "C67", "C55"],
    "Oppo": ["Find X8 Pro", "Find X8", "Reno 13 Pro", "Reno 12 Pro", "Reno 12", "Reno 11 Pro", "F27 Pro+", "F25 Pro", "A79", "A59", "A38"],
    "Vivo": ["X200 Pro", "X200", "X100 Pro", "V40 Pro", "V40", "V30 Pro", "V29", "T3 Pro", "Y200", "Y100", "Y28"],
    "Nokia": ["G42", "G22", "G21", "C32", "C22", "XR21", "8.3", "5.4"],
    "Motorola": ["Edge 60 Pro", "Edge 50 Ultra", "Edge 50 Pro", "Edge 50 Fusion", "G85", "G64", "G45", "G34", "Razr 50 Ultra", "Razr 50"],
    "Sony": ["Xperia 1 VI", "Xperia 5 VI", "Xperia 10 VI", "Xperia 1 V", "Xperia 5 V", "Xperia 10 V"],
    "Google": ["Pixel 9 Pro XL", "Pixel 9 Pro", "Pixel 9", "Pixel 8a", "Pixel 8 Pro", "Pixel 8", "Pixel 7a", "Pixel 7 Pro", "Pixel 6a"],
    "POCO": ["F7 Ultra", "F6 Pro", "F6", "X7 Pro", "X6 Pro", "X6", "M7 Pro", "M6 Pro", "C75", "C65"],
}

PROBS_DEFAULT = ["Screen Cracked / Broken", "Screen Not Displaying", "Touch Screen Not Working", "Battery Draining Fast", "Battery Not Charging", "Swollen Battery", "Charging Port Damaged", "Speaker Not Working", "Earpiece Not Working", "Microphone Issue", "Front Camera Not Working", "Rear Camera Not Working", "Camera Blurry / Foggy", "Back Glass Broken", "Frame / Body Damaged", "Water / Liquid Damage", "Phone Not Turning On", "Boot Loop / Stuck on Logo", "Software Crash / Hang", "Power Button Not Working", "Volume Buttons Not Working", "Fingerprint Sensor Issue", "Face ID Not Working", "Wi-Fi Not Working", "Bluetooth Issue", "Mobile Data Issue", "SIM Card Not Detected", "Overheating", "Phone Restarting Randomly", "No Sound / Audio Issue"]

PARTS_DEFAULT = ["Display / Screen Replacement", "Touch Glass Replacement", "Battery Replacement", "Charging Port Repair / Replacement", "Speaker Repair / Replacement", "Earpiece Repair / Replacement", "Microphone Repair / Replacement", "Front Camera Replacement", "Rear Camera Replacement", "Back Glass Replacement", "Middle Frame / Housing Replacement", "Power Button Flex Replacement", "Volume Button Flex Replacement", "Fingerprint Sensor Repair", "Face ID / Sensor Repair", "SIM Tray Replacement", "Motherboard Repair", "IC Replacement", "Water Damage Cleaning / Repair", "Software Repair / Flashing", "Wi-Fi / Bluetooth Antenna Repair", "Vibration Motor Replacement"]

CURRENCIES = [
    {"code": "INR", "symbol": "\u20b9", "name": "Indian Rupee"},
    {"code": "USD", "symbol": "$", "name": "US Dollar"},
    {"code": "EUR", "symbol": "\u20ac", "name": "Euro"},
    {"code": "GBP", "symbol": "\u00a3", "name": "British Pound"},
    {"code": "AED", "symbol": "\u062f.\u0625", "name": "UAE Dirham"},
    {"code": "PKR", "symbol": "\u20a8", "name": "Pakistani Rupee"},
    {"code": "NGN", "symbol": "\u20a6", "name": "Nigerian Naira"},
    {"code": "ZAR", "symbol": "R", "name": "South African Rand"},
    {"code": "AUD", "symbol": "A$", "name": "Australian Dollar"},
    {"code": "CAD", "symbol": "C$", "name": "Canadian Dollar"},
]
