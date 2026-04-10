/** Badge for recurring gifts: uses API field, then falls back to campaign name parenthetical. */

export function recurringIntervalBadge(
  isRecurring: boolean,
  recurringFrequency: string | null | undefined,
  campaignName: string | null | undefined
): string | null {
  if (!isRecurring) return null;
  const fromApi = (recurringFrequency ?? '').trim();
  if (fromApi) {
    const f = fromApi.toLowerCase();
    if (f === 'monthly') return 'Monthly';
    if (f === 'yearly') return 'Yearly';
    if (f === 'weekly') return 'Weekly';
  }
  const cn = campaignName ?? '';
  if (/\(Monthly\)/i.test(cn)) return 'Monthly';
  if (/\(Yearly\)/i.test(cn)) return 'Yearly';
  if (/\(Weekly\)/i.test(cn)) return 'Weekly';
  return 'Recurring';
}

/** Avoid "Custom Donation (Monthly)" + "Monthly" badge: strip trailing (Weekly|Monthly|Yearly) for recurring rows. */
export function primaryDonationLabel(
  campaignName: string | null | undefined,
  donationType: string | null | undefined,
  isRecurring: boolean
): string {
  const raw = campaignName || donationType || 'Donation';
  if (!isRecurring) return raw;
  const stripped = raw.replace(/\s*\((Weekly|Monthly|Yearly)\)\s*$/i, '').trim();
  return stripped || raw;
}
