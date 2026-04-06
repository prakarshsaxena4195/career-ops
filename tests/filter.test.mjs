import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSearchParams, matchesTitle, matchesLocation, filterJobs } from '../india/filter.mjs';

const params = {
  positive_titles: ['Senior Product Manager', 'Sr PM', 'SPM'],
  negative_titles: ['Junior', 'Intern'],
  locations: ['Bangalore', 'Bengaluru', 'Remote'],
};

test('matchesTitle: accepts Senior Product Manager', () => {
  assert.equal(matchesTitle('Senior Product Manager - Growth', params), true);
});

test('matchesTitle: accepts Sr PM', () => {
  assert.equal(matchesTitle('Sr PM, Payments', params), true);
});

test('matchesTitle: rejects Junior PM', () => {
  assert.equal(matchesTitle('Junior Product Manager', params), false);
});

test('matchesTitle: rejects unrelated title', () => {
  assert.equal(matchesTitle('Software Engineer', params), false);
});

test('matchesTitle: case-insensitive', () => {
  assert.equal(matchesTitle('SENIOR PRODUCT MANAGER', params), true);
});

test('matchesLocation: accepts Bangalore', () => {
  assert.equal(matchesLocation('Bangalore, Karnataka', params), true);
});

test('matchesLocation: accepts Bengaluru', () => {
  assert.equal(matchesLocation('Bengaluru', params), true);
});

test('matchesLocation: rejects Mumbai', () => {
  assert.equal(matchesLocation('Mumbai, Maharashtra', params), false);
});

test('matchesLocation: null location passes through', () => {
  assert.equal(matchesLocation(null, params), true);
});

test('matchesLocation: empty string location is rejected (not a passthrough)', () => {
  assert.equal(matchesLocation('', params), false);
});

test('loadSearchParams: returns object with required arrays', () => {
  const p = loadSearchParams();
  assert.ok(Array.isArray(p.positive_titles));
  assert.ok(Array.isArray(p.negative_titles));
  assert.ok(Array.isArray(p.locations));
  assert.ok(p.positive_titles.length > 0);
});

test('filterJobs: keeps matching, drops non-matching', () => {
  const jobs = [
    { title: 'Senior Product Manager', location: 'Bangalore', jobUrl: 'https://a.com/1', company: 'A', source: 'careers' },
    { title: 'Junior Product Manager', location: 'Bangalore', jobUrl: 'https://a.com/2', company: 'A', source: 'careers' },
    { title: 'Senior Product Manager', location: 'Mumbai',    jobUrl: 'https://a.com/3', company: 'B', source: 'careers' },
  ];
  const result = filterJobs(jobs, params);
  assert.equal(result.length, 1);
  assert.equal(result[0].jobUrl, 'https://a.com/1');
});
