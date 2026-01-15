#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo -e "${YELLOW}Stripe CLI not found. Install it with:${NC}"
    echo "  brew install stripe/stripe-cli/stripe"
    exit 1
fi

# Check if logged in to Stripe
if ! stripe config --list &> /dev/null; then
    echo -e "${YELLOW}Not logged in to Stripe. Run:${NC}"
    echo "  stripe login"
    exit 1
fi

# Create a temp file for the webhook secret
TEMP_FILE=$(mktemp)

# Start stripe listen in background and capture output
echo "Starting Stripe webhook listener..."
stripe listen --forward-to localhost:4321/api/stripe-webhook 2>&1 | tee "$TEMP_FILE" &
STRIPE_PID=$!

# Wait for the webhook secret to appear in output
echo "Waiting for webhook secret..."
for i in {1..30}; do
    if grep -q "whsec_" "$TEMP_FILE"; then
        break
    fi
    sleep 0.5
done

# Extract the webhook secret
WEBHOOK_SECRET=$(grep -o 'whsec_[a-zA-Z0-9]*' "$TEMP_FILE" | head -1)

if [ -z "$WEBHOOK_SECRET" ]; then
    echo -e "${YELLOW}Could not capture webhook secret. Check stripe login status.${NC}"
    kill $STRIPE_PID 2>/dev/null
    rm "$TEMP_FILE"
    exit 1
fi

echo ""
echo -e "${GREEN}Stripe webhook secret:${NC}"
echo "  STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET"
echo ""
echo -e "${GREEN}Add to .env if needed:${NC}"
echo "  echo \"STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET\" >> .env"
echo ""

# Cleanup temp file
rm "$TEMP_FILE"

# Cleanup function to kill stripe listen when script exits
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $STRIPE_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start Astro dev server with the webhook secret
echo "Starting Astro dev server..."
echo ""
STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET pnpm astro dev

# Cleanup on exit
cleanup
