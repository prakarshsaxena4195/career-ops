import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatJob, formatSummary } from '../india/telegram.mjs';

test('formatJob: includes company', () => {
  const text = formatJob({ title: 'Senior PM', company: 'Swiggy', location: 'Bangalore', jobUrl: 'https://careers.swiggy.com/123' });
  assert.ok(text.includes('Swiggy'));
});

test('formatJob: includes title', () => {
  const text = formatJob({ title: 'Senior PM - Growth', company: 'Swiggy', location: 'Bangalore', jobUrl: 'https://x.com' });
  assert.ok(text.includes('Senior PM - Growth'));
});

test('formatJob: includes location', () => {
  const text = formatJob({ title: 'Senior PM', company: 'Swiggy', location: 'Bangalore', jobUrl: 'https://x.com' });
  assert.ok(text.includes('Bangalore'));
});

test('formatJob: includes URL', () => {
  const text = formatJob({ title: 'Senior PM', company: 'Swiggy', location: 'Bangalore', jobUrl: 'https://careers.swiggy.com/123' });
  assert.ok(text.includes('https://careers.swiggy.com/123'));
});

test('formatJob: uses Bangalore when location is null', () => {
  const text = formatJob({ title: 'Senior PM', company: 'Swiggy', location: null, jobUrl: 'https://x.com' });
  assert.ok(text.includes('Bangalore'));
});

test('formatSummary: includes new count', () => {
  const text = formatSummary({ newCount: 3, bySource: { linkedin: 1, naukri: 1, careers: 1, websearch: 0 }, errors: [], dryRun: false });
  assert.ok(text.includes('3 new Senior PM roles'));
});

test('formatSummary: includes per-source breakdown', () => {
  const text = formatSummary({ newCount: 2, bySource: { linkedin: 2, naukri: 0, careers: 0, websearch: 0 }, errors: [], dryRun: false });
  assert.ok(text.includes('LinkedIn: 2'));
});

test('formatSummary: shows error line when failures exist', () => {
  const text = formatSummary({ newCount: 1, bySource: { linkedin: 0, naukri: 1, careers: 0, websearch: 0 }, errors: ['LinkedIn (session expired)'], dryRun: false });
  assert.ok(text.includes('⚠️'));
  assert.ok(text.includes('LinkedIn (session expired)'));
});

test('formatSummary: no error line when no failures', () => {
  const text = formatSummary({ newCount: 1, bySource: { linkedin: 1, naukri: 0, careers: 0, websearch: 0 }, errors: [], dryRun: false });
  assert.ok(!text.includes('⚠️'));
});

test('formatSummary: marks dry run in output', () => {
  const text = formatSummary({ newCount: 0, bySource: { linkedin: 0, naukri: 0, careers: 0, websearch: 0 }, errors: [], dryRun: true });
  assert.ok(text.includes('DRY RUN'));
});
