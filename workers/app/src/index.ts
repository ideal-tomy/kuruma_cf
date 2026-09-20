import type { AppEnv } from './env';
import { app } from './app';
import { runDailyExtract } from './lib/daily-extract';

export default {
  fetch: app.fetch,
  async scheduled(
    controller: ScheduledController,
    env: AppEnv['Bindings'],
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(
      runDailyExtract(env, { trigger: 'scheduled', cron: controller.cron }).catch((error) => {
        console.error('[cron.daily_extract]', error);
      }),
    );
  },
};
