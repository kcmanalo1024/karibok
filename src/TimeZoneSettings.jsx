import React, {useMemo, useState} from 'react';
import {TIME_ZONES, resolveTimeZone, timeZoneOptionLabel} from './timeZones.js';

export default function TimeZoneSettings({value, onChange}) {
  const [query, setQuery] = useState('');
  const selected = resolveTimeZone(value);
  const options = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = normalized ? TIME_ZONES.filter(item =>
      `${item.country} ${item.city} ${item.timeZone}`.toLowerCase().includes(normalized)
    ) : TIME_ZONES;
    if (filtered.some(item => item.timeZone === selected)) return filtered;
    const selectedLocation = TIME_ZONES.find(item => item.timeZone === selected) || {country:'Detected', city:selected.replaceAll('_', ' '), timeZone:selected};
    return [selectedLocation, ...filtered];
  }, [query, selected]);

  return <section className="panel settings-panel time-zone-panel">
    <div className="eyebrow">TIME ZONE</div>
    <h2>Local time</h2>
    <p className="muted">Choose the location used by the clock in your header.</p>
    <label className="field" htmlFor="time-zone-search">Search country or city
      <input id="time-zone-search" aria-label="Search country or city" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search locations…" autoComplete="off" />
    </label>
    <label className="field" htmlFor="time-zone-select">Time Zone
      <select id="time-zone-select" aria-label="Time Zone" value={selected} onChange={event=>onChange(event.target.value)}>
        {options.map(item=><option key={item.timeZone} value={item.timeZone}>{timeZoneOptionLabel(item.timeZone)}</option>)}
      </select>
    </label>
    <p className="time-zone-current" aria-live="polite">Currently selected: <strong>{timeZoneOptionLabel(selected)}</strong></p>
  </section>;
}
