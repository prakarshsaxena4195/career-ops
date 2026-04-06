import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl, normalizeNaukriUrl, isNew, markSeen } from '../india/dedup.mjs';

test('normalizeUrl: strips query params', () => {
  assert.equal(
    normalizeUrl('https://example.com/job?ref=linkedin&utm_source=google'),
    'https://example.com/job'
  );
});

test('normalizeUrl: strips hash fragment', () => {
  assert.equal(
    normalizeUrl('https://careers.swiggy.com/#/job/123'),
    'https://careers.swiggy.com/'
  );
});

test('normalizeUrl: lowercases', () => {
  assert.equal(
    normalizeUrl('https://Example.COM/Job'),
    'https://example.com/job'
  );
});

test('normalizeNaukriUrl: extracts job ID', () => {
  assert.equal(
    normalizeNaukriUrl('https://www.naukri.com/job-listings-senior-product-manager-12345678'),
    'naukri/12345678'
  );
});

test('normalizeNaukriUrl: falls back to normalizeUrl for no ID', () => {
  const result = normalizeNaukriUrl('https://www.naukri.com/jobs');
  assert.equal(result, 'https://www.naukri.com/jobs');
});

test('isNew: true for unseen URL', () => {
  const store = {};
  const job = { jobUrl: 'https://example.com/job', source: 'linkedin' };
  assert.equal(isNew(job, store), true);
});

test('isNew: false after markSeen', () => {
  const store = {};
  const job = { jobUrl: 'https://example.com/job', source: 'linkedin', title: 'PM', company: 'Acme' };
  markSeen(job, store);
  assert.equal(isNew(job, store), false);
});

test('markSeen: normalizes URL before storing', () => {
  const store = {};
  const job = { jobUrl: 'https://example.com/job?ref=test', source: 'linkedin', title: 'PM', company: 'Acme' };
  markSeen(job, store);
  assert.ok(store['https://example.com/job']);
  assert.ok(!store['https://example.com/job?ref=test']);
});

test('markSeen: stores title and company', () => {
  const store = {};
  const job = { jobUrl: 'https://example.com/job', source: 'linkedin', title: 'Sr PM', company: 'Swiggy' };
  markSeen(job, store);
  assert.equal(store['https://example.com/job'].title, 'Sr PM');
  assert.equal(store['https://example.com/job'].company, 'Swiggy');
});

test('markSeen naukri: uses job ID key', () => {
  const store = {};
  const job = {
    jobUrl: 'https://www.naukri.com/job-listings-senior-product-manager-99887766',
    source: 'naukri',
    title: 'Sr PM',
    company: 'Flipkart',
  };
  markSeen(job, store);
  assert.ok(store['naukri/99887766']);
});
