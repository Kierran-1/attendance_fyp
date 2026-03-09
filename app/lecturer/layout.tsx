import Sidebar from "../components/sidebar"
import { lecturerMenu } from "../config/lecturerMenu"

export default function LecturerLayout({ children }) {
  return (
    <div className="flex">
      <Sidebar menu={lecturerMenu} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}