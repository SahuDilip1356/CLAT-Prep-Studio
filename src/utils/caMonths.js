const normalizeFeaturedMonths = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',');
  return [];
};

export const getDossierMonths = (dossier = {}) => (
  [...new Set([
    dossier.month,
    ...normalizeFeaturedMonths(dossier.featuredMonths)
  ].map((month) => String(month || '').trim()).filter(Boolean))]
);

export const isDossierInMonth = (dossier, month) => (
  getDossierMonths(dossier).includes(month)
);

export const getDossierPriorityForMonth = (dossier = {}, month) => (
  month && month !== dossier.month && isDossierInMonth(dossier, month)
    ? dossier.featuredPriority || dossier.priority
    : dossier.priority
);

const monthTimestamp = (month) => {
  if (month === 'Continuing Issues') return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(`1 ${month}`);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
};

export const compareDossierMonths = (left, right) => {
  const difference = monthTimestamp(left) - monthTimestamp(right);
  return difference || String(left).localeCompare(String(right));
};

export const formatDossierMonthLabel = (dossier = {}) => {
  const months = getDossierMonths(dossier);
  if (months.length <= 1) return months[0] || 'Unfiled';
  return `${months[0]} · updated ${months.slice(1).join(', ')}`;
};
