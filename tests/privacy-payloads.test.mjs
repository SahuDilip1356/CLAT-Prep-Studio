import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSENT_VERSION,
  PRIVACY_NOTICE_VERSION,
  createParentInvitation
} from '../src/privacy.js';

test('under-18 invitation normalizes emails and keeps the student name', () => {
  assert.deepEqual(createParentInvitation({
    parentEmail: ' Parent@Example.COM ',
    childName: '  Aarav Sahu  ',
    childEmail: ' Student@Example.COM '
  }), {
    ageBand: 'CHILD',
    noticeVersion: PRIVACY_NOTICE_VERSION,
    consentVersion: CONSENT_VERSION,
    parentEmail: 'parent@example.com',
    childName: 'Aarav Sahu',
    childEmail: 'student@example.com'
  });
});
