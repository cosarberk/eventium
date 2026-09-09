/**
 * @file Database seed script.
 * Creates the initial admin user and, on a fresh database, a demo dashboard
 * with a public broadcast link so the live/TV view is immediately usable.
 * Reads credentials from ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME env vars.
 *
 * When ADMIN_PASSWORD is absent a strong one is generated and printed once —
 * a seed script must never bake a guessable password into a deployment.
 *
 * Usage: npx tsx prisma/seed.ts
 */
import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

/** Minimum admin password length, matching the register endpoint. */
const MIN_PASSWORD_LENGTH = 12;

/**
 * Resolve the initial admin password: the configured one when it is strong
 * enough, otherwise a freshly generated secret that is printed once.
 *
 * @returns The password and whether it was generated.
 */
function resolveAdminPassword(): { password: string; generated: boolean } {
  const configured = process.env.ADMIN_PASSWORD;

  if (configured && configured.length >= MIN_PASSWORD_LENGTH) {
    return { password: configured, generated: false };
  }

  if (configured) {
    throw new Error(
      `ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters. ` +
        'Unset it to have one generated for you.',
    );
  }

  return { password: randomBytes(18).toString('base64url'), generated: true };
}

/**
 * Creates a demo page with a couple of static design-layer blocks and a public
 * broadcast link. The blocks carry no bindings yet — once a GitLab/Nexus source
 * is installed, the user adds components and binds fields to build a live board.
 *
 * @param userId - Owner of the broadcast link.
 */
async function createDemoDashboard(userId: string): Promise<void> {
  if ((await prisma.dashboard.count()) > 0) return;

  const dashboard = await prisma.dashboard.create({
    data: {
      name: 'Operations',
      description: 'Live operations overview',
      isDefault: true,
      layout: { columns: 12 },
      blocks: {
        create: [
          {
            componentType: 'separator',
            title: '',
            slots: {},
            options: { label: 'Operations Overview' },
            position: { x: 0, y: 0 },
            size: { w: 12, h: 1 },
            sortOrder: 0,
          },
          {
            componentType: 'text',
            title: 'Getting started',
            slots: { content: { values: [] } },
            options: {
              text: 'Install a GitLab or Nexus data source, then add components and bind their fields to build your live board.',
            },
            position: { x: 0, y: 1 },
            size: { w: 12, h: 2 },
            sortOrder: 1,
          },
        ],
      },
    },
  });

  const link = await prisma.broadcastLink.create({
    data: {
      name: 'Operations TV',
      createdBy: userId,
      dashboards: { create: [{ dashboardId: dashboard.id, sortOrder: 0 }] },
    },
  });

  console.log(`Demo dashboard created: ${dashboard.name} (${dashboard.id})`);
  console.log(`Public broadcast link token: ${link.token}`);
}

async function seed(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@eventium.local').toLowerCase();
  const name = process.env.ADMIN_NAME ?? 'Admin';

  const existingCount = await prisma.user.count();

  if (existingCount > 0) {
    console.log('Database already has users. Skipping seed.');
    return;
  }

  const { password, generated } = resolveAdminPassword();
  const passwordHash = await argon2.hash(password);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`Admin user created: ${user.email} (${user.id})`);
  if (generated) {
    console.log('');
    console.log('  ┌─────────────────────────────────────────────────────────┐');
    console.log('  │  Generated admin password — shown only once:            │');
    console.log(`  │  ${password.padEnd(53)} │`);
    console.log('  └─────────────────────────────────────────────────────────┘');
    console.log('');
  }

  await createDemoDashboard(user.id);
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
