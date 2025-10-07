export const toIsoDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return new Date().toISOString();
  }

  const hasTimeSeparator = value.includes('T') ? value : value.replace(' ', 'T');
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}?$/.test(hasTimeSeparator);
  const candidate = hasZone ? hasTimeSeparator : `${hasTimeSeparator}Z`;
  const parsed = new Date(candidate);

  if (Number.isNaN(parsed.valueOf())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
};
