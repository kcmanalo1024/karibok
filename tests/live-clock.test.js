import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import LiveClock, {formatClock, subscribeClock} from '../src/LiveClock.js';

test('clock renders time, zone and an accessible current-time label', t => {
  t.mock.timers.enable({apis:['Date'], now: new Date('2026-09-15T14:42:18Z').getTime()});
  const {time, label} = formatClock();
  const html = renderToStaticMarkup(createElement(LiveClock));
  assert.ok(html.includes(`Current time: ${time}, ${label}`));
  assert.ok(html.includes(`>${time}</time>`));
  assert.ok(html.includes(`>${label}</span>`));
  assert.ok(html.includes('role="timer"'));
  assert.ok(html.includes('aria-live="off"'));
});

test('clock formats hours, minutes, seconds and AM/PM using browser default zone', () => {
  for (const date of [new Date(2026,8,15,22,42,18), new Date(2026,8,15,0,0,0), new Date(2026,8,15,12,0,1)]) {
    assert.equal(formatClock(date).time, new Intl.DateTimeFormat('en-US', {hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).format(date));
  }
  assert.equal(formatClock(new Date(2026,8,15,22,42,18)).time, '10:42:18 PM');
  assert.equal(formatClock(new Date(2026,8,15,0,0,0)).time, '12:00:00 AM');
});

test('seconds update from Date and resume accurately after inactive time; cleanup removes listeners', t => {
  t.mock.timers.enable({apis:['Date', 'setInterval'], now: 100000});
  const doc = new EventTarget(); doc.visibilityState = 'visible';
  const win = new EventTarget(); win.setInterval = setInterval; win.clearInterval = clearInterval;
  const ticks = [];
  const stop = subscribeClock(date => ticks.push(date.getTime()), doc, win);
  assert.equal(ticks.at(-1), 100000);
  t.mock.timers.tick(1000);
  assert.equal(ticks.at(-1), 101000);
  doc.visibilityState = 'hidden';
  t.mock.timers.setTime(900000);
  doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(ticks.at(-1), 101000);
  doc.visibilityState = 'visible';
  doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(ticks.at(-1), 900000);
  t.mock.timers.setTime(950000);
  win.dispatchEvent(new Event('focus'));
  assert.equal(ticks.at(-1), 950000);
  t.mock.timers.setTime(960000);
  win.dispatchEvent(new Event('pageshow'));
  assert.equal(ticks.at(-1), 960000);
  stop(); const count = ticks.length;
  t.mock.timers.tick(1000);
  doc.dispatchEvent(new Event('visibilitychange')); win.dispatchEvent(new Event('focus')); win.dispatchEvent(new Event('pageshow'));
  assert.equal(ticks.length, count);
});
