import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface AttendanceData {
  studentNumber: string;
  studentName: string;
  program: string;
  nationality: string;
  attendance: Map<string, string>; // date -> status
}

async function main() {
  console.log('Starting database seeding...');

  // First, create a default lecturer if none exists
  console.log('Creating default lecturer...');
  let lecturer = await prisma.lecturerProfile.findFirst();
  
  if (!lecturer) {
    const lecturerUser = await prisma.user.create({
      data: {
        email: 'jason.chew@swinburne.edu.my',
        name: 'Jason Thomas Chew',
        role: 'LECTURER',
      }
    });
    
    lecturer = await prisma.lecturerProfile.create({
      data: {
        userId: lecturerUser.id,
        department: 'Computing',
      }
    });
    console.log('Created default lecturer:', lecturer.id);
  }

  // Read the Excel file
  const filePath = path.join(process.cwd(), 'AttendanceForm.xlsx');
  console.log('Reading Excel file from:', filePath);
  
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
  }
  
  // Read the file using fs and then parse with XLSX
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  
  // Process each sheet
  for (const sheetName of workbook.SheetNames) {
    console.log(`\nProcessing sheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    // Find the header row (contains "Sl.No")
    let headerRowIndex = -1;
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any[];
      if (row && row[0] === 'Sl.No') {
        headerRowIndex = i;
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      console.log('No header row found in sheet:', sheetName);
      continue;
    }
    
    // Get class info from row 4 (index 4) or row 3
    let classInfo = '';
    if (data[4] && (data[4] as any[])[0]) {
      classInfo = (data[4] as any[])[0];
    } else if (data[3] && (data[3] as any[])[0]) {
      classInfo = (data[3] as any[])[0];
    }
    
    // Parse class info
    let sessionType = 'LECTURE';
    let groupNumber = '01';
    let dayOfWeek = 'Mon';
    let startTime = '10:00';
    let endTime = '12:00';
    let venue = 'Unknown';
    
    if (classInfo && classInfo.includes(',')) {
      const parts = classInfo.split(',').map((p: string) => p.trim());
      if (parts.length >= 5) {
        sessionType = parts[0] || 'LECTURE';
        groupNumber = parts[1] || '01';
        dayOfWeek = parts[2] || 'Mon';
        const timeRange = parts[3] || '10:00 - 12:00';
        const timeParts = timeRange.split('-');
        startTime = timeParts[0]?.trim() || '10:00';
        endTime = timeParts[1]?.trim() || '12:00';
        venue = parts[4] || 'Unknown';
      }
    }
    
    console.log(`Class: ${sessionType}, Group: ${groupNumber}, Day: ${dayOfWeek}, Time: ${startTime}-${endTime}, Venue: ${venue}`);
    
    // Get or create course
    const courseCode = 'COS20031';
    const courseName = 'Database Design Project';
    
    let course = await prisma.course.findUnique({
      where: { code: courseCode }
    });
    
    if (!course) {
      course = await prisma.course.create({
        data: {
          code: courseCode,
          name: courseName,
          description: 'Database Design Project',
          semester: 'March Semester 1',
          year: 2026,
          capacity: 100,
          classType: 'LECTURE',
          lecturerId: lecturer.id,
        }
      });
      console.log('Created course:', course.code);
    }
    
    // Get or create class session
    let classSession = await prisma.classSession.findFirst({
      where: {
        courseId: course.id,
        sessionType: 'LECTURE',
        groupNumber: groupNumber,
      }
    });
    
    if (!classSession) {
      classSession = await prisma.classSession.create({
        data: {
          courseId: course.id,
          sessionType: 'LECTURE',
          groupNumber: groupNumber,
          dayOfWeek: dayOfWeek,
          startTime: startTime,
          endTime: endTime,
          venue: venue,
        }
      });
      console.log('Created class session:', classSession.id);
    }
    
    // Get headers for date columns
    const headers = data[headerRowIndex] as any[];
    const weekNumbersRow = data[headerRowIndex + 1] as any[];
    
    // Find date columns (start from column I which is index 8)
    const dateColumns: { index: number; date: string; weekNumber: number }[] = [];
    for (let i = 8; i < headers.length; i++) {
      const header = headers[i];
      if (header && typeof header === 'string' && header.match(/\d{2}\/\d{2}/)) {
        let weekNumber = 1;
        if (weekNumbersRow && weekNumbersRow[i]) {
          const weekValue = weekNumbersRow[i];
          weekNumber = typeof weekValue === 'number' ? weekValue : parseInt(weekValue) || 1;
        }
        dateColumns.push({
          index: i,
          date: header,
          weekNumber: weekNumber
        });
      }
    }
    
    console.log(`Found ${dateColumns.length} date columns:`, dateColumns.map(d => d.date));
    
    // Process each student
    let studentCount = 0;
    for (let i = headerRowIndex + 2; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row || row.length < 3) continue;
      
      const studentNumber = row[1]?.toString();
      if (!studentNumber || studentNumber === '' || studentNumber === 'undefined') continue;
      
      const studentName = row[3]?.toString() || `Student ${studentNumber}`;
      const program = row[4]?.toString() || 'Bachelor of Computer Science';
      
      // Create or update student
      let studentProfile = await prisma.studentProfile.findUnique({
        where: { studentId: studentNumber }
      });
      
      if (!studentProfile) {
        // Create user first
        const user = await prisma.user.create({
          data: {
            email: `${studentNumber}@swinburne.edu.my`,
            name: studentName,
            role: 'STUDENT',
          }
        });
        
        studentProfile = await prisma.studentProfile.create({
          data: {
            userId: user.id,
            studentId: studentNumber,
            major: program,
            enrollmentYear: 2026,
          }
        });
        
        // Enroll student in course
        await prisma.courseEnrollment.create({
          data: {
            studentId: studentProfile.id,
            courseId: course.id,
          }
        });
        
        studentCount++;
      }
      
      // Process attendance for each date
      for (const dateCol of dateColumns) {
        const status = row[dateCol.index];
        if (status && (status === 'P' || status === 'A' || status === 'p' || status === 'a')) {
          // Parse date (format: MM/DD)
          const [month, day] = dateCol.date.split('/');
          const year = 2026;
          const attendanceDate = new Date(year, parseInt(month) - 1, parseInt(day));
          
          // Get or create weekly attendance
          let weeklyAttendance = await prisma.weeklyAttendance.findFirst({
            where: {
              classSessionId: classSession.id,
              attendanceDate: attendanceDate,
            }
          });
          
          if (!weeklyAttendance) {
            weeklyAttendance = await prisma.weeklyAttendance.create({
              data: {
                classSessionId: classSession.id,
                attendanceDate: attendanceDate,
                weekNumber: dateCol.weekNumber,
              }
            });
          }
          
          // Create or update attendance mark
          const attendanceStatus = status.toUpperCase() === 'P' ? 'PRESENT' : 'ABSENT';
          
          await prisma.attendanceMark.upsert({
            where: {
              studentId_weeklyAttendanceId: {
                studentId: studentProfile.id,
                weeklyAttendanceId: weeklyAttendance.id
              }
            },
            update: {
              status: attendanceStatus as any,
            },
            create: {
              studentId: studentProfile.id,
              weeklyAttendanceId: weeklyAttendance.id,
              status: attendanceStatus as any,
            }
          });
        }
      }
    }
    
    console.log(`Processed ${studentCount} students in sheet ${sheetName}`);
  }
  
  console.log('\n✅ Seeding completed successfully!');
  console.log('Database now contains all attendance data from the Excel file.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });