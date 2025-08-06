import { prisma } from '../clients/database.client';

async function testConnection() {
  try {
    console.log('🔌 Testing database connection...');
    
    // Test the connection
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    const userCount = await prisma.user.count();
    console.log(`📊 Current user count: ${userCount}`);
    
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection(); 