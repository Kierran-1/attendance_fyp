import Sidebar from "../components/sidebar"
import { adminMenu } from "../config/adminMenu"

export default function AdminLayout({ children }) {
  return (
    <div className="flex">
      <Sidebar menu={adminMenu} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}