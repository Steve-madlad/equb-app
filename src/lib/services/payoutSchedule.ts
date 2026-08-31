export const DEFAULT_PAYOUT_SCHEDULE_ID = 'equb-payout-sweep';
export const DEFAULT_PAYOUT_CRON = '0 0 * * *';

export function buildAutomatedPayoutScheduleConfig(params: {
  appUrl: string;
  configuredBy: string;
  scheduleId?: string;
  cron?: string;
}) {
  const baseUrl = params.appUrl.replace(/\/$/, '');
  const scheduleId = params.scheduleId ?? DEFAULT_PAYOUT_SCHEDULE_ID;

  return {
    scheduleId,
    destination: `${baseUrl}/api/admin/maintenance/payouts`,
    cron: params.cron ?? DEFAULT_PAYOUT_CRON,
    body: JSON.stringify({
      source: scheduleId,
      configuredBy: params.configuredBy,
    }),
    headers: { 'Content-Type': 'application/json' },
  };
}
