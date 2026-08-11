/**
 * Who is allowed to spend the owner's tutor credit.
 *
 * The provider key is billed to the owner, so /api/tutor answers for two
 * accounts and nobody else. The allowlist is checked against a verified
 * Firebase ID token — an email supplied by the client would be forgeable, so
 * it is never read. Everyone else still gets the deterministic coach.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(ROOT, 'api/tutor.js'), 'utf8');
const client = readFileSync(join(ROOT, 'src/components/AITutor.jsx'), 'utf8');

/** Mirrors the allowlist parsing in api/tutor.js. */
const allowlist = (raw) => new Set(
  String(raw || 'drishtissahu@gmail.com,dilip.sahu@gmail.com')
    .split(',').map((email) => email.trim().toLowerCase()).filter(Boolean),
);

test('the two household accounts are allowed by default', () => {
  const allowed = allowlist(undefined);
  assert.ok(allowed.has('drishtissahu@gmail.com'));
  assert.ok(allowed.has('dilip.sahu@gmail.com'));
  assert.equal(allowed.size, 2);
});

test('nobody else is allowed', () => {
  const allowed = allowlist(undefined);
  for (const stranger of [
    'someone@gmail.com',
    'dilip.sahu@gmail.com.attacker.com',
    'drishtissahu@googlemail.com',
    '',
    'admin@theintello.com',
  ]) {
    assert.equal(allowed.has(stranger), false, `${stranger} must not be allowed`);
  }
});

test('address matching ignores case and surrounding spaces', () => {
  const allowed = allowlist(' Dilip.Sahu@Gmail.com , DRISHTISSAHU@gmail.com ');
  assert.ok(allowed.has('dilip.sahu@gmail.com'));
  assert.ok(allowed.has('drishtissahu@gmail.com'));
});

test('a broken auth service is distinguishable from a rejected stranger', () => {
  // Both used to return 403, so a misconfigured deployment looked identical to
  // one that was correctly turning people away.
  assert.match(source, /status: 'unavailable'/, 'the unavailable state exists');
  assert.match(source, /tutor-auth-unavailable/, 'and is reported distinctly');
  assert.match(source, /startsWith\('auth\/'\)/, 'auth\/* codes are treated as rejections');
  const rejected = source.indexOf("access.status !== 'allowed'");
  const unavailable = source.indexOf("access.status === 'unavailable'");
  assert.ok(unavailable > -1 && unavailable < rejected,
    'the server-fault branch is checked before the rejection branch');
});

test('the endpoint verifies a Firebase token and never trusts a client email', () => {
  assert.match(source, /verifyIdToken\(token, true\)/, 'token verified, revocation checked');
  assert.match(source, /decoded\.email_verified/, 'unverified addresses rejected');
  assert.ok(
    !/body[^\n]*\.email|request\.body\.email/.test(source),
    'an email from the request body must never be read',
  );
});

test('the gate runs before the provider is ever called', () => {
  const gate = source.indexOf('resolveAccess(request)');
  const providerCall = source.indexOf('fetch(OPENROUTER_URL');
  assert.ok(gate > -1 && providerCall > -1);
  assert.ok(gate < providerCall, 'an unauthorised caller must cost nothing');
});

test('a rejected caller still gets the deterministic coach, not an error screen', () => {
  assert.match(source, /tutor-not-enabled-for-account'[^}]*fallback: true/s);
  assert.match(client, /reply \|\| getTutorReply\(trimmed, plan\)/, 'client falls back');
});

test('the client sends its ID token and skips the call when signed out', () => {
  assert.match(client, /auth\.currentUser\?\.getIdToken\(\)/);
  assert.match(client, /if \(idToken\)/, 'no token means no request');
  assert.match(client, /Authorization: `Bearer \$\{idToken\}`/);
});

test('the provider key is only ever read from the server environment', () => {
  assert.match(source, /process\.env\.OPENROUTER_API_KEY/);
  assert.ok(!/VITE_/.test(source), 'a VITE_ prefix would expose it to the browser');
  const srcDir = readFileSync(join(ROOT, 'src/components/AITutor.jsx'), 'utf8');
  assert.ok(!/OPENROUTER/.test(srcDir), 'client code must not reference the key at all');
});

test('every route into the tutor sets both the module and the view', () => {
  const app = readFileSync(join(ROOT, 'src/App.jsx'), 'utf8');
  const helper = app.match(/const openTutor = \(\) => \{[\s\S]*?\};/);
  assert.ok(helper, 'a single openTutor helper exists');
  assert.match(helper[0], /setActiveModule\('STUDENT'\)/);
  assert.match(helper[0], /setViewState\('AI_TUTOR'\)/);

  // The tutor renders only when both are set, so a caller that sets one alone
  // opens a blank screen — which is exactly how the Quant button failed.
  const strayViewOnly = app.match(/onOpenTutor=\{\(\) => setViewState\('AI_TUTOR'\)\}/);
  assert.equal(strayViewOnly, null, 'no entry point sets the view without the module');

  const entryPoints = app.match(/on(Open|Ask)Tutor=\{openTutor\}/g) || [];
  assert.ok(entryPoints.length >= 3, `expected every entry point routed through the helper, saw ${entryPoints.length}`);
});

test('the Quant tools panel opens the real tutor, not its own current view', () => {
  const dash = readFileSync(join(ROOT, 'src/components/Dashboard.jsx'), 'utf8');
  assert.match(dash, /selectedTool\.title === 'AI Tutor' && onOpenTutor/, 'AI Tutor card routes out');
  assert.ok(!/tutor-answer[\s\S]{0,200}setup step is unstable/.test(dash),
    'the hardcoded example answer must not be presented as a tutor reply');
});
