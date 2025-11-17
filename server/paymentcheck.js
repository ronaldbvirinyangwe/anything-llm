const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testUserSession() {
  console.log("=== Testing User-Student Relationship ===\n");
  
  // Get all students with their user info
  const students = await prisma.students.findMany({
    include: {
      user: {
        select: {
          id: true,
          username: true,
          role: true,
        }
      }
    }
  });

  students.forEach(student => {
    console.log(`Student ID: ${student.id}`);
    console.log(`  user_id in students table: ${student.user_id}`);
    console.log(`  Actual user.id: ${student.user?.id || 'NOT FOUND'}`);
    console.log(`  Username: ${student.user?.username || 'N/A'}`);
    console.log(`  Role: ${student.user?.role || 'N/A'}`);
    console.log(`  Status: ${student.subscription_status}`);
    console.log(`  Match: ${student.user_id === student.user?.id ? '✅ YES' : '❌ NO'}`);
    console.log('');
  });

  // Test the exact query used in /payments/status
  console.log("=== Testing /payments/status Query ===\n");
  
  for (const student of students) {
    if (student.user_id) {
      const foundStudent = await prisma.students.findFirst({
        where: { user_id: student.user_id },
      });
      
      console.log(`Looking for user_id: ${student.user_id}`);
      console.log(`  Found student: ${foundStudent ? `ID ${foundStudent.id} ✅` : '❌ NOT FOUND'}`);
      console.log(`  Status: ${foundStudent?.subscription_status || 'N/A'}`);
      console.log('');
    }
  }

  await prisma.$disconnect();
}

testUserSession();