import test from 'node:test';
import assert from 'node:assert/strict';
import {formatClock} from '../src/LiveClock.js';
import {TIME_ZONES, isValidTimeZone, resolveTimeZone, timeZoneLabel, timeZoneOptionLabel} from '../src/timeZones.js';
import {normalize} from '../src/domain.js';

const required = [
  ['Philippines','Manila','Asia/Manila'], ['Germany','Berlin','Europe/Berlin'],
  ['Italy','Rome','Europe/Rome'], ['Saudi Arabia','Riyadh','Asia/Riyadh'],
  ['Taiwan','Taipei','Asia/Taipei'], ['Japan','Tokyo','Asia/Tokyo'],
  ['United Kingdom','London','Europe/London'], ['United States','New York','America/New_York'],
  ['United States','Los Angeles','America/Los_Angeles'], ['Canada','Toronto','America/Toronto'],
  ['Australia','Sydney','Australia/Sydney'], ['Singapore','Singapore','Asia/Singapore'],
  ['South Korea','Seoul','Asia/Seoul'],
];

test('all required country and city choices use valid IANA time zones', () => {
  assert.deepEqual(TIME_ZONES.map(({country,city,timeZone})=>[country,city,timeZone]), required);
  for (const [country, city, timeZone] of required) {
    assert.equal(isValidTimeZone(timeZone), true);
    assert.equal(timeZoneOptionLabel(timeZone), `${country} — ${city}`);
    assert.equal(timeZoneLabel(timeZone), country);
    assert.equal(formatClock(new Date('2026-09-15T14:42:18Z'), timeZone).time,
      new Intl.DateTimeFormat('en-US', {hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true,timeZone}).format(new Date('2026-09-15T14:42:18Z')));
  }
});

test('saved time zone persists through workspace normalization while an absent value remains unset', () => {
  assert.equal(normalize({timeZone:'Europe/Berlin'}).timeZone, 'Europe/Berlin');
  assert.equal(normalize(normalize({timeZone:'Europe/Berlin'})).timeZone, 'Europe/Berlin');
  assert.equal(normalize({}).timeZone, '');
  assert.equal(resolveTimeZone('Invalid/Zone'), resolveTimeZone(''));
});

test('DST-aware zones change automatically between winter and summer', () => {
  const winter = new Date('2026-01-15T12:00:00Z');
  const summer = new Date('2026-07-15T12:00:00Z');
  assert.equal(formatClock(winter, 'Europe/Berlin').time, '01:00:00 PM');
  assert.equal(formatClock(summer, 'Europe/Berlin').time, '02:00:00 PM');
  assert.equal(formatClock(winter, 'America/New_York').time, '07:00:00 AM');
  assert.equal(formatClock(summer, 'America/New_York').time, '08:00:00 AM');
});
