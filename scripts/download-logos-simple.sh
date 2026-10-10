#!/bin/bash

# Download high-quality logos for all providers from Clearbit Logo API

PROVIDERS_DIR="$(dirname "$0")/../frontend/public/providers"
mkdir -p "$PROVIDERS_DIR"

echo "Downloading logos from Clearbit API..."

# Function to URL encode
urlencode() {
    local string="$1"
    echo -n "$string" | sed 's/ /%20/g' | sed 's/&/%26/g' | sed "s/'/%27/g" | sed 's/"/%22/g' | sed 's/\//%2F/g'
}

# Define all providers
PROVIDERS=(
    "swiggy:swiggy"
    "zomato:zomato"
    "zepto:zepto"
    "blinkit:blinkit"
    "instamart:instamart"
    "dominos:dominos pizza"
    "mcdonalds:mcdonalds"
    "starbucks:starbucks"
    "amazon:amazon"
    "flipkart:flipkart"
    "myntra:myntra"
    "meesho:meesho"
    "nykaa:nykaa"
    "uber:uber"
    "apple:apple"
    "apollo:apollo hospitals"
    "pharmeasy:pharmeasy"
    "hdfc:hdfc bank"
    "sbi:state bank of india"
    "icici:icici bank"
    "airtel:airtel"
    "croma:croma"
    "nike:nike"
    "adidas:adidas"
    "bata:bata"
    "ikea:ikea"
    "dmart:dmart"
    "bigbasket:bigbasket"
    "firstcry:first cry"
)

success=0
failed=0

for entry in "${PROVIDERS[@]}"; do
    provider="${entry%%:*}"
    company="${entry##*:}"
    output_file="$PROVIDERS_DIR/$provider.svg"

    # URL encode the company name
    company_encoded=$(urlencode "$company")
    url="https://logo.clearbit.com/$company_encoded.svg"

    # Download logo
    if curl -s -f -o "$output_file" "$url" 2>/dev/null; then
        echo "✓ $provider"
        ((success++))
        sleep 0.15
    else
        echo "✗ $provider"
        ((failed++))
        sleep 0.05
    fi
done

echo ""
echo "✓ Successfully downloaded: $success"
if [ $failed -gt 0 ]; then
    echo "✗ Failed: $failed"
fi
