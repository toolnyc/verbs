import Stripe from 'stripe';

const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' })
  : null;

export async function createCheckoutSession({
  priceId,
  eventId,
  tierId,
  quantity,
  customerEmail,
  successUrl,
  cancelUrl,
}: {
  priceId: string;
  eventId: string;
  tierId: string;
  quantity: number;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price: priceId,
        quantity,
      },
    ],
    customer_email: customerEmail,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      event_id: eventId,
      ticket_tier_id: tierId,
      quantity: quantity.toString(),
    },
  });

  return session;
}

export async function createProductAndPrice({
  eventId,
  tierId,
  eventTitle,
  tierName,
  price,
}: {
  eventId: string;
  tierId: string;
  eventTitle: string;
  tierName: string;
  price: number;
}) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  // Create product with metadata for traceability
  const product = await stripe.products.create({
    name: `${eventTitle} - ${tierName}`,
    metadata: {
      event_id: eventId,
      tier_id: tierId,
      source: 'verbs',
    },
  });

  // Create price (in cents)
  const stripePrice = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(price * 100),
    currency: 'usd',
    metadata: {
      event_id: eventId,
      tier_id: tierId,
    },
  });

  return {
    productId: product.id,
    priceId: stripePrice.id,
  };
}

export async function updatePrice({
  productId,
  oldPriceId,
  newPrice,
  eventId,
  tierId,
}: {
  productId: string;
  oldPriceId: string;
  newPrice: number;
  eventId: string;
  tierId: string;
}) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  // Archive old price
  await stripe.prices.update(oldPriceId, { active: false });

  // Create new price with metadata
  const stripePrice = await stripe.prices.create({
    product: productId,
    unit_amount: Math.round(newPrice * 100),
    currency: 'usd',
    metadata: {
      event_id: eventId,
      tier_id: tierId,
    },
  });

  return stripePrice.id;
}

export async function updateProductName({
  productId,
  eventTitle,
  tierName,
}: {
  productId: string;
  eventTitle: string;
  tierName: string;
}) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  await stripe.products.update(productId, {
    name: `${eventTitle} - ${tierName}`,
  });
}

export async function archiveProduct(productId: string) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  // Archive the product (sets active: false)
  // This also prevents the product from being used in new checkouts
  await stripe.products.update(productId, { active: false });
}

export async function archiveProductsForEvent(eventId: string) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  // Search for all products with this event_id in metadata
  const products = await stripe.products.search({
    query: `metadata['event_id']:'${eventId}' AND metadata['source']:'verbs'`,
  });

  // Archive each product
  for (const product of products.data) {
    if (product.active) {
      await stripe.products.update(product.id, { active: false });
    }
  }

  return products.data.length;
}

export async function createRefund({
  paymentIntentId,
  amount,
}: {
  paymentIntentId: string;
  amount?: number;
}) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amount ? Math.round(amount * 100) : undefined, // Full refund if no amount
  });

  return refund;
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  webhookSecret: string
) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
