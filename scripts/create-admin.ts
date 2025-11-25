/**
 * Script to create a default admin user
 * Run this after initializing the database
 */

import { FileUserStore } from '../auth/FileUserStore';
import { hashPassword } from '../auth/jwt';
import { UserRole } from '../models/User';
import { logger } from '../utils/logger';

async function createDefaultAdmin() {
  try {
    const userStore = new FileUserStore();
    await userStore.initialize();

    // Check if admin already exists
    const existingAdmin = await userStore.findByUsername('admin');
    if (existingAdmin) {
      logger.info('Default admin user already exists');
      console.log('✅ Default admin user already exists');
      return;
    }

    // Create default admin user
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!';
    const passwordHash = await hashPassword(password);

    const admin = await userStore.create({
      username: 'admin',
      email: 'admin@mdl.local',
      password_hash: passwordHash,
      full_name: 'System Administrator',
      role: UserRole.ADMIN,
    });

    logger.info({ user_id: admin.user_id }, 'Default admin user created');
    console.log('✅ Default admin user created successfully');
    console.log('\n📋 Login credentials:');
    console.log(`   Username: admin`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  Please change the password after first login!\n');
  } catch (error) {
    logger.error({ error }, 'Failed to create default admin user');
    console.error('❌ Error creating default admin user:', error);
    process.exit(1);
  }
}

createDefaultAdmin();
