#!/usr/bin/env python3
"""
Download high-quality logos for all providers from Clearbit Logo API.
Clearbit provides free access to high-quality company logos via their public API.
"""

import os
import sys
import requests
import time
from pathlib import Path
from urllib.parse import quote

# Map provider names to company names for Clearbit
PROVIDER_LOGOS = {
    # Food & Delivery
    "swiggy": "swiggy",
    "zomato": "zomato",
    "zepto": "zepto",
    "blinkit": "blinkit",
    "instamart": "instamart",
    "eatsure": "eatsure",
    "bistro": "bistro",
    "pronto": "pronto",
    "dominos": "dominos pizza",
    "pizzahut": "pizza hut",
    "lapinoz": "la pinoz",
    "mcdonalds": "mcdonalds",
    "kfc": "kfc",
    "burger-king": "burger king",
    "starbucks": "starbucks",
    "chaayos": "chaayos",

    # Shopping & Retail
    "amazon": "amazon",
    "flipkart": "flipkart",
    "myntra": "myntra",
    "meesho": "meesho",
    "tata-cliq": "tata cliq",
    "croma": "croma",
    "bewakoof": "bewakoof",
    "snitch": "snitch",
    "souled-store": "the souled store",
    "uniqlo": "uniqlo",
    "marks-spencer": "marks and spencer",

    # Fashion & Lifestyle
    "nykaa": "nykaa",
    "westside": "westside",
    "pantaloons": "pantaloons",
    "levis": "levi's",
    "max-fashion": "max fashion",
    "lifestyle": "lifestyle stores",
    "shoppers-stop": "shoppers stop",
    "zara": "zara",
    "hm": "h&m",
    "decathlon": "decathlon",
    "nike": "nike",
    "adidas": "adidas",
    "puma": "puma",
    "bata": "bata",
    "skechers": "skechers",
    "woodland": "woodland",
    "metro-shoes": "metro shoes",
    "allen-solly": "allen solly",
    "peter-england": "peter england",
    "van-heusen": "van heusen",
    "louis-philippe": "louis philippe",
    "fabindia": "fabindia",
    "biba": "biba",
    "w-for-woman": "w for women",
    "lenskart": "lenskart",
    "titan": "titan",
    "tanishq": "tanishq",
    "boat": "boat",
    "mamaearth": "mamaearth",
    "sugar-cosmetics": "sugar cosmetics",
    "purplle": "purplle",

    # Grocery & Home
    "dmart": "dmart",
    "bigbasket": "bigbasket",
    "ikea": "ikea",
    "wakefit": "wakefit",
    "urban-company": "urban company",
    "firstcry": "first cry",
    "furlenco": "furlenco",

    # Travel & Transport
    "uber": "uber",
    "rapido": "rapido",
    "nammayatri": "namma yatri",
    "makemytrip": "make my trip",

    # Healthcare & Pharmacy
    "apollo": "apollo hospitals",
    "pharmeasy": "pharmeasy",
    "netmeds": "netmeds",
    "tata-1mg": "1mg",
    "cultfit": "cult.fit",

    # Banks
    "hdfc": "hdfc bank",
    "sbi": "state bank of india",
    "icici": "icici bank",
    "axis": "axis bank",

    # Telecom & Utilities
    "airtel": "airtel",
    "jio": "jio",
    "reliance-trends": "reliance trends",
    "reliance-digital": "reliance digital",
    "reliance-fresh": "reliance fresh",
    "reliance-retail": "reliance retail",
    "smart-bazaar": "smartbazaar",
    "ajio": "ajio",
    "jiomart": "jiomart",

    # Other
    "apple": "apple",
    "office-cafeteria": "office cafeteria",
    "ownly": "ownly",
    "swish": "swish",
}

def download_logo(company_name: str, output_file: str, retries: int = 3) -> bool:
    """Download logo from Clearbit API and save as SVG."""

    # Clearbit Logo API
    url = f"https://logo.clearbit.com/{quote(company_name.lower())}.svg"

    for attempt in range(retries):
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                # Save the logo
                with open(output_file, 'wb') as f:
                    f.write(response.content)
                print(f"✓ Downloaded {company_name} -> {Path(output_file).name}")
                return True
            else:
                if attempt < retries - 1:
                    time.sleep(0.5)
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(0.5)
            else:
                print(f"✗ Failed {company_name}: {e}")
                return False

    return False

def main():
    """Download all provider logos."""

    providers_dir = Path(__file__).parent.parent / "frontend" / "public" / "providers"

    if not providers_dir.exists():
        print(f"Error: {providers_dir} does not exist")
        sys.exit(1)

    print(f"Downloading logos to {providers_dir}")
    print(f"Total providers: {len(PROVIDER_LOGOS)}\n")

    success_count = 0
    failed_providers = []

    for provider, company_name in sorted(PROVIDER_LOGOS.items()):
        output_file = providers_dir / f"{provider}.svg"

        if download_logo(company_name, str(output_file)):
            success_count += 1
            time.sleep(0.2)  # Rate limiting
        else:
            failed_providers.append(provider)
            time.sleep(0.1)

    print(f"\n✓ Successfully downloaded: {success_count}/{len(PROVIDER_LOGOS)}")

    if failed_providers:
        print(f"\n✗ Failed downloads ({len(failed_providers)}):")
        for provider in failed_providers:
            print(f"  - {provider}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(0)
