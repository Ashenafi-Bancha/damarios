import { config } from './config';
import { createApp } from './app';
import { prisma } from './lib/prisma';

const server = createApp().listen(config.port, () => {
  console.log(`DaMarios API running on port ${config.port} (${config.isProd ? 'production' : 'development'})`);
  console.log(`Photo storage: ${config.spaces ? `DigitalOcean Spaces (${config.spaces.bucket})` : 'local uploads/ folder'}`);
});

/**
 * On a new deploy the platform stops the old copy with SIGTERM: finish the requests in progress,
 * close the database connections, then exit. Forced exit after 10 seconds.
 */
function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
