/** Values align with `ml-pipelines/data/supporters.csv` supporter_type column. */

export const PORTAL_SUPPORTER_TYPES = [
  { value: 'MonetaryDonor', label: 'Individual donor' },
  { value: 'InKindDonor', label: 'In-kind donor' },
  { value: 'Volunteer', label: 'Volunteer' },
  { value: 'SocialMediaAdvocate', label: 'Social media advocate' },
  { value: 'PartnerOrganization', label: 'Partner organization' },
  { value: 'SkillsContributor', label: 'Skills contributor' },
] as const;

export type PortalSupporterType = (typeof PORTAL_SUPPORTER_TYPES)[number]['value'];

const labelByValue = Object.fromEntries(
  PORTAL_SUPPORTER_TYPES.map((o) => [o.value, o.label])
) as Record<PortalSupporterType, string>;

export function portalSupporterTypeLabel(code: string | null | undefined): string {
  if (!code) return '—';
  if (code.toLowerCase() === 'individual') return labelByValue.MonetaryDonor;
  return labelByValue[code as PortalSupporterType] ?? code;
}

export const DEFAULT_PORTAL_SUPPORTER_TYPE: PortalSupporterType = 'MonetaryDonor';

export function isPortalSupporterType(v: string): v is PortalSupporterType {
  return PORTAL_SUPPORTER_TYPES.some((o) => o.value === v);
}
