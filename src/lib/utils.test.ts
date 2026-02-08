import { describe, it, expect, vi, afterEach } from 'vitest';
import { isEventPast } from './utils';

describe('isEventPast', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function setNow(iso: string) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
  }

  // --- Basic: event with no time_end uses 6h buffer ---

  it('event in the future is not past', () => {
    setNow('2026-02-07T18:00:00Z');
    expect(isEventPast({ date: '2026-02-07T22:00:00Z' })).toBe(false);
  });

  it('event that just started (1 min ago) is not past', () => {
    setNow('2026-02-07T20:01:00Z');
    expect(isEventPast({ date: '2026-02-07T20:00:00Z' })).toBe(false);
  });

  it('event that started 5 hours ago (no time_end) is not past', () => {
    setNow('2026-02-08T01:00:00Z');
    expect(isEventPast({ date: '2026-02-07T20:00:00Z' })).toBe(false);
  });

  it('event that started 7 hours ago (no time_end) IS past', () => {
    setNow('2026-02-08T03:00:00Z');
    expect(isEventPast({ date: '2026-02-07T20:00:00Z' })).toBe(true);
  });

  it('event at exactly 6h after start (no time_end) is not past', () => {
    setNow('2026-02-08T02:00:00Z');
    expect(isEventPast({ date: '2026-02-07T20:00:00Z' })).toBe(false);
  });

  // --- With valid time_end ---

  it('event with time_end in the future is not past', () => {
    setNow('2026-02-08T00:00:00Z');
    expect(isEventPast({
      date: '2026-02-07T20:00:00Z',
      time_end: '2026-02-08T04:00:00Z',
    })).toBe(false);
  });

  it('event with time_end that has passed IS past', () => {
    setNow('2026-02-08T05:00:00Z');
    expect(isEventPast({
      date: '2026-02-07T20:00:00Z',
      time_end: '2026-02-08T04:00:00Z',
    })).toBe(true);
  });

  it('event at exactly time_end is not past', () => {
    setNow('2026-02-08T04:00:00Z');
    expect(isEventPast({
      date: '2026-02-07T20:00:00Z',
      time_end: '2026-02-08T04:00:00Z',
    })).toBe(false);
  });

  // --- Midnight-crossing: time_end before date (bad data) ---

  it('time_end BEFORE date falls back to 6h buffer', () => {
    // Event starts at 8pm, time_end is 2am same day (before start = bad data)
    // Should fall back to 6h buffer (2am next day), not treat as already past
    setNow('2026-02-07T21:00:00Z'); // 1 hour after start
    expect(isEventPast({
      date: '2026-02-07T20:00:00Z',
      time_end: '2026-02-07T02:00:00Z', // Before start — invalid
    })).toBe(false);
  });

  it('time_end equal to date falls back to 6h buffer', () => {
    setNow('2026-02-07T21:00:00Z');
    expect(isEventPast({
      date: '2026-02-07T20:00:00Z',
      time_end: '2026-02-07T20:00:00Z', // Same as start — invalid
    })).toBe(false);
  });

  // --- Null/undefined time_end ---

  it('null time_end uses 6h buffer', () => {
    setNow('2026-02-07T21:00:00Z');
    expect(isEventPast({
      date: '2026-02-07T20:00:00Z',
      time_end: null,
    })).toBe(false);
  });

  it('undefined time_end uses 6h buffer', () => {
    setNow('2026-02-07T21:00:00Z');
    expect(isEventPast({
      date: '2026-02-07T20:00:00Z',
      time_end: undefined,
    })).toBe(false);
  });
});
