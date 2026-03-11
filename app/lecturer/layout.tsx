import Sidebar from "../components/sidebar"
import TopNavbar from "../components/navbar"
import { lecturerMenu } from "../config/lecturerMenu"

export default function LecturerLayout({ children }) {
  return (
    <div>

      {/* Sidebar */}
      <Sidebar
        panelTitle={lecturerMenu.panelTitle}
        menu={lecturerMenu.sections}
      />

      {/* Right Side */}
      <div className="lg:ml-0 flex flex-col min-h-screen bg-[#F8F8F8]">

        {/* Top Navbar */}
        <TopNavbar />

        {/* Page Content */}
        <main className="p-6 flex-1">
          {children}
        </main>

      </div>

    </div>
  )
}