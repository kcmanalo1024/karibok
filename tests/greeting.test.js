import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardGreeting} from '../src/timeZones.js';

test('dashboard greeting covers every period boundary in the selected zone', () => {
  const cases = [
    ['2026-01-01T20:59:00Z','Good Night, Alex'], // 04:59 Manila
    ['2026-01-01T21:00:00Z','Good Morning, Alex'],
    ['2026-01-02T03:59:00Z','Good Morning, Alex'],
    ['2026-01-02T04:00:00Z','Good Afternoon, Alex'],
    ['2026-01-02T09:59:00Z','Good Afternoon, Alex'],
    ['2026-01-02T10:00:00Z','Good Evening, Alex'],
    ['2026-01-02T13:59:00Z','Good Evening, Alex'],
    ['2026-01-02T14:00:00Z','Good Night, Alex'],
  ];
  for (const [iso, expected] of cases) assert.equal(dashboardGreeting(new Date(iso), 'Asia/Manila', ' Alex '), expected);
});

test('greeting uses the selected timezone and falls back to there', () => {
  const instant = new Date('2026-01-01T11:00:00Z');
  assert.equal(dashboardGreeting(instant, 'Europe/Berlin', 'Kaycee'), 'Good Afternoon, Kaycee');
  assert.equal(dashboardGreeting(instant, 'America/New_York', ''), 'Good Morning, there');
  assert.equal(dashboardGreeting(instant, 'Asia/Tokyo', null), 'Good Evening, there');
});
