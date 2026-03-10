import Sidebar from '@/app/components/sidebar';
import { studentMenu } from '@/app/config/studentMenu';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar panelTitle="Student Panel" menu={studentMenu} />
      <main className="flex-1 lg:ml-64 p-6">{children}</main>
    </div>
  );
}
