"use client"

export default function LecturerDashboard() {

  const classes = [
    {
      code: "COS40005",
      name: "Final Year Project",
      time: "9:00 AM",
      room: "Room B201",
      students: 38,
      attendance: 92,
      color: "bg-red-500"
    },
    {
      code: "COS20019",
      name: "Web Technology",
      time: "11:00 AM",
      room: "Room A104",
      students: 54,
      attendance: 78,
      color: "bg-indigo-500"
    },
    {
      code: "COS30049",
      name: "Computing Technology",
      time: "2:00 PM",
      room: "Room C302",
      students: 29,
      attendance: 90,
      color: "bg-teal-500"
    },
    {
      code: "COS10009",
      name: "Intro to Programming",
      time: "4:00 PM",
      room: "Room B105",
      students: 21,
      attendance: null,
      color: "bg-pink-500"
    }
  ]

  const atRiskStudents = [
    { name: "Ahmad Hakim", unit: "COS20019", attendance: "48%", status: "High Risk" },
    { name: "Priya Nair", unit: "COS40005", attendance: "55%", status: "High Risk" },
    { name: "Lee Wei Jian", unit: "COS30049", attendance: "62%", status: "Medium" },
    { name: "Siti Rahmah", unit: "COS20019", attendance: "70%", status: "Medium" }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="mx-auto grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 md:gap-6">

        {/* TOP STATS - Stack on mobile, 2 cols on sm, 4 cols on lg */}
        <div className="col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

          <div className="bg-white p-4 sm:p-5 rounded-xl border shadow-sm">
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Today's Classes</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">4</p>
            <p className="text-green-600 text-xs sm:text-sm mt-1">↑ 1 from yesterday</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-xl border shadow-sm">
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Avg Attendance</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1 sm:mt-2">87%</p>
            <p className="text-green-600 text-xs sm:text-sm mt-1">↑ 3% this week</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-xl border shadow-sm">
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">At-Risk Students</p>
            <p className="text-2xl sm:text-3xl font-bold text-red-600 mt-1 sm:mt-2">6</p>
            <p className="text-red-500 text-xs sm:text-sm mt-1">↑ 2 flagged today</p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-xl border shadow-sm">
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide">Total Students</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">142</p>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">Across 4 units</p>
          </div>

        </div>


        {/* TODAY CLASSES - Full width on all screens */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-xl border shadow-sm p-3 sm:p-4 md:p-6">

          <h2 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">Today's Classes</h2>

          <div className="space-y-3 sm:space-y-4">
            {classes.map((c) => (
              <div 
                key={c.code} 
                className="flex flex-row items-center justify-between gap-2 sm:gap-3 border-b border-gray-100 pb-3 sm:pb-4 last:border-0"
              >

                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className={`w-1 h-8 sm:h-10 rounded-full flex-shrink-0 ${c.color}`}></div>

                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">
                      {c.code} — {c.name}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">
                      {c.time} · {c.room} · {c.students} students
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 ml-2">
                  {c.attendance ? (
                    <div className="flex flex-col items-end">
                      <p className="font-semibold text-green-600 text-sm sm:text-base">
                        {c.attendance}%
                      </p>
                      <div className="w-16 sm:w-24 h-1.5 bg-gray-200 rounded-full mt-1">
                        <div
                          className="h-1.5 bg-green-500 rounded-full"
                          style={{ width: `${c.attendance}%` }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">—</span>
                  )}
                </div>

              </div>
            ))}
          </div>

        </div>


        {/* RIGHT COLUMN - Stack below on mobile, side on desktop */}
        <div className="col-span-12 lg:col-span-4 space-y-3 sm:space-y-4 md:space-y-6">

          {/* WEEKLY ATTENDANCE */}
          <div className="bg-white rounded-xl border shadow-sm p-3 sm:p-4 md:p-6">
            <h2 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">Weekly Attendance</h2>

            <div className="flex items-end justify-between sm:justify-start sm:gap-4 h-24 sm:h-32 px-2">
              <div className="bg-red-200 w-full sm:w-8 h-16 sm:h-20 rounded-t-lg"></div>
              <div className="bg-red-300 w-full sm:w-8 h-20 sm:h-24 rounded-t-lg"></div>
              <div className="bg-red-300 w-full sm:w-8 h-14 sm:h-[72px] rounded-t-lg"></div>
              <div className="bg-red-400 w-full sm:w-8 h-22 sm:h-26 rounded-t-lg"></div>
              <div className="bg-red-500 w-full sm:w-8 h-24 sm:h-28 rounded-t-lg"></div>
            </div>

            <div className="flex justify-between text-xs text-gray-500 mt-3 px-1">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
            </div>

          </div>


          {/* QUICK ACTIONS */}
          <div className="bg-white rounded-xl border shadow-sm p-3 sm:p-4 md:p-6 space-y-2 sm:space-y-3">

            <h2 className="font-semibold text-base sm:text-lg">Quick Actions</h2>

            <button className="w-full bg-red-600 text-white py-2.5 sm:py-3 rounded-lg font-medium text-sm sm:text-base active:scale-[0.98] transition-transform">
              Generate QR for Next Class
            </button>

            <button className="w-full border border-gray-300 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base text-gray-700 active:bg-gray-50 transition-colors">
              Export Today's Report
            </button>

            <button className="w-full border border-gray-300 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base text-gray-700 active:bg-gray-50 transition-colors">
              Send Alerts to At-Risk Students
            </button>

          </div>


          {/* SEMESTER CARD */}
          <div className="bg-red-600 text-white rounded-xl p-4 sm:p-5 md:p-6 shadow-md">

            <p className="text-xs sm:text-sm opacity-90 uppercase tracking-wide">This Semester</p>

            <p className="text-3xl sm:text-4xl font-bold mt-2">87.4%</p>

            <p className="text-xs sm:text-sm opacity-90 mt-1">
              Overall attendance rate
            </p>

            <div className="w-full bg-red-400/50 h-2 rounded-full mt-4">
              <div className="bg-white h-2 rounded-full" style={{ width: "87.4%" }}></div>
            </div>

          </div>

        </div>


        {/* AT RISK STUDENTS - Full width, horizontal scroll on mobile */}
        <div className="col-span-12 bg-white border rounded-xl shadow-sm p-3 sm:p-4 md:p-6">

          <h2 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">
            ⚠️ At-Risk Students
          </h2>

          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <table className="w-full text-xs sm:text-sm min-w-[500px]">

              <thead className="text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="text-left py-2 sm:py-3 font-medium">Student</th>
                  <th className="text-left py-2 sm:py-3 font-medium">Unit</th>
                  <th className="text-left py-2 sm:py-3 font-medium">Attendance</th>
                  <th className="text-left py-2 sm:py-3 font-medium">Status</th>
                </tr>
              </thead>

              <tbody>
                {atRiskStudents.map((s) => (
                  <tr key={s.name} className="border-b border-gray-100 last:border-0">

                    <td className="py-2.5 sm:py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="py-2.5 sm:py-3 text-gray-600">{s.unit}</td>
                    <td className="py-2.5 sm:py-3 text-gray-600">{s.attendance}</td>

                    <td className="py-2.5 sm:py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-md text-[10px] sm:text-xs font-medium ${s.status === "High Risk"
                            ? "bg-red-100 text-red-600"
                            : "bg-yellow-100 text-yellow-700"
                          }`}
                      >
                        {s.status}
                      </span>
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        </div>

      </div>
    </div>
  )
}