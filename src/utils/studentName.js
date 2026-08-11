/**
 * Her name, or nothing.
 *
 * Every surface used to fall back to "CLAT Aspirant" when no profile existed,
 * so the tutor greeted the learner as "Aspirant, train the constraint that is
 * costing you marks." A placeholder name is worse than no greeting: it tells
 * her the product does not know who she is, and it reads as unfinished.
 *
 * Callers take the null case and drop the greeting rather than fill it.
 */
export function firstNameOf(currentUser, profile) {
  const full = String(currentUser?.displayName || profile?.name || '').trim();
  return full ? full.split(/\s+/)[0] : null;
}
