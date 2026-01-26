import { Resend } from 'resend';

const resendApiKey = import.meta.env.RESEND_API_KEY;
const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'https://www.verbsaroundthe.world/';
const resendAudienceId = import.meta.env.RESEND_AUDIENCE_ID;

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Add a contact to Resend audience
export async function addToResendAudience(email: string) {
  if (!resend || !resendAudienceId) {
    console.warn('Resend or audience ID not configured, skipping');
    return;
  }

  try {
    await resend.contacts.create({
      audienceId: resendAudienceId,
      email,
      unsubscribed: false,
    });
  } catch (err: any) {
    // If contact already exists, that's fine
    if (!err.message?.includes('already exists')) {
      throw err;
    }
  }
}

// Remove a contact from Resend audience
export async function removeFromResendAudience(email: string) {
  if (!resend || !resendAudienceId) {
    console.warn('Resend or audience ID not configured, skipping');
    return;
  }

  // Resend's SDK requires contact ID to delete, so we first get the contact
  // Alternatively, we can update the contact to unsubscribed status
  try {
    // Get all contacts and find the one with matching email
    const { data: contacts } = await resend.contacts.list({
      audienceId: resendAudienceId,
    });

    const contact = contacts?.data?.find((c: any) => c.email === email);

    if (contact) {
      await resend.contacts.remove({
        audienceId: resendAudienceId,
        id: contact.id,
      });
    }
  } catch (err) {
    console.error('Error removing contact from Resend:', err);
    throw err;
  }
}

export async function sendTicketConfirmation({
  to,
  customerName,
  eventTitle,
  eventDate,
  eventTimezone,
  venueName,
  venueCity,
  tierName,
  quantity,
  amountPaid,
}: {
  to: string;
  customerName: string | null;
  eventTitle: string;
  eventDate: Date;
  eventTimezone?: string;
  venueName: string;
  venueCity: string;
  tierName: string;
  quantity: number;
  amountPaid: number;
}) {
  if (!resend) {
    console.warn('Resend not configured, skipping email');
    return;
  }

  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const timezone = eventTimezone || 'America/New_York';
  const formattedTime = eventDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  });

  // Get timezone abbreviation for display
  const timezoneAbbr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  }).formatToParts(eventDate).find(p => p.type === 'timeZoneName')?.value || timezone;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: system-ui, sans-serif; line-height: 1.6; color: #000; max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { font-size: 32px; font-weight: 400; margin-bottom: 24px; }
        .details { background: #f5f5f5; padding: 20px; margin: 24px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #666; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 14px; color: #666; }
      </style>
    </head>
    <body>
      <h1>You're in!</h1>
      <p>Hey${customerName ? ` ${customerName}` : ''},</p>
      <p>Your tickets for <strong>${eventTitle}</strong> are confirmed.</p>

      <div class="details">
        <div class="detail-row">
          <span class="label">Event</span>
          <span>${eventTitle}</span>
        </div>
        <div class="detail-row">
          <span class="label">Date</span>
          <span>${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="label">Time</span>
          <span>${formattedTime} ${timezoneAbbr}</span>
        </div>
        <div class="detail-row">
          <span class="label">Venue</span>
          <span>${venueName}, ${venueCity}</span>
        </div>
        <div class="detail-row">
          <span class="label">Ticket</span>
          <span>${tierName} x ${quantity}</span>
        </div>
        <div class="detail-row">
          <span class="label">Total</span>
          <span>$${amountPaid.toFixed(2)}</span>
        </div>
      </div>

      <p>See you there!</p>

      <div class="footer">
        <p>VERBS</p>
      </div>
    </body>
    </html>
  `;

  await resend.emails.send({
    from: 'VERBS <tickets@verbsaroundthe.world>',
    replyTo: 'subscribe@verbs-mia.com',
    to,
    subject: `Your tickets for ${eventTitle}`,
    html,
  });
}

export async function sendCampaign({
  to,
  subject,
  htmlContent,
  unsubscribeToken,
}: {
  to: string;
  subject: string;
  htmlContent: string;
  unsubscribeToken: string;
}) {
  if (!resend) {
    console.warn('Resend not configured, skipping email');
    return;
  }

  const unsubscribeUrl = `${siteUrl}unsubscribe?token=${unsubscribeToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: system-ui, sans-serif; line-height: 1.6; color: #000; max-width: 600px; margin: 0 auto; padding: 20px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; }
        .footer a { color: #666; }
      </style>
    </head>
    <body>
      ${htmlContent}

      <div class="footer">
        <p>VERBS</p>
        <p><a href="${unsubscribeUrl}">Unsubscribe</a></p>
      </div>
    </body>
    </html>
  `;

  await resend.emails.send({
    from: 'VERBS <hello@verbsaroundthe.world>',
    replyTo: 'subscribe@verbs-mia.com',
    to,
    subject,
    html,
  });
}
