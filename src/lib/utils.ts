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
