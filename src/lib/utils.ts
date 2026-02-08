/**
 * Determine if an event has passed. Uses time_end if available
 * and valid (must be after start), otherwise defaults to 6 hours
 * after the start time.
 */
export function isEventPast(event: { date: string; time_end?: string | null }): boolean {
  const startDate = new Date(event.date);
  const DEFAULT_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  let endDate: Date;
  if (event.time_end) {
    const parsed = new Date(event.time_end);
    // Only trust time_end if it's after the start time
    endDate = parsed > startDate ? parsed : new Date(startDate.getTime() + DEFAULT_DURATION_MS);
  } else {
    endDate = new Date(startDate.getTime() + DEFAULT_DURATION_MS);
  }

  return endDate < new Date();
}

/**
 * Format a UTC date string for a datetime-local input in the given timezone.
 * Converts from UTC to the event's local time so the admin sees the correct time.
 */
export function formatDateForInput(dateStr: string, timezone: string): string {
  const date = new Date(dateStr);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  const hour = get('hour') === '24' ? '00' : get('hour');

  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/**
 * Convert a datetime-local value (in the event's timezone) to a UTC ISO string
 * for storage in the database.
 */
export function datetimeLocalToUTC(datetimeLocal: string, timezone: string): string {
  const [datePart, timePart] = datetimeLocal.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  const naiveUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));

  const utcRepr = naiveUTC.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzRepr = naiveUTC.toLocaleString('en-US', { timeZone: timezone });
  const offsetMs = new Date(tzRepr).getTime() - new Date(utcRepr).getTime();

  return new Date(naiveUTC.getTime() - offsetMs).toISOString();
}

/**
 * Sanitize a full address to show only street and city.
 * Takes addresses like "123 Main St, Brooklyn, Kings County, NY 11201, USA"
 * and returns "123 Main St, Brooklyn"
 */
export function formatDisplayAddress(fullAddress: string | null | undefined): string | null {
  if (!fullAddress) return null;

  const parts = fullAddress.split(',').map(p => p.trim());

  // Take first 2 parts (typically street + city)
  // Skip parts that look like state abbreviations, zip codes, or country names
  const displayParts: string[] = [];

  for (const part of parts) {
    // Stop if we hit a state abbreviation (2 letters), zip code, or country
    if (/^\d{5}(-\d{4})?$/.test(part)) break; // US zip
    if (/^[A-Z]{2}$/.test(part)) break; // State abbreviation
    if (/^[A-Z]{2}\s+\d/.test(part)) break; // "NY 10001" format
    if (/^\d+$/.test(part)) break; // Pure numbers (zip without dash)
    if (['USA', 'United States', 'US', 'UK', 'United Kingdom', 'Canada'].includes(part)) break;

    // Skip county names (often contain "County")
    if (part.toLowerCase().includes('county')) continue;

    displayParts.push(part);

    // Stop after 2 meaningful parts (street + city)
    if (displayParts.length >= 2) break;
  }

  return displayParts.length > 0 ? displayParts.join(', ') : fullAddress;
}
