#!/bin/bash

# Download high-quality logos for all providers from Clearbit Logo API
# Clearbit provides free access to high-quality company logos

PROVIDERS_DIR="$(dirname "$0")/../frontend/public/providers"

# Create directory if it doesn't exist
mkdir -p "$PROVIDERS_DIR"

echo "Downloading logos from Clearbit API..."
echo "Target directory: $PROVIDERS_DIR"
echo ""

# Declare associative array of provider -> company name mappings
declare -A LOGOS=(
    # Food & Delivery
    [swiggy]="swiggy"
    [zomato]="zomato"
    [zepto]="zepto"
    [blinkit]="blinkit"
    [instamart]="instamart"
    [eatsure]="eatsure"
    [pronto]="pronto"
    [dominos]="domino's pizza"
    [pizzahut]="pizza hut"
    [lapinoz]="la pinoz"
    [mcdonalds]="mcdonald's"
    [kfc]="kfc"
    [burger-king]="burger king"
    [starbucks]="starbucks"
    [chaayos]="chaayos"

    # Shopping & Retail
    [amazon]="amazon"
    [flipkart]="flipkart"
    [myntra]="myntra"
    [meesho]="meesho"
    [tata-cliq]="tata cliq"
    [croma]="croma"
    [bewakoof]="bewakoof"
    [snitch]="snitch"
    [souled-store]="the souled store"
    [uniqlo]="uniqlo"
    [marks-spencer]="marks and spencer"

    # Fashion & Lifestyle
    [nykaa]="nykaa"
    [westside]="westside"
    [pantaloons]="pantaloons"
    [levis]="levi's"
    [max-fashion]="max fashion"
    [lifestyle]="lifestyle stores"
    [shoppers-stop]="shoppers stop"
    [zara]="zara"
    [hm]="h&m"
    [decathlon]="decathlon"
    [nike]="nike"
    [adidas]="adidas"
    [puma]="puma"
    [bata]="bata"
    [skechers]="skechers"
    [woodland]="woodland"
    [metro-shoes]="metro shoes"
    [allen-solly]="allen solly"
    [peter-england]="peter england"
    [van-heusen]="van heusen"
    [louis-philippe]="louis philippe"
    [fabindia]="fabindia"
    [biba]="biba"
    [w-for-woman]="w for women"
    [lenskart]="lenskart"
    [titan]="titan"
    [tanishq]="tanishq"
    [boat]="boat"
    [mamaearth]="mamaearth"
    [sugar-cosmetics]="sugar cosmetics"
    [purplle]="purplle"

    # Grocery & Home
    [dmart]="dmart"
    [bigbasket]="bigbasket"
    [ikea]="ikea"
    [wakefit]="wakefit"
    [urban-company]="urban company"
    [firstcry]="first cry"
    [furlenco]="furlenco"

    # Travel & Transport
    [uber]="uber"
    [rapido]="rapido"
    [nammayatri]="namma yatri"
    [makemytrip]="make my trip"

    # Healthcare & Pharmacy
    [apollo]="apollo hospitals"
    [pharmeasy]="pharmeasy"
    [netmeds]="netmeds"
    [tata-1mg]="1mg"
    [cultfit]="cult.fit"

    # Banks
    [hdfc]="hdfc bank"
    [sbi]="state bank of india"
    [icici]="icici bank"
    [axis]="axis bank"

    # Telecom & Utilities
    [airtel]="airtel"
    [jio]="jio"
    [reliance-trends]="reliance trends"
    [reliance-digital]="reliance digital"
    [reliance-fresh]="reliance fresh"
    [reliance-retail]="reliance retail"
    [smart-bazaar]="smartbazaar"
    [ajio]="ajio"
    [jiomart]="jiomart"

    # Other
    [apple]="apple"
    [office-cafeteria]="office cafeteria"
)

success=0
failed=0

for provider in "${!LOGOS[@]}"; do
    company="${LOGOS[$provider]}"
    output_file="$PROVIDERS_DIR/$provider.svg"

    # URL encode the company name
    company_encoded=$(printf %s "$company" | jq -sRr @uri)
    url="https://logo.clearbit.com/${company_encoded}.svg"

    # Download logo
    if curl -s -f -o "$output_file" "$url" 2>/dev/null; then
        echo "✓ $provider"
        ((success++))
        sleep 0.1
    else
        echo "✗ $provider"
        ((failed++))
        sleep 0.05
    fi
done

echo ""
echo "✓ Successfully downloaded: $success/${#LOGOS[@]}"
if [ $failed -gt 0 ]; then
    echo "✗ Failed: $failed"
fi
