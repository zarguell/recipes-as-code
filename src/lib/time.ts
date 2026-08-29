/**
 * Time parsing/formatting for recipe metadata.
 *
 * Frontmatter times are freeform ("25 min", "1 hour", "Prep: 10 minutes").
 * For sorting and display we normalize them to minutes.
 */

const UNIT_MINUTES: Record<string, number> = {
  h: 60,
  hr: 60,
  hrs: 60,
  hour: 60,
  hours: 60,
  m: 1,
  min: 1,
  mins: 1,
  minute: 1,
  minutes: 1,
};

/**
 * Parse a freeform duration string to minutes (integer, rounded).
 * Sums all components: "1 hour 15 minutes" -> 75.
 * Returns null when no duration is found.
 */
export function parseTimeToMinutes(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
  }

  const text = String(value).toLowerCase();
  let total = 0;
  let found = false;

  const pattern = /(\d+(?:[.,]\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const amount = parseFloat(match[1].replace(',', '.'));
    const unit = UNIT_MINUTES[match[2]];
    if (Number.isFinite(amount) && unit) {
      total += amount * unit;
      found = true;
    }
  }

  if (found) return Math.round(total);

  // Bare number: assume minutes.
  const bare = text.match(/\d+(?:[.,]\d+)?/);
  if (bare) {
    const amount = parseFloat(bare[0].replace(',', '.'));
    if (Number.isFinite(amount) && amount >= 0) return Math.round(amount);
  }

  return null;
}

/** Format minutes back to a compact human string: 90 -> "1 h 30 min". */
export function formatMinutes(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes) || minutes < 0) return '';
  if (minutes === 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}
