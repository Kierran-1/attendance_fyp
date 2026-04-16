-- Drop everything first (clean slate)
DROP TABLE IF EXISTS "AttendanceEvidence" CASCADE;
DROP TABLE IF EXISTS "ClassAttendanceRecord" CASCADE;
DROP TABLE IF EXISTS "ClassAttendanceData" CASCADE;
DROP TABLE IF EXISTS "ClassSession" CASCADE;
DROP TABLE IF EXISTS "UnitRegistration" CASCADE;
DROP TABLE IF EXISTS "Unit" CASCADE;
DROP TABLE IF EXISTS "Account" CASCADE;
DROP TABLE IF EXISTS "AccountSession" CASCADE;
DROP TABLE IF EXISTS "VerificationToken" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- Drop types if they exist
DROP TYPE IF EXISTS "AttendanceStatus" CASCADE;
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "UserStatus" CASCADE;
DROP TYPE IF EXISTS "SessionName" CASCADE;

-- ============================================
-- CREATE ENUM TYPES
-- ============================================

CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'PENDING');
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'LECTURER');
CREATE TYPE "UserStatus" AS ENUM ('STUDENT', 'LECTURER', 'TUTOR');
CREATE TYPE "SessionName" AS ENUM ('LECTURE', 'TUTORIAL', 'LAB');

-- ============================================
-- CREATE TABLES
-- ============================================

-- User table
CREATE TABLE "User" (
  id TEXT NOT NULL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  emailVerified TIMESTAMP,
  name TEXT,
  image TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  orgId TEXT,
  qrState TEXT,
  disabledAt TIMESTAMP,
  role "UserRole" NOT NULL DEFAULT 'STUDENT',
  programName TEXT,
  nationality TEXT,
  schoolStatus TEXT
);

-- Account table
CREATE TABLE "Account" (
  id TEXT NOT NULL PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  providerAccountId TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  ext_expires_in INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  CONSTRAINT "Account_userId_fkey" FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE,
  UNIQUE(provider, providerAccountId)
);

-- AccountSession table
CREATE TABLE "AccountSession" (
  id TEXT NOT NULL PRIMARY KEY,
  sessionToken TEXT NOT NULL UNIQUE,
  userId TEXT NOT NULL,
  expires TIMESTAMP NOT NULL,
  CONSTRAINT "AccountSession_userId_fkey" FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE
);

-- VerificationToken table
CREATE TABLE "VerificationToken" (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMP NOT NULL,
  UNIQUE(identifier, token)
);

-- Unit table
CREATE TABLE "Unit" (
  id TEXT NOT NULL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

-- UnitRegistration table
CREATE TABLE "UnitRegistration" (
  id TEXT NOT NULL PRIMARY KEY,
  unitId TEXT NOT NULL,
  userId TEXT NOT NULL,
  name TEXT,
  year INTEGER NOT NULL,
  semester TEXT NOT NULL,
  userStatus "UserStatus" NOT NULL,
  termCode TEXT,
  CONSTRAINT "UnitRegistration_unitId_fkey" FOREIGN KEY (unitId) REFERENCES "Unit"(id) ON DELETE CASCADE,
  CONSTRAINT "UnitRegistration_userId_fkey" FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE,
  UNIQUE(unitId, userId, name)
);

-- ClassSession table
CREATE TABLE "ClassSession" (
  id TEXT NOT NULL PRIMARY KEY,
  unitRegistrationId TEXT NOT NULL,
  lecturerId TEXT NOT NULL,
  sessionName "SessionName" NOT NULL,
  sessionTime TIMESTAMP NOT NULL,
  sessionDuration INTEGER NOT NULL,
  weekNumber INTEGER,
  subcomponent TEXT,
  groupNo TEXT,
  location TEXT,
  CONSTRAINT "ClassSession_unitRegistrationId_fkey" FOREIGN KEY (unitRegistrationId) REFERENCES "UnitRegistration"(id) ON DELETE CASCADE,
  CONSTRAINT "ClassSession_lecturerId_fkey" FOREIGN KEY (lecturerId) REFERENCES "User"(id)
);

-- ClassAttendanceData table
CREATE TABLE "ClassAttendanceData" (
  id TEXT NOT NULL PRIMARY KEY,
  classSessionId TEXT NOT NULL,
  scanPayload JSONB NOT NULL,
  scanMethod TEXT,
  verificationStage TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  challengeToken TEXT,
  studentId TEXT,
  CONSTRAINT "ClassAttendanceData_classSessionId_fkey" FOREIGN KEY (classSessionId) REFERENCES "ClassSession"(id) ON DELETE CASCADE
);

-- ClassAttendanceRecord table
CREATE TABLE "ClassAttendanceRecord" (
  id TEXT NOT NULL PRIMARY KEY,
  classSessionId TEXT NOT NULL,
  studentId TEXT NOT NULL,
  status "AttendanceStatus" NOT NULL DEFAULT 'PENDING',
  verifiedAt TIMESTAMP,
  verificationConfidence FLOAT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassAttendanceRecord_classSessionId_fkey" FOREIGN KEY (classSessionId) REFERENCES "ClassSession"(id) ON DELETE CASCADE,
  UNIQUE(classSessionId, studentId)
);

-- AttendanceEvidence table
CREATE TABLE "AttendanceEvidence" (
  id TEXT NOT NULL PRIMARY KEY,
  attendanceRecordId TEXT NOT NULL,
  uploadedBy TEXT NOT NULL,
  fileUrl TEXT NOT NULL,
  reason TEXT,
  uploadedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'PENDING',
  CONSTRAINT "AttendanceEvidence_attendanceRecordId_fkey" FOREIGN KEY (attendanceRecordId) REFERENCES "ClassAttendanceRecord"(id) ON DELETE CASCADE
);

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX "idx_account_userId" ON "Account"(userId);
CREATE INDEX "idx_accountsession_userId" ON "AccountSession"(userId);
CREATE INDEX "idx_unitregistration_userId" ON "UnitRegistration"(userId);
CREATE INDEX "idx_unitregistration_unitId" ON "UnitRegistration"(unitId);
CREATE INDEX "idx_classsession_unitRegistrationId" ON "ClassSession"(unitRegistrationId);
CREATE INDEX "idx_classsession_lecturerId" ON "ClassSession"(lecturerId);
CREATE INDEX "idx_classattendancedata_classSessionId" ON "ClassAttendanceData"(classSessionId);
CREATE INDEX "idx_classattendancerecord_classSessionId" ON "ClassAttendanceRecord"(classSessionId);
CREATE INDEX "idx_classattendancerecord_studentId" ON "ClassAttendanceRecord"(studentId);
CREATE INDEX "idx_attendanceevidence_attendanceRecordId" ON "AttendanceEvidence"(attendanceRecordId);

-- ============================================
-- CREATE AUTO-UPDATE TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_updatedAt
    BEFORE UPDATE ON "User"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFY INSTALLATION
-- ============================================

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
