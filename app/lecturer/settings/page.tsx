'use client';

import { useState } from 'react';
import { ChevronRight, Save, User, Bell, Shield } from 'lucide-react';

export default function LecturerSettingsPage() {
  const [form, setForm] = useState({
    name: 'Dr. Mary Lee',
    email: 'marylee@swinburne.edu.my',
    notifications: true,
    autoCloseSession: false,
  });

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    alert('Settings saved (frontend only)');
  };

  return (
    <div className="space-y-6 sm:space-y-8">

      <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <span className="hover:text-gray-600 cursor-default">Lecturer</span>
        <ChevronRight size={12} />
        <span className="text-red-600">Settings</span>
      </nav>

      <header className="space-y-1.5">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">
          Manage your lecturer preferences and system settings.
        </p>
      </header>

      {/* Profile Section */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} />
          <h2 className="font-semibold">Profile</h2>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
            placeholder="Full Name"
          />

          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
            placeholder="Email"
          />
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={18} />
          <h2 className="font-semibold">Notifications</h2>
        </div>

        <label className="flex items-center justify-between">
          <span>Email Notifications</span>
          <input
            type="checkbox"
            checked={form.notifications}
            onChange={(e) =>
              handleChange('notifications', e.target.checked)
            }
          />
        </label>
      </div>

      {/* Attendance Settings */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} />
          <h2 className="font-semibold">Attendance Settings</h2>
        </div>

        <label className="flex items-center justify-between">
          <span>Auto-close attendance session</span>
          <input
            type="checkbox"
            checked={form.autoCloseSession}
            onChange={(e) =>
              handleChange('autoCloseSession', e.target.checked)
            }
          />
        </label>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700"
      >
        <Save size={16} />
        Save Changes
      </button>
    </div>
  );
}