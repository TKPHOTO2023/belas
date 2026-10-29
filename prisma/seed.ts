// Creates the platform workspace and first platform admin.
// Run once after `npm run db:push`:  npm run db:seed
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@bela.ai').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 10) {
    throw new Error('Set SEED_ADMIN_PASSWORD (10+ characters) before seeding.');
  }

  const platform = await db.workspace.upsert({
    where: { slug: 'platform' },
    update: {},
    create: { name: 'Bela', slug: 'platform', isPlatform: true, brandName: 'Bela' },
  });

  await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Platform admin',
      passwordHash: await bcrypt.hash(password, 12),
      role: 'PLATFORM_ADMIN',
      workspaceId: platform.id,
    },
  });
  console.log(`Platform admin ready: ${email}`);
}

main().finally(() => db.$disconnect());
