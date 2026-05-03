import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const manifest = JSON.parse(fs.readFileSync('extension/manifest.json', 'utf8'));
const rootPackage = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const corePackage = JSON.parse(fs.readFileSync('packages/core/package.json', 'utf8'));
const popupHtml = fs.readFileSync('extension/popup/popup.html', 'utf8');
const packageScript = fs.readFileSync('scripts/package-chrome.mjs', 'utf8');

test('public extension metadata uses Rate Limit Rescue branding', () => {
  assert.equal(manifest.name, 'Rate Limit Rescue');
  assert.equal(manifest.short_name, 'Rescue');
  assert.match(manifest.description, /instant context transfer/i);
  assert.match(manifest.description, /preferred AI/i);
  assert.equal(manifest.action.default_title, 'Rate Limit Rescue');
});

test('popup public copy uses Rescue labels while preserving technical imports', () => {
  assert.match(popupHtml, /Rate Limit Rescue/);
  assert.match(popupHtml, /Instant context transfer to your preferred AI\./);
  assert.match(popupHtml, /Capture & Open/);
  assert.match(popupHtml, /Save Rescue Pack/);
  assert.match(popupHtml, /Insert Rescue Pack/);
  assert.match(popupHtml, /Copy Handoff/);
  assert.match(popupHtml, /Export Pack/);
  assert.match(popupHtml, /accept="\.json,\.ocp\.json,\.context\.json,application\/json"/);
});

test('package metadata and Chrome artifact use Rate Limit Rescue positioning', () => {
  assert.equal(rootPackage.name, 'rate-limit-rescue');
  assert.match(rootPackage.description, /rate limits/i);
  assert.match(rootPackage.description, /preferred AI/i);
  assert.equal(corePackage.name, '@open-context-protocol/core');
  assert.match(corePackage.description, /Rate Limit Rescue/);
  assert.match(packageScript, /rate-limit-rescue-chrome\.zip/);
  assert.match(packageScript, /open-context-protocol-chrome\.zip/);
  assert.match(packageScript, /legacyZipPath/);
});
