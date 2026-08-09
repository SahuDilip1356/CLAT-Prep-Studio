export function profileFromVerifiedGoogleAccount({ user, claims, existingProfile = null }) {
  if (claims?.privacyStatus !== 'ADULT_CONSENTED') return existingProfile;

  const name = String(existingProfile?.name || user?.displayName || '').trim();
  const email = String(user?.email || existingProfile?.email || '').trim().toLowerCase();
  if (!name || !email || user?.emailVerified !== true) return existingProfile;

  return {
    ...(existingProfile || {}),
    name,
    email,
    targetYear: existingProfile?.targetYear || 'CLAT 2027',
    targetNlu: existingProfile?.targetNlu || 'NLSIU Bengaluru',
    profileSource: existingProfile?.profileSource || 'VERIFIED_GOOGLE_ACCOUNT'
  };
}

export function shouldRequestStudentProfile({
  profileBootstrapResolved,
  activeModule,
  cloudProcessingAllowed,
  studentProfile
}) {
  return Boolean(
    profileBootstrapResolved
    && activeModule !== 'HOME'
    && cloudProcessingAllowed
    && !studentProfile
  );
}
