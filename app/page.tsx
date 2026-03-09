import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Automated Attendance System
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Smart Recognition Technology with Real-Time Data Synchronization
          </p>
          <p className="text-gray-700 mb-12">
            Swinburne University of Technology Sarawak Campus
          </p>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-4xl mb-4">🎓</div>
              <h3 className="text-xl font-semibold mb-2">For Students</h3>
              <p className="text-gray-600">Quick and easy attendance check-in</p>
            </div>

            <Link href="/lecturer/dashboard" className="block">
              <div className="bg-white rounded-lg shadow-md p-6 hover:scale-105 hover:shadow-xl transition">
                <div className="text-4xl mb-4">👨‍🏫</div>
                <h3 className="text-xl font-semibold mb-2">For Lecturers</h3>
                <p className="text-gray-600">Real-time monitoring and reports</p>
              </div>
            </Link>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-4xl mb-4">⚙️</div>
              <h3 className="text-xl font-semibold mb-2">For Admins</h3>
              <p className="text-gray-600">Complete system management</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Get Started</h2>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                href="/auth/login"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}