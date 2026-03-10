import Sidebar from "../components/sidebar"
import { studentMenu } from "../config/studentMenu"

export default function StudentLayout({ children }) {

return (
    <div className="flex">
      <Sidebar
        panelTitle={studentMenu.panelTitle}
        menu={studentMenu.sections}
      />

      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  )
}