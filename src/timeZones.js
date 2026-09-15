export const TIME_ZONES = [
  {country:'Philippines', city:'Manila', timeZone:'Asia/Manila'},
  {country:'Germany', city:'Berlin', timeZone:'Europe/Berlin'},
  {country:'Italy', city:'Rome', timeZone:'Europe/Rome'},
  {country:'Saudi Arabia', city:'Riyadh', timeZone:'Asia/Riyadh'},
  {country:'Taiwan', city:'Taipei', timeZone:'Asia/Taipei'},
  {country:'Japan', city:'Tokyo', timeZone:'Asia/Tokyo'},
  {country:'United Kingdom', city:'London', timeZone:'Europe/London'},
  {country:'United States', city:'New York', timeZone:'America/New_York'},
  {country:'United States', city:'Los Angeles', timeZone:'America/Los_Angeles'},
  {country:'Canada', city:'Toronto', timeZone:'America/Toronto'},
  {country:'Australia', city:'Sydney', timeZone:'Australia/Sydney'},
  {country:'Singapore', city:'Singapore', timeZone:'Asia/Singapore'},
  {country:'South Korea', city:'Seoul', timeZone:'Asia/Seoul'},
];

export function isValidTimeZone(timeZone) {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', {timeZone}).format();
    return true;
  } catch {
    return false;
  }
}

export function detectedTimeZone() {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isValidTimeZone(detected) ? detected : 'Asia/Manila';
}

export function resolveTimeZone(savedTimeZone) {
  return isValidTimeZone(savedTimeZone) ? savedTimeZone : detectedTimeZone();
}

export function timeZoneLabel(timeZone) {
  const location = TIME_ZONES.find(item => item.timeZone === timeZone);
  return location?.country || timeZone.split('/').at(-1).replaceAll('_', ' ');
}

export function timeZoneOptionLabel(timeZone) {
  const location = TIME_ZONES.find(item => item.timeZone === timeZone);
  return location ? `${location.country} — ${location.city}` : `Detected — ${timeZone.replaceAll('_', ' ')}`;
}
