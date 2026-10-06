const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync(require.resolve('../public/osce-med/index.html'), 'utf8');

test('OSCE loads one non-blocking page analytics script, independent of login', () => {
  const document = new JSDOM(html).window.document;
  const scripts = [...document.scripts];
  const analytics = scripts.filter(script => script.getAttribute('src') === '/_vercel/insights/script.js');
  assert.equal(analytics.length, 1);
  assert.equal(analytics[0].defer, true);
  assert.equal(analytics[0].parentElement.tagName, 'HEAD');
  assert.equal(document.querySelectorAll('script[type="module"][src="app.js"]').length, 1);
  const inline = scripts.filter(script => !script.src);
  assert.equal(inline.length, 1);
  const context = { window: {} };
  vm.runInNewContext(inline[0].textContent, context);
  assert.equal(typeof context.window.va, 'function');
  assert.equal(context.window.vaq, undefined); // No custom event or user data is queued.
  const existing = () => {};
  context.window.va = existing;
  vm.runInNewContext(inline[0].textContent, context);
  assert.equal(context.window.va, existing);
});
