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
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await enterpriseRepo.save({
      business_name: 'VAB Enterprise',
      email: 'admin@vab.com',
      mobile: '9999999999',
      password: hashedPassword,
      city: 'Default',
      state: 'Default',
      status: 'active',
      email_verified: true,
      mobile_verified: true,
    });
    console.log(`Enterprise "admin@vab.com" created with password "admin123".`);
  }

  await dataSource.destroy();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
