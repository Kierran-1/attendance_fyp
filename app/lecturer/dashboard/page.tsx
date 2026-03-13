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
    <div className="grid grid-cols-12 gap-6">

      {/* TOP STATS */}
      <div className="col-span-12 grid grid-cols-4 gap-6">

        <div className="bg-white p-5 rounded-xl border">
          <p className="text-xs text-gray-500 uppercase">Today's Classes</p>
          <p className="text-3xl font-bold mt-2">4</p>
          <p className="text-green-600 text-sm mt-1">↑ 1 from yesterday</p>
        </div>

        <div className="bg-white p-5 rounded-xl border">
          <p className="text-xs text-gray-500 uppercase">Avg Attendance</p>
          <p className="text-3xl font-bold text-green-600 mt-2">87%</p>
          <p className="text-green-600 text-sm mt-1">↑ 3% this week</p>
        </div>

        <div className="bg-white p-5 rounded-xl border">
          <p className="text-xs text-gray-500 uppercase">At-Risk Students</p>
          <p className="text-3xl font-bold text-red-600 mt-2">6</p>
          <p className="text-red-500 text-sm mt-1">↑ 2 flagged today</p>
        </div>

        <div className="bg-white p-5 rounded-xl border">
          <p className="text-xs text-gray-500 uppercase">Total Students</p>
          <p className="text-3xl font-bold mt-2">142</p>
          <p className="text-gray-500 text-sm mt-1">Across 4 units</p>
        </div>

      </div>


      {/* TODAY CLASSES */}
      <div className="col-span-8 bg-white rounded-xl border p-6">

        <h2 className="font-semibold mb-4">Today's Classes</h2>

        <div className="space-y-4">
          {classes.map((c) => (
            <div key={c.code} className="flex items-center justify-between border-b pb-4">

              <div className="flex items-start gap-3">
                <div className={`w-1 h-10 rounded ${c.color}`}></div>

                <div>
                  <p className="font-medium">
                    {c.code} — {c.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {c.time} · {c.room} · {c.students} students
                  </p>
                </div>
              </div>

              <div className="text-right">

                {c.attendance ? (
                  <>
                    <p className="font-semibold text-green-600">
                      {c.attendance}%
                    </p>

                    <div className="w-24 h-1 bg-gray-200 rounded mt-1">
                      <div
                        className="h-1 bg-green-500 rounded"
                        style={{ width: `${c.attendance}%` }}
                      ></div>
                    </div>
                  </>
                ) : (
                  <span className="text-gray-400">—</span>
                )}

              </div>

            </div>
          ))}
        </div>

      </div>


      {/* RIGHT COLUMN */}
      <div className="col-span-4 space-y-6">

        {/* WEEKLY ATTENDANCE */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold mb-4">Weekly Attendance</h2>

          <div className="flex items-end gap-3 h-32">

            <div className="bg-red-200 w-8 h-20 rounded"></div>
            <div className="bg-red-300 w-8 h-24 rounded"></div>
            <div className="bg-red-300 w-8 h-18 rounded"></div>
            <div className="bg-red-400 w-8 h-26 rounded"></div>
            <div className="bg-red-500 w-8 h-28 rounded"></div>

          </div>

          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
          </div>

        </div>


        {/* QUICK ACTIONS */}
        <div className="bg-white rounded-xl border p-6 space-y-3">

          <h2 className="font-semibold">Quick Actions</h2>

          <button className="w-full bg-red-600 text-white py-2 rounded-lg font-medium">
            Generate QR for Next Class
          </button>

          <button className="w-full border py-2 rounded-lg">
            Export Today's Report
          </button>

          <button className="w-full border py-2 rounded-lg">
            Send Alerts to At-Risk Students
          </button>

        </div>


        {/* SEMESTER CARD */}
        <div className="bg-red-600 text-white rounded-xl p-6">

          <p className="text-sm opacity-80">THIS SEMESTER</p>

          <p className="text-4xl font-bold mt-2">87.4%</p>

          <p className="text-sm opacity-80 mt-1">
            Overall attendance rate
          </p>

          <div className="w-full bg-red-400 h-2 rounded mt-4">
            <div className="bg-white h-2 rounded w-[87%]"></div>
          </div>

        </div>

      </div>


      {/* AT RISK STUDENTS */}
      <div className="col-span-12 bg-white border rounded-xl p-6">

        <h2 className="font-semibold mb-4">
          ⚠ At-Risk Students
        </h2>

        <table className="w-full text-sm">

          <thead className="text-gray-500 border-b">
            <tr>
              <th className="text-left py-2">Student</th>
              <th className="text-left py-2">Unit</th>
              <th className="text-left py-2">Attendance</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>

          <tbody>
            {atRiskStudents.map((s) => (
              <tr key={s.name} className="border-b">

                <td className="py-3">{s.name}</td>
                <td>{s.unit}</td>
                <td>{s.attendance}</td>

                <td>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      s.status === "High Risk"
                        ? "bg-red-100 text-red-600"
                        : "bg-yellow-100 text-yellow-600"
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
  )}
  
      