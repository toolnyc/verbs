import { Resend } from 'resend';
import QRCode from 'qrcode';

const resendApiKey = import.meta.env.RESEND_API_KEY;
const resendAudienceId = import.meta.env.RESEND_AUDIENCE_ID;

// Get site URL at runtime to ensure correct environment URL
function getSiteUrl(): string {
  return (import.meta.env.PUBLIC_SITE_URL || 'https://www.verbsaroundthe.world').replace(/\/$/, '');
}

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
  orderNumber,
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
  orderNumber: number | null;
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

  // Generate QR code if we have an order number
  let qrCodeHtml = '';
  if (orderNumber) {
    try {
      const verifyUrl = `${getSiteUrl()}/verify?order=${orderNumber}`;
      const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 100,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      qrCodeHtml = `
        <div style="text-align: center; margin: 24px 0; padding: 16px; background: #f5f5f5;">
          <img src="${qrCodeDataUrl}" alt="Ticket QR Code" width="100" height="100" style="display: block; margin: 0 auto;" />
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">Show at door · Order #${orderNumber}</p>
        </div>
      `;
    } catch (err) {
      console.error('Failed to generate QR code for email:', err);
    }
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: system-ui, sans-serif; line-height: 1.6; color: #000; max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { font-size: 32px; font-weight: 400; margin-bottom: 24px; }
        h2 { font-size: 18px; font-weight: 600; margin: 24px 0 12px 0; }
        .details { background: #f5f5f5; padding: 20px; margin: 24px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #666; }
        .rules { margin: 40px 0; padding: 24px; border: 1px solid #e0e0e0; }
        .rules-title { font-size: 22px; font-weight: 600; margin: 0 0 20px 0; }
        .rules h3 { font-size: 13px; color: #666; margin: 0 0 8px 0; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
        .rules ul { margin: 0; padding-left: 20px; }
        .rules li { font-size: 13px; margin-bottom: 6px; color: #333; }
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

      <div class="rules">
        <h2 class="rules-title">House Rules</h2>

        <div style="margin-bottom: 20px;">
          <h3>Photography</h3>
          <ul>
            <li>Be present — please keep phone use off the dance floor. A sticker will be placed on your phone cameras upon entry.</li>
            <li>No professional cameras.</li>
          </ul>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>Entry Requirements</h3>
          <ul>
            <li>Minimum age for entry is 21.</li>
            <li>Outside food and alcohol is prohibited.</li>
            <li>You will be searched at the door.</li>
          </ul>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>Safety & Conduct</h3>
          <ul>
            <li>Zero-tolerance policy towards aggression, discrimination, harassment, or any form of violence.</li>
            <li>Open use of, possession or trade of illegal substances is prohibited.</li>
            <li>Report any concerns to security or staff.</li>
          </ul>
        </div>

        <div>
          <h3>Liability</h3>
          <ul>
            <li>VERBS is not responsible for lost or stolen goods. Email info@verbs-mia.com if you lost something.</li>
          </ul>
        </div>
      </div>

      <p>See you there!</p>

      ${qrCodeHtml}

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

export async function sendWelcomeEmail({
  to,
  unsubscribeToken,
  upcomingEvent,
}: {
  to: string;
  unsubscribeToken: string;
  upcomingEvent?: {
    title: string;
    date: Date;
    timezone: string;
    venueName: string;
    venueCity: string;
  } | null;
}) {
  if (!resend) {
    console.warn('Resend not configured, skipping email');
    return;
  }

  const unsubscribeUrl = `${getSiteUrl()}/unsubscribe?token=${unsubscribeToken}`;
  const siteUrl = getSiteUrl();
  const soundcloudUrl = 'https://soundcloud.com/verbs-mia';

  let upcomingEventHtml = '';
  if (upcomingEvent) {
    const formattedDate = upcomingEvent.date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = upcomingEvent.date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: upcomingEvent.timezone,
    });

    upcomingEventHtml = `
      <div style="background: #f5f5f5; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Next Event</p>
        <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">${upcomingEvent.title}</p>
        <p style="margin: 0; color: #333;">${formattedDate} · ${formattedTime}</p>
        <p style="margin: 4px 0 0 0; color: #666;">${upcomingEvent.venueName}, ${upcomingEvent.venueCity}</p>
        <p style="margin: 16px 0 0 0;"><a href="${siteUrl}" style="color: #000;">Get tickets</a></p>
      </div>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: system-ui, sans-serif; line-height: 1.6; color: #000; max-width: 600px; margin: 0 auto; padding: 20px; }
        a { color: #000; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; }
        .footer a { color: #666; }
      </style>
    </head>
    <body>
      <p>Welcome to VERBS.</p>
      <p>You're now on the list. We'll keep you posted on upcoming events.</p>

      ${upcomingEventHtml}

      <p style="margin-top: 24px;">
        <a href="${siteUrl}">verbsaroundthe.world</a> · <a href="${soundcloudUrl}">SoundCloud</a>
      </p>

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
    subject: 'Welcome to VERBS',
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

  const unsubscribeUrl = `${getSiteUrl()}/unsubscribe?token=${unsubscribeToken}`;

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
