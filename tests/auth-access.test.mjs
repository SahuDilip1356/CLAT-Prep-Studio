import test from 'node:test';
import assert from 'node:assert/strict';
import { canUseAuthenticatedAccount, hasAdminAccess } from '../src/authAccess.js';

test('privacy administrators can sign in without student consent activation', () => {
  const claims = { privacyAdmin: true };
  assert.equal(hasAdminAccess(claims), true);
  assert.equal(canUseAuthenticatedAccount(claims), true);
});

test('Current Affairs administrators can sign in without student consent activation', () => {
  const claims = { caAdmin: true };
  assert.equal(hasAdminAccess(claims), true);
  assert.equal(canUseAuthenticatedAccount(claims), true);
});

test('an unactivated account without an admin role is rejected', () => {
  assert.equal(canUseAuthenticatedAccount({}), false);
});
