'use client';

import { useSession } from 'next-auth/react';
import { useState, useCallback } from "react"
import * as XLSX from "xlsx"



interface Student {
  id: string
  name: string
  attendance: number
  status: "Present" | "Absent" | "Late" | "Sick Leave"
}

interface ClassData {
  id: string
  unitCode: string
  unitName: string
  semester: string
  term: string
  day: string
  time: string
  room: string
  students: Student[]
  totalClasses: number
}

export default function LecturerClasses() {
  const [classes, setClasses] = useState<ClassData[]>([
    {
      id: "1",
      unitCode: "COS40005",
      unitName: "Final Year Project",
      semester: "2025-2026",
      term: "Semester 2",
      day: "Monday",
      time: "9:00 AM - 11:00 AM",
      room: "B201",
      totalClasses: 12,
      students: [
        { id: "102345", name: "Ahmad Hakim", attendance: 92, status: "Present" },
        { id: "102346", name: "Priya Nair", attendance: 55, status: "Absent" },
        { id: "102347", name: "Lee Wei Jian", attendance: 88, status: "Present" },
        { id: "102348", name: "Siti Rahmah", attendance: 70, status: "Late" },
      ]
    },
    {
      id: "2",
      unitCode: "COS20019",
      unitName: "Web Technology",
      semester: "2025-2026",
      term: "Semester 2",
      day: "Tuesday",
      time: "11:00 AM - 1:00 PM",
      room: "A104",
      totalClasses: 12,
      students: [
        { id: "102349", name: "John Doe", attendance: 85, status: "Present" },
        { id: "102350", name: "Jane Smith", attendance: 48, status: "Absent" },
      ]
    }
  ])

  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // Calculate stats
  const totalStudents = classes.reduce((acc, c) => acc + c.students.length, 0)
  const classesToday = classes.filter(c => c.day === "Monday").length // Assuming today is Monday
  const atRiskStudents = classes.reduce((acc, c) =>
    acc + c.students.filter(s => s.attendance < 80).length, 0
  )
  const overallAttendance = classes.length > 0
    ? Math.round(classes.reduce((acc, c) =>
      acc + c.students.reduce((sAcc, s) => sAcc + s.attendance, 0) / c.students.length, 0
    ) / classes.length)
    : 0

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Please upload an Excel file only (.xlsx or .xls)')
      return
    }

    setIsUploading(true)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {

        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

        const studentMap: Record<string, {
          name: string
          present: number
          total: number
        }> = {}

        jsonData.forEach((row: any) => {
          const id = row["StudentNumber"]
          const name = row["StudentName"]
          const status = String(row["Status"] || "").toUpperCase()

          if (!id || !name) return

          if (!studentMap[id]) {
            studentMap[id] = {
              name,
              present: 0,
              total: 0
            }
          }

          studentMap[id].total++

          if (status === "PRESENT" || status === "P") {
            studentMap[id].present++
          }
        })

        const students: Student[] = Object.entries(studentMap).map(([id, data]) => {
          const attendance = data.total > 0
            ? Math.round((data.present / data.total) * 100)
            : 0

          let status: Student["status"] = "Absent"
          if (attendance >= 80) status = "Present"
          else if (attendance >= 60) status = "Late"

          return {
            id,
            name: data.name,
            attendance,
            status
          }
        })

        const firstRow = jsonData[0]

        const newClass: ClassData = {
          id: Date.now().toString(),
          unitCode: firstRow["CourseCode"] || "UNKNOWN",
          unitName: firstRow["ProgramName"] || "Imported Class",
          semester: firstRow["TermCode"] || "",
          term: firstRow["TermCode"] || "",
          day: "TBA",
          time: "TBA",
          room: "TBA",
          totalClasses: jsonData.length,
          students
        }

        setClasses(prev => [...prev, newClass])
        setIsUploading(false)

      } catch (error) {
        console.error('Error parsing Excel:', error)
        alert('Error parsing Excel file. Please check the format.')
        setIsUploading(false)
      }
    }
    reader.readAsBinaryString(file)
  }

  const { data: session } = useSession();

  const [currentPage, setCurrentPage] = useState(1)
  const studentsPerPage = 10

  const paginatedStudents = selectedClass
    ? selectedClass.students.slice(
      (currentPage - 1) * studentsPerPage,
      currentPage * studentsPerPage
    )
    : []

  const totalPages = selectedClass
    ? Math.ceil(selectedClass.students.length / studentsPerPage)
    : 1

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="flex-1 min-w-0">

        <div className="p-4 sm:p-6">
          {/* Stats Grid - Right side on desktop, stacked on mobile */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {/* Overall Attendance - Large card */}
            <div className="col-span-2 lg:col-span-1 bg-white p-4 sm:p-5 rounded-xl border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Overall Attendance</p>
                <span className="text-gray-400">↗</span>
              </div>
              <p className="text-3xl sm:text-4xl font-bold text-amber-500">{overallAttendance}%</p>
              <div className="w-full h-2 bg-gray-200 rounded-full mt-3">
                <div className="h-2 bg-amber-500 rounded-full" style={{ width: `${overallAttendance}%` }}></div>
              </div>
              <p className="text-xs text-gray-400 mt-2">⚠ Below 80% threshold</p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-xl border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Enrolled Courses</p>
                <span className="text-gray-400 text-lg">📖</span>
              </div>
              <p className="text-3xl sm:text-4xl font-bold">{classes.length}</p>
              <p className="text-xs text-gray-400 mt-1">This semester</p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-xl border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Classes This Week</p>
                <span className="text-gray-400 text-lg">📅</span>
              </div>
              <p className="text-3xl sm:text-4xl font-bold">{classes.length}</p>
              <p className="text-xs text-gray-400 mt-1">Mon - Fri</p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-xl border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">At-Risk Students</p>
                <span className="text-gray-400 text-lg">⚠️</span>
              </div>
              <p className="text-3xl sm:text-4xl font-bold text-red-600">{atRiskStudents}</p>
              <p className="text-xs text-gray-400 mt-1">Below 80% attendance</p>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column - Classes List */}
            <div className="lg:col-span-2 space-y-4">

              {/* Upload Section */}
              <div
                className={`bg-white rounded-xl border-2 border-dashed p-6 sm:p-8 text-center transition-colors ${dragActive ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="text-4xl mb-3">📊</div>
                <h3 className="font-semibold text-gray-900 mb-1">Upload Class Data</h3>
                <p className="text-sm text-gray-500 mb-4">Drag and drop your Excel file here, or click to browse</p>

                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="excel-upload"
                />
                <label
                  htmlFor="excel-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-red-700 transition-colors"
                >
                  {isUploading ? 'Uploading...' : 'Choose Excel File'}
                </label>

                <p className="text-xs text-gray-400 mt-3">
                  Supports: .xlsx, .xls • Max 10MB
                </p>
              </div>

              {/* Classes List */}
              <div className="bg-white rounded-xl border shadow-sm p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">My Classes</h3>
                  <span className="text-sm text-gray-500">{classes.length} classes</span>
                </div>

                <div className="space-y-3">
                  {classes.map((cls) => (
                    <div
                      key={cls.id}
                      onClick={() => setSelectedClass(cls)}
                      className={`flex items-center justify-between p-4 rounded-xl border-l-4 cursor-pointer transition-all hover:shadow-md ${selectedClass?.id === cls.id
                        ? 'bg-red-50 border-red-500'
                        : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                        }`}
                      style={{
                        borderLeftColor:
                          cls.unitCode === "COS40005" ? '#ef4444' :
                            cls.unitCode === "COS20019" ? '#6366f1' :
                              cls.unitCode === "COS30049" ? '#14b8a6' : '#ec4899'
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 font-medium">{cls.unitCode}</p>
                        <p className="font-semibold text-gray-900 truncate">{cls.unitName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {cls.day} · {cls.time} · {cls.room}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{cls.semester} · {cls.term}</p>
                      </div>

                      <div className="text-right ml-4">
                        <p className="text-lg font-bold text-gray-900">{cls.students.length}</p>
                        <p className="text-xs text-gray-500">students</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {Math.round(cls.students.reduce((a, s) => a + s.attendance, 0) / cls.students.length || 0)}% avg
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Selected Class Details */}
            <div className="space-y-4">
              {selectedClass ? (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <div className="bg-red-600 text-white p-4 sm:p-5">
                    <p className="text-xs uppercase tracking-wide opacity-90">Selected Class</p>
                    <h3 className="text-xl font-bold mt-1">{selectedClass.unitCode}</h3>
                    <p className="text-sm opacity-90">{selectedClass.unitName}</p>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-red-500">
                      <span className="text-sm opacity-90">📍 {selectedClass.room}</span>
                      <span className="text-sm opacity-90">🕐 {selectedClass.day} {selectedClass.time}</span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">Students ({selectedClass.students.length})</h4>
                      <button className="text-xs text-red-600 font-medium hover:underline">
                        Export List
                      </button>
                    </div>

                    <div className="overflow-x-auto -mx-4 px-4">
                      <table className="w-full min-w-[300px]">
                        <thead>
                          <tr className="text-left text-xs text-gray-500 uppercase border-b">
                            <th className="pb-2 font-medium">ID</th>
                            <th className="pb-2 font-medium">Name</th>
                            <th className="pb-2 font-medium text-right">Attendance</th>
                            <th className="pb-2 font-medium text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {paginatedStudents.map((student) => (
                            <tr key={student.id} className="border-b border-gray-50 last:border-0">
                              <td className="py-3 text-gray-600">{student.id}</td>
                              <td className="py-3 font-medium text-gray-900">{student.name}</td>
                              <td className="py-3 text-right">
                                <span className={`font-semibold ${student.attendance >= 80 ? 'text-green-600' :
                                  student.attendance >= 60 ? 'text-amber-500' : 'text-red-600'
                                  }`}>
                                  {student.attendance}%
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${student.status === "Present" ? "bg-green-100 text-green-700" :
                                  student.status === "Absent" ? "bg-red-100 text-red-700" :
                                    student.status === "Late" ? "bg-amber-100 text-amber-700" :
                                      "bg-blue-100 text-blue-700"
                                  }`}>
                                  {student.status === "Present" && "✓"}
                                  {student.status === "Absent" && "✕"}
                                  {student.status === "Late" && "🕐"}
                                  {student.status === "Sick Leave" && "📋"}
                                  {student.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex items-center justify-between mt-4">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                        >
                          Previous
                        </button>

                        <span className="text-sm text-gray-500">
                          Page {currentPage} of {totalPages}
                        </span>

                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
                  <div className="text-4xl mb-3">👆</div>
                  <p className="text-gray-500">Select a class to view student details</p>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-white rounded-xl border shadow-sm p-4 sm:p-5">
                <h4 className="font-semibold mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <button className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors text-left">
                    <span className="text-sm font-medium">Generate QR Code</span>
                    <span className="text-gray-400">›</span>
                  </button>
                  <button className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors text-left">
                    <span className="text-sm font-medium">Send Alerts</span>
                    <span className="text-gray-400">›</span>
                  </button>
                  <button className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors text-left">
                    <span className="text-sm font-medium">Download Report</span>
                    <span className="text-gray-400">›</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Recent Attendance Section */}
          <div className="mt-6 bg-white rounded-xl border shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Recent Attendance Records</h3>
              <button className="text-sm text-red-600 font-medium hover:underline">View all</button>
            </div>

            {classes.length > 0 ? (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase border-b">
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Unit</th>
                      <th className="pb-3 font-medium">Class</th>
                      <th className="pb-3 font-medium text-right">Present</th>
                      <th className="pb-3 font-medium text-right">Absent</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {classes.slice(0, 3).map((cls) => {
                      const present = cls.students.filter(s => s.status === "Present").length
                      const absent = cls.students.length - present
                      return (
                        <tr key={cls.id} className="border-b border-gray-50 last:border-0">
                          <td className="py-3 text-gray-600">Mon, 18 Mar 2026</td>
                          <td className="py-3 font-medium text-gray-900">{cls.unitCode}</td>
                          <td className="py-3 text-gray-600">{cls.unitName}</td>
                          <td className="py-3 text-right">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              ✓ {present}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              ✕ {absent}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">No attendance records yet.</p>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}
