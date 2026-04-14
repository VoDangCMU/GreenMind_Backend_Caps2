import cron from 'node-cron';
import AppDataSource from '../infrastructure/database';
import { Campaign, CampaignStatus } from '../entity/campaign';
import { WasteReport, WasteReportStatus } from '../entity/waste_report';

async function syncCampaignStatuses(): Promise<void> {
    const now = new Date();

    try {
        const campaignRepo = AppDataSource.getRepository(Campaign);

        // 1. PENDING → ONGOING
        const pendingToOngoing = await campaignRepo
            .createQueryBuilder()
            .update(Campaign)
            .set({ status: CampaignStatus.ONGOING })
            .where(
                'status = :pending AND "startDate" <= :now AND "endDate" >= :now',
                { pending: CampaignStatus.PENDING, now }
            )
            .returning(['id'])
            .execute();

        const activatedCount = pendingToOngoing.affected ?? 0;

        // 2. ONGOING / PENDING → COMPLETED (catches campaigns that expired before turning ONGOING)
        const ongoingToCompleted = await campaignRepo
            .createQueryBuilder()
            .update(Campaign)
            .set({ status: CampaignStatus.COMPLETED })
            .where(
                'status IN (:...statuses) AND "endDate" < :now',
                { statuses: [CampaignStatus.ONGOING, CampaignStatus.PENDING], now }
            )
            .returning(['id'])
            .execute();

        const completedCount = ongoingToCompleted.affected ?? 0;

        // 3. Mark linked WasteReports as DONE for newly completed campaigns
        if (completedCount > 0 && ongoingToCompleted.raw?.length > 0) {
            const completedIds: string[] = ongoingToCompleted.raw.map(
                (row: { id: string }) => row.id
            );

            const reportRepo = AppDataSource.getRepository(WasteReport);
            await reportRepo
                .createQueryBuilder()
                .update(WasteReport)
                .set({ status: WasteReportStatus.DONE, resolvedAt: now })
                .where(
                    '"campaignId" IN (:...ids) AND status != :done',
                    { ids: completedIds, done: WasteReportStatus.DONE }
                )
                .execute();
        }

        console.log(
            `[CampaignScheduler] Synced at ${now.toISOString()} | ` +
            `PENDING→ONGOING: ${activatedCount} | ONGOING→COMPLETED: ${completedCount}`
        );
    } catch (error) {
        console.error('[CampaignScheduler] Error during sync:', error);
    }
}


export function registerCampaignScheduler(): void {
    cron.schedule('0 * * * *', syncCampaignStatuses, {
        timezone: 'UTC',
    });

    console.log('[CampaignScheduler] Registered — runs every hour (UTC)');

    syncCampaignStatuses();
}
