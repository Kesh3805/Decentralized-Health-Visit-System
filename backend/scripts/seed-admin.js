/**
 * Admin Seed Script
 * Creates a default admin user for the Health Visit System
 * 
 * Usage: node scripts/seed-admin.js
 * Or: npm run seed:admin
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/healthvisits';

// Admin schema (inline to avoid dependency issues)
const adminSchema = new mongoose.Schema({
  adminId: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true, lowercase: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin', 'supervisor', 'analyst'], default: 'admin' },
  permissions: [{ type: String }],
  isActive: { type: Boolean, default: true },
  loginAttempts: { type: Number, default: 0 },
  organization: { type: String },
  department: { type: String }
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);

// Default admin configuration
const defaultAdmins = [
  {
    adminId: 'ADMIN-001',
    username: 'admin',
    email: 'admin@healthvisit.local',
    password: 'admin123', // Will be hashed
    fullName: 'System Administrator',
    role: 'super_admin',
    permissions: [
      'view_dashboard',
      'manage_chws',
      'verify_visits',
      'view_analytics',
      'manage_patients',
      'handle_complaints',
      'fraud_detection',
      'system_config',
      'user_management',
      'audit_logs'
    ],
    organization: 'Health Visit System',
    department: 'Administration'
  },
  {
    adminId: 'ADMIN-002',
    username: 'supervisor',
    email: 'supervisor@healthvisit.local',
    password: 'supervisor123',
    fullName: 'Field Supervisor',
    role: 'supervisor',
    permissions: [
      'view_dashboard',
      'manage_chws',
      'verify_visits',
      'view_analytics',
      'fraud_detection'
    ],
    organization: 'Health Visit System',
    department: 'Field Operations'
  },
  {
    adminId: 'ADMIN-003',
    username: 'analyst',
    email: 'analyst@healthvisit.local',
    password: 'analyst123',
    fullName: 'Data Analyst',
    role: 'analyst',
    permissions: [
      'view_dashboard',
      'view_analytics'
    ],
    organization: 'Health Visit System',
    department: 'Data Analytics'
  }
];

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

async function seedAdmins(interactive = false) {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully!\n');

    // Check for existing admins
    const existingCount = await Admin.countDocuments();
    
    if (existingCount > 0 && interactive) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        rl.question(`Found ${existingCount} existing admin(s). Do you want to:\n  1. Skip existing (add new only)\n  2. Delete all and recreate\n  3. Cancel\nChoice (1/2/3): `, resolve);
      });
      rl.close();

      if (answer === '3') {
        console.log('Operation cancelled.');
        process.exit(0);
      }

      if (answer === '2') {
        console.log('Deleting existing admins...');
        await Admin.deleteMany({});
        console.log('Existing admins deleted.\n');
      }
    }

    console.log('Creating admin users...\n');

    for (const adminData of defaultAdmins) {
      try {
        // Check if admin already exists
        const existing = await Admin.findOne({
          $or: [
            { username: adminData.username },
            { email: adminData.email },
            { adminId: adminData.adminId }
          ]
        });

        if (existing) {
          console.log(`⏭️  Skipping ${adminData.username} (already exists)`);
          continue;
        }

        // Hash password
        const hashedPassword = await hashPassword(adminData.password);

        // Create admin
        const admin = new Admin({
          ...adminData,
          password: hashedPassword
        });

        await admin.save();
        console.log(`✅ Created ${adminData.role}: ${adminData.username}`);
        console.log(`   Email: ${adminData.email}`);
        console.log(`   Password: ${adminData.password}`);
        console.log(`   Permissions: ${adminData.permissions.length} permissions\n`);
      } catch (err) {
        console.error(`❌ Failed to create ${adminData.username}:`, err.message);
      }
    }

    // Display summary
    const finalCount = await Admin.countDocuments();
    console.log('\n========================================');
    console.log('Admin Seed Summary');
    console.log('========================================');
    console.log(`Total admin users: ${finalCount}`);
    console.log('\nDefault Login Credentials:');
    console.log('----------------------------------------');
    console.log('Super Admin:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('');
    console.log('Supervisor:');
    console.log('  Username: supervisor');
    console.log('  Password: supervisor123');
    console.log('');
    console.log('Analyst:');
    console.log('  Username: analyst');
    console.log('  Password: analyst123');
    console.log('========================================\n');
    console.log('⚠️  IMPORTANT: Change these passwords in production!');

  } catch (error) {
    console.error('Error seeding admins:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

// Run the seed
seedAdmins(process.argv.includes('--interactive') || process.argv.includes('-i'))
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
