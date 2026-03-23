'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
  Cell
} from 'recharts';


export default function ReportsAnalytics() {
  const { data: session } = useSession();

   // Sample data - replace with your actual data
  const classAttendanceData = [
    { name: "COS40005", attendance: 92, students: 38, color: "#ef4444" },
    { name: "COS20019", attendance: 78, students: 54, color: "#6366f1" },
    { name: "COS30049", attendance: 90, students: 29, color: "#14b8a6" },
    { name: "COS10009", attendance: 85, students: 21, color: "#ec4899" },
    { name: "COS30041", attendance: 72, students: 45, color: "#f59e0b" },
    { name: "COS20007", attendance: 88, students: 33, color: "#8b5cf6" }
  ]

  const weeklyTrendData = [
    { week: "Week 1", cos40005: 95, cos20019: 82, cos30049: 88, cos10009: 90 },
    { week: "Week 2", cos40005: 93, cos20019: 80, cos30049: 85, cos10009: 88 },
    { week: "Week 3", cos40005: 94, cos20019: 78, cos30049: 90, cos10009: 85 },
    { week: "Week 4", cos40005: 92, cos20019: 76, cos30049: 92, cos10009: 87 },
    { week: "Week 5", cos40005: 91, cos20019: 75, cos30049: 89, cos10009: 84 },
    { week: "Week 6", cos40005: 92, cos20019: 78, cos30049: 90, cos10009: 85 }
  ]

  const monthlyTrendData = [
    { month: "Jan", overall: 88 },
    { month: "Feb", overall: 86 },
    { month: "Mar", overall: 84 },
    { month: "Apr", overall: 87 },
    { month: "May", overall: 85 },
    { month: "Jun", overall: 83 }
  ]

  const studentBreakdown = [
    { name: "Ahmad Hakim", id: "101234567", unit: "COS20019", attendance: 48, classesAttended: "12/25", status: "High Risk" },
    { name: "Priya Nair", id: "101234568", unit: "COS40005", attendance: 55, classesAttended: "14/25", status: "High Risk" },
    { name: "Lee Wei Jian", id: "101234569", unit: "COS30049", attendance: 62, classesAttended: "16/26", status: "Medium" },
    { name: "Siti Rahmah", id: "101234570", unit: "COS20019", attendance: 70, classesAttended: "18/26", status: "Medium" },
    { name: "John Smith", id: "101234571", unit: "COS10009", attendance: 74, classesAttended: "17/23", status: "Medium" },
    { name: "Emma Wilson", id: "101234572", unit: "COS30041", attendance: 45, classesAttended: "9/20", status: "High Risk" },
    { name: "Chen Wei", id: "101234573", unit: "COS20007", attendance: 68, classesAttended: "15/22", status: "Medium" },
    { name: "Sarah Johnson", id: "101234574", unit: "COS40005", attendance: 72, classesAttended: "18/25", status: "Medium" }
  ]

  const [timeRange, setTimeRange] = useState("weekly")

  const stats = {
    totalClasses: 6,
    totalStudents: 220,
    avgAttendance: 84,
    atRiskCount: 8,
    highRiskCount: 3,
    mediumRiskCount: 5
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="mx-auto grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 md:gap-6 max-w-7xl">

        {/* HEADER */}
        <div className="col-span-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics & Reports</h1>
            <p className="text-sm text-gray-500 mt-1">Decision-making dashboard for attendance insights</p>
          </div>
          <div className="flex gap-2">
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="weekly">Weekly View</option>
              <option value="monthly">Monthly View</option>
              <option value="semester">Semester View</option>
            </select>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
              Export Report
            </button>
          </div>
        </div>

        {/* KEY METRICS CARDS */}
        <div className="col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-xl border shadow-sm">
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Total Classes</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats.totalClasses}</p>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">Active this semester</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-xl border shadow-sm">
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Avg Attendance</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1 sm:mt-2">{stats.avgAttendance}%</p>
            <p className="text-green-600 text-xs sm:text-sm mt-1">↑ 2% from last month</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-xl border shadow-sm">
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">At-Risk Students</p>
            <p className="text-2xl sm:text-3xl font-bold text-red-600 mt-1 sm:mt-2">{stats.atRiskCount}</p>
            <p className="text-xs sm:text-sm mt-1">
              <span className="text-red-600 font-medium">{stats.highRiskCount} High</span>
              <span className="text-gray-400 mx-1">·</span>
              <span className="text-yellow-600 font-medium">{stats.mediumRiskCount} Medium</span>
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-xl border shadow-sm">
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Total Students</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">{stats.totalStudents}</p>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">Across all units</p>
          </div>
        </div>

        {/* BAR CHART - Class Attendance */}
        <div className="col-span-12 lg:col-span-7 bg-white rounded-xl border shadow-sm p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base sm:text-lg">Attendance % by Class</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              <span>Below 75%</span>
              <span className="w-3 h-3 bg-green-500 rounded-full ml-2"></span>
              <span>Above 75%</span>
            </div>
          </div>
          
          <div className="h-64 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classAttendanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Attendance']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Risk Threshold (75%)', position: 'right', fill: '#ef4444', fontSize: 10 }} />
                <Bar dataKey="attendance" radius={[4, 4, 0, 0]}>
                  {classAttendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.attendance >= 75 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 grid grid-cols-3 gap-4 text-center text-xs text-gray-600 border-t pt-4">
            <div>
              <p className="font-semibold text-green-600">4 Classes</p>
              <p>Above threshold</p>
            </div>
            <div>
              <p className="font-semibold text-red-600">2 Classes</p>
              <p>Below threshold</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Lowest: COS30041</p>
              <p>72% attendance</p>
            </div>
          </div>
        </div>

        {/* LINE CHART - Trend Over Time */}
        <div className="col-span-12 lg:col-span-5 bg-white rounded-xl border shadow-sm p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base sm:text-lg">Attendance Trends</h2>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button 
                onClick={() => setTimeRange("weekly")}
                className={`px-3 py-1 text-xs rounded-md transition-all ${timeRange === "weekly" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
              >
                Weekly
              </button>
              <button 
                onClick={() => setTimeRange("monthly")}
                className={`px-3 py-1 text-xs rounded-md transition-all ${timeRange === "monthly" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
              >
                Monthly
              </button>
            </div>
          </div>
          
          <div className="h-64 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {timeRange === "weekly" ? (
                <LineChart data={weeklyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} domain={[60, 100]} tickFormatter={(value) => `${value}%`} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="cos40005" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="COS40005" />
                  <Line type="monotone" dataKey="cos20019" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name="COS20019" />
                  <Line type="monotone" dataKey="cos30049" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} name="COS30049" />
                  <Line type="monotone" dataKey="cos10009" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} name="COS10009" />
                </LineChart>
              ) : (
                <LineChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} domain={[70, 95]} tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Overall Attendance']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '75% Threshold', position: 'right', fill: '#ef4444', fontSize: 10 }} />
                  <Line type="monotone" dataKey="overall" stroke="#dc2626" strokeWidth={3} dot={{ r: 4, fill: '#dc2626' }} activeDot={{ r: 6 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2 justify-center text-xs">
            {timeRange === "weekly" ? (
              <>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>COS40005</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500"></span>COS20019</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500"></span>COS30049</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500"></span>COS10009</span>
              </>
            ) : (
              <p className="text-gray-500">Semester-wide attendance trend showing gradual decline</p>
            )}
          </div>
        </div>

        {/* AT-RISK STUDENTS TABLE */}
        <div className="col-span-12 bg-white border rounded-xl shadow-sm p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold text-base sm:text-lg flex items-center gap-2">
              <span className="text-red-500">⚠️</span> At-Risk Students (&lt;75% Attendance)
            </h2>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Filter by Unit
              </button>
              <button className="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
                Send Alerts
              </button>
            </div>
          </div>

          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <table className="w-full text-xs sm:text-sm min-w-[600px]">
              <thead className="text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="text-left py-2 sm:py-3 font-medium">Student Name</th>
                  <th className="text-left py-2 sm:py-3 font-medium">Student ID</th>
                  <th className="text-left py-2 sm:py-3 font-medium">Unit</th>
                  <th className="text-left py-2 sm:py-3 font-medium">Attendance %</th>
                  <th className="text-left py-2 sm:py-3 font-medium">Classes Attended</th>
                  <th className="text-left py-2 sm:py-3 font-medium">Risk Level</th>
                  <th className="text-left py-2 sm:py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {studentBreakdown.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 sm:py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="py-2.5 sm:py-3 text-gray-600 font-mono text-xs">{s.id}</td>
                    <td className="py-2.5 sm:py-3 text-gray-600">{s.unit}</td>
                    <td className="py-2.5 sm:py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${s.attendance < 50 ? 'text-red-600' : s.attendance < 65 ? 'text-orange-600' : 'text-yellow-600'}`}>
                          {s.attendance}%
                        </span>
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full">
                          <div
                            className={`h-1.5 rounded-full ${s.attendance < 50 ? 'bg-red-500' : s.attendance < 65 ? 'bg-orange-500' : 'bg-yellow-500'}`}
                            style={{ width: `${s.attendance}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 sm:py-3 text-gray-600">{s.classesAttended}</td>
                    <td className="py-2.5 sm:py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-md text-[10px] sm:text-xs font-medium ${
                          s.status === "High Risk"
                            ? "bg-red-100 text-red-600"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2.5 sm:py-3">
                      <button className="text-red-600 hover:text-red-800 text-xs font-medium">
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500 border-t pt-3">
            <p>Showing {studentBreakdown.length} at-risk students out of {stats.totalStudents} total</p>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Previous</button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Next</button>
            </div>
          </div>
        </div>

        {/* SUMMARY INSIGHTS */}
        <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-red-600 to-red-700 text-white rounded-xl p-4 sm:p-5 shadow-md">
            <p className="text-xs opacity-90 uppercase tracking-wide mb-2">Critical Insight</p>
            <p className="text-lg font-semibold">COS20019 has declining attendance</p>
            <p className="text-sm opacity-90 mt-1">Down 8% over the last 3 weeks. Consider intervention.</p>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-4 sm:p-5 shadow-md">
            <p className="text-xs opacity-90 uppercase tracking-wide mb-2">Pattern Detected</p>
            <p className="text-lg font-semibold">Friday classes show lower attendance</p>
            <p className="text-sm opacity-90 mt-1">Average 12% lower than Monday sessions.</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-600 to-green-700 text-white rounded-xl p-4 sm:p-5 shadow-md">
            <p className="text-xs opacity-90 uppercase tracking-wide mb-2">Positive Trend</p>
            <p className="text-lg font-semibold">COS30049 improving steadily</p>
            <p className="text-sm opacity-90 mt-1">Up 4% this month. Keep current approach.</p>
          </div>
        </div>

      </div>
    </div>
  )

}
