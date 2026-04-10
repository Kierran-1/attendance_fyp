import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  UserCircle2,
  QrCode,
  Bell,
  FileText,
} from 'lucide-react';

type MenuItem = {
  name: string;
  href: string;
  icon: ReactNode;
};

type MenuSection = {
  heading: string;
  items: MenuItem[];
};

export const studentMenu: {
  panelTitle: string;
  sections: MenuSection[];
} = {
  panelTitle: 'Student Panel',
  sections: [
    {
      heading: 'Main',
      items: [
        {
          name: 'Dashboard',
          href: '/student/dashboard',
          icon: <LayoutDashboard size={20} strokeWidth={2.2} className="text-[#E4002B]" />,
        },
        {
          name: 'Classes',
          href: '/student/classes',
          icon: <BookOpen size={20} strokeWidth={2.2} className="text-[#E4002B]" />,
        },
        {
          name: 'Attendance',
          href: '/student/attendance',
          icon: <ClipboardCheck size={20} strokeWidth={2.2} className="text-[#E4002B]" />,
        },
        {
          name: 'Profile',
          href: '/student/profile',
          icon: <UserCircle2 size={20} strokeWidth={2.2} className="text-[#E4002B]" />,
        },
      ],
    },
    {
      heading: 'Tools',
      items: [
        {
          name: 'QR Code',
          href: '/student/qrcode',
          icon: <QrCode size={20} strokeWidth={2.2} className="text-[#E4002B]" />,
        },
        {
          name: 'Alerts',
          href: '/student/alerts',
          icon: <Bell size={20} strokeWidth={2.2} className="text-[#E4002B]" />,
        },
        {
          name: 'Absence Docs',
          href: '/student/absences',
          icon: <FileText size={20} strokeWidth={2.2} className="text-[#E4002B]" />,
        },
      ],
    },
  ],
};