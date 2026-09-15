import {createElement, useEffect, useState} from 'react';
import {resolveTimeZone, timeZoneLabel} from './timeZones.js';

export function formatClock(date = new Date(), preferredTimeZone = '') {
  const timeZone = resolveTimeZone(preferredTimeZone);
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone,
  });
  return {time: formatter.format(date), label: timeZoneLabel(timeZone), timeZone};
}

export function subscribeClock(onTick, doc = document, win = window) {
  const refresh = () => onTick(new Date());
  const onVisible = () => { if (doc.visibilityState === 'visible') refresh(); };
  const interval = win.setInterval(refresh, 1000);
  doc.addEventListener('visibilitychange', onVisible);
  win.addEventListener('focus', refresh);
  win.addEventListener('pageshow', refresh);
  refresh();
  return () => {
    win.clearInterval(interval);
    doc.removeEventListener('visibilitychange', onVisible);
    win.removeEventListener('focus', refresh);
    win.removeEventListener('pageshow', refresh);
  };
}

export default function LiveClock({timeZone = ''}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => subscribeClock(setNow), []);
  const {time, label} = formatClock(now, timeZone);
  // Keep the accessible name current without announcing every second.
  return createElement('div', {className: 'live-clock', role: 'timer', 'aria-live': 'off', 'aria-label': `Current time: ${time}, ${label}`},
    createElement('time', {dateTime: now.toISOString(), className: 'live-clock-time'}, time),
    createElement('span', {className: 'live-clock-zone'}, label));
}
