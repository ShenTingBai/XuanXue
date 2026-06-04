/**
 * True solar time correction for birth hour calculation.
 *
 * Standard Beijing time (UTC+8) uses the meridian at 120°E.
 * For locations with longitude != 120°E, the true solar time differs:
 *   True solar time = clock time + (longitude - 120) * 4 minutes
 *
 * This correction affects:
 *   - BaZi hour pillar (the 时辰 boundary can shift)
 *   - Constellation rising sign (ascendant calculation)
 *   - Ziwei astrolabe (birth hour index)
 *
 * Default: if birth_longitude is not provided, assume 120°E (no adjustment).
 */

/**
 * Convert clock hour to true solar hour based on longitude.
 *
 * @param clockHour - The clock hour (0-23) from the user's birth time
 * @param longitude - The birth location longitude in decimal degrees (-180 to 180)
 * @returns The true solar hour as a float (e.g., 11.7)
 */
export function getTrueSolarHour(clockHour: number, longitude: number = 120): number {
  const adjustmentMinutes = (longitude - 120) * 4
  const trueSolarMinutes = clockHour * 60 + adjustmentMinutes
  return trueSolarMinutes / 60
}

/**
 * Get the true solar 时辰 (2-hour period) index from clock hour and longitude.
 *
 * The 12 时辰 map to:
 *   0=子(23-01), 1=丑(01-03), 2=寅(03-05), 3=卯(05-07),
 *   4=辰(07-09), 5=巳(09-11), 6=午(11-13), 7=未(13-15),
 *   8=申(15-17), 9=酉(17-19), 10=戌(19-21), 11=亥(21-23)
 *
 * @param clockHour - The clock hour (0-23)
 * @param longitude - The birth location longitude (default 120°E)
 * @returns The 时辰 index (0-11) based on true solar time
 */
export function getTrueSolarHourIndex(clockHour: number, longitude: number = 120): number {
  const trueHour = getTrueSolarHour(clockHour, longitude)
  // Normalize to 0-24 range using modulo
  const normalized = ((trueHour % 24) + 24) % 24
  // Convert to 时辰 branch index: 子=0(starting at 23:00), ...
  // Each 时辰 covers 2 hours centered on odd-numbered hours
  // For e.g., 子时 = 23:00-00:59, so branch index = floor(((hour+1) % 24) / 2)
  return Math.floor(((normalized + 1) % 24) / 2)
}
