'use client';

import { useState } from 'react';
import { Save, User, Bell, Shield } from 'lucide-react';

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
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500">
          Manage your lecturer preferences and system settings.
        </p>
      </div>

      {/* Profile Section */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
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
      <div className="bg-white p-6 rounded-xl border shadow-sm">
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
      <div className="bg-white p-6 rounded-xl border shadow-sm">
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
        className="bg-red-600 text-white px-6 py-3 rounded-lg flex items-center gap-2"
      >
        <Save size={16} />
        Save Changes
      </button>
    </div>
  );
}