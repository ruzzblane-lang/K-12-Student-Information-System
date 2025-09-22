// Basic usage example for JavaScript/TypeScript SDK
import { SchoolSIS } from '@school-sis/sdk';

async function main() {
  // Initialize the client
  const client = new SchoolSIS({
    baseUrl: 'https://api.schoolsis.com',
    tenantSlug: 'springfield-high'
  });

  try {
    // 1. Login to get authentication token
    console.log('Logging in...');
    const auth = await client.login('admin@springfield.edu', 'secure-password');
    console.log('Login successful:', auth.message);

    // 2. Get list of students
    console.log('\nFetching students...');
    const { students, pagination } = await client.students.list({
      page: 1,
      limit: 10,
      sort: 'last_name:asc'
    });

    console.log(`Found ${pagination.total} students`);
    students.forEach(student => {
      console.log(`- ${student.firstName} ${student.lastName} (Grade ${student.gradeLevel})`);
    });

    // 3. Search for students
    console.log('\nSearching for students with "John"...');
    const searchResults = await client.students.search('John');
    console.log(`Found ${searchResults.students.length} students matching "John"`);

    // 4. Get students by grade level
    console.log('\nFetching 10th grade students...');
    const grade10Students = await client.students.getByGradeLevel('10');
    console.log(`Found ${grade10Students.students.length} 10th grade students`);

    // 5. Create a new student
    console.log('\nCreating new student...');
    const newStudent = await client.students.create({
      studentId: 'SHS-2024-001',
      firstName: 'Alice',
      lastName: 'Johnson',
      dateOfBirth: '2008-05-15',
      gradeLevel: '10',
      enrollmentDate: '2024-08-15',
      primaryEmail: 'alice.johnson@student.springfield-high.edu',
      address: '123 Main Street',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62701',
      country: 'USA'
    });
    console.log('Student created:', newStudent.id);

    // 6. Update the student
    console.log('\nUpdating student...');
    const updatedStudent = await client.students.update(newStudent.id, {
      preferredName: 'Ali',
      primaryPhone: '555-123-4567'
    });
    console.log('Student updated:', updatedStudent.preferredName);

    // 7. Get student statistics
    console.log('\nFetching student statistics...');
    const stats = await client.students.getStatistics();
    console.log('Student Statistics:', {
      total: stats.total,
      byGradeLevel: stats.byGradeLevel,
      byStatus: stats.byStatus
    });

    // 8. Export students to CSV
    console.log('\nExporting students to CSV...');
    const csvBlob = await client.students.exportCSV();
    console.log('CSV exported, size:', csvBlob.size, 'bytes');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.status) {
      console.error('HTTP status:', error.status);
    }
  } finally {
    // 9. Logout
    console.log('\nLogging out...');
    await client.logout();
    console.log('Logged out successfully');
  }
}

// Run the example
main().catch(console.error);
