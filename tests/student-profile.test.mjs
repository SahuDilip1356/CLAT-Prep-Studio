import test from 'node:test';
import assert from 'node:assert/strict';
import {
  profileFromVerifiedGoogleAccount,
  shouldRequestStudentProfile
} from '../src/utils/studentProfile.js';

const adultClaims = { privacyStatus: 'ADULT_CONSENTED' };
const googleUser = {
  displayName: 'Aarav Sahu',
  email: 'Aarav@Example.com',
  emailVerified: true
};

test('creates a missing adult profile from the verified Google account', () => {
  assert.deepEqual(profileFromVerifiedGoogleAccount({ user: googleUser, claims: adultClaims }), {
    name: 'Aarav Sahu',
    email: 'aarav@example.com',
    targetYear: 'CLAT 2027',
    targetNlu: 'NLSIU Bengaluru',
    profileSource: 'VERIFIED_GOOGLE_ACCOUNT'
  });
});

test('preserves student choices while keeping the verified account email current', () => {
  const profile = profileFromVerifiedGoogleAccount({
    user: googleUser,
    claims: adultClaims,
    existingProfile: {
      name: 'Preferred Name',
      email: 'old@example.com',
      targetYear: 'CLAT 2028',
      targetNlu: 'NALSAR Hyderabad'
    }
  });
  assert.equal(profile.name, 'Preferred Name');
  assert.equal(profile.email, 'aarav@example.com');
  assert.equal(profile.targetYear, 'CLAT 2028');
  assert.equal(profile.targetNlu, 'NALSAR Hyderabad');
});

test('does not infer a missing child profile from Google identity', () => {
  assert.equal(profileFromVerifiedGoogleAccount({
    user: googleUser,
    claims: { privacyStatus: 'PARENT_VERIFIED' }
  }), null);
});

test('does not request a profile while cloud restoration is pending', () => {
  assert.equal(shouldRequestStudentProfile({
    profileBootstrapResolved: false,
    activeModule: 'STUDENT',
    cloudProcessingAllowed: true,
    studentProfile: null
  }), false);
});

test('does not request a profile after an existing profile is restored', () => {
  assert.equal(shouldRequestStudentProfile({
    profileBootstrapResolved: true,
    activeModule: 'STUDENT',
    cloudProcessingAllowed: true,
    studentProfile: { name: 'Aarav Sahu', email: 'aarav@example.com' }
  }), false);
});

test('requests a profile only after a child account restore confirms it is missing', () => {
  assert.equal(shouldRequestStudentProfile({
    profileBootstrapResolved: true,
    activeModule: 'STUDENT',
    cloudProcessingAllowed: true,
    studentProfile: null
  }), true);
});
