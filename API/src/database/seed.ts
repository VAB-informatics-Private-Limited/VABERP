import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'vab_enterprise',
});

async function seed() {
  await dataSource.initialize();
  console.log('Database connected.');

  const enterpriseRepo = dataSource.getRepository('enterprises');

  // Check if admin enterprise exists
  const existing = await enterpriseRepo.findOne({
    where: { email: 'admin@vab.com' },
  });

  if (existing) {
    // Update status to active if not already
    if (existing.status !== 'active') {
      await enterpriseRepo.update(existing.id, { status: 'active' });
      console.log(`Enterprise "admin@vab.com" status updated to active.`);
    } else {
      console.log(`Enterprise "admin@vab.com" already exists and is active.`);
    }
  } else {
    const seedPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!seedPassword) {
      console.error('Refusing to create seed enterprise: SEED_ADMIN_PASSWORD env var is not set.');
      await dataSource.destroy();
      process.exit(1);
    }
    const seedEmail = process.env.SEED_ADMIN_EMAIL || 'admin@vab.com';
    const hashedPassword = await bcrypt.hash(seedPassword, 10);
    await enterpriseRepo.save({
      business_name: 'VAB Enterprise',
      email: seedEmail,
      mobile: '9999999999',
      password: hashedPassword,
      city: 'Default',
      state: 'Default',
      status: 'active',
      email_verified: true,
      mobile_verified: true,
    });
    console.log(`Enterprise "${seedEmail}" created (password from SEED_ADMIN_PASSWORD env).`);
  }

  await dataSource.destroy();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
