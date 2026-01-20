#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Log file for Stripe webhook events
STRIPE_LOG=".stripe-webhooks.log"

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

# Clear previous log and create fresh
> "$STRIPE_LOG"

# Start stripe listen in background, log to file
echo "Starting Stripe webhook listener..."
stripe listen --forward-to localhost:4321/api/stripe-webhook >> "$STRIPE_LOG" 2>&1 &
STRIPE_PID=$!

# Wait for the webhook secret to appear in log
echo "Waiting for webhook secret..."
for i in {1..30}; do
    if grep -q "whsec_" "$STRIPE_LOG"; then
        break
    fi
    sleep 0.5
done

# Extract the webhook secret
WEBHOOK_SECRET=$(grep -o 'whsec_[a-zA-Z0-9]*' "$STRIPE_LOG" | head -1)

if [ -z "$WEBHOOK_SECRET" ]; then
    echo -e "${YELLOW}Could not capture webhook secret. Check stripe login status.${NC}"
    kill $STRIPE_PID 2>/dev/null
    exit 1
fi

echo ""
echo -e "${GREEN}Stripe webhook secret captured.${NC}"
echo ""
echo -e "${CYAN}To view webhook events, run in another terminal:${NC}"
echo "  tail -f $STRIPE_LOG"
echo ""

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
