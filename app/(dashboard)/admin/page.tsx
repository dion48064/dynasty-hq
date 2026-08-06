"use client";

import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';

const COMMISSIONER_USER = "dionvanboekel";

export default function AdminHubPage() {
  const { users, currentUser, passwords, commissionerResetPassword } = useAuth();
  const [resetUsername, setResetUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (currentUser !== COMMISSIONER_USER) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Access Denied 🚫</h1>
        <p className="text-sm text-gray-500">Only the Commissioner ({COMMISSIONER_USER}) can access the Admin Hub.</p>
      </div>
    );
  }

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUsername || !newPassword) return;

    commissionerResetPassword(resetUsername, newPassword);
    setSuccessMsg(`Successfully updated password for ${resetUsername}!`);
    setNewPassword('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Commissioner Admin Hub 🛡️</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
          Manage manager accounts, view passwords, and reset credentials for league users.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PASSWORD RESET FORM */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 h-fit">
          <h2 className="text-base font-bold text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-gray-800">
            Reset Manager Password
          </h2>

          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-gray-400 block">Select Manager</label>
              <select
                value={resetUsername}
                onChange={(e) => setResetUsername(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
              >
                <option value="">-- Choose Manager --</option>
                {users.map((u: any, idx: number) => (
                  <option key={idx} value={u.username}>{u.username} ({u.teamName})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-gray-400 block">New Password</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
              />
            </div>

            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl text-center">
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Update Password ✓
            </button>
          </form>
        </div>

        {/* TEAM CREDENTIALS DIRECTORY */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-gray-800">
            Registered League Accounts ({users.length})
          </h2>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {users.map((u: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <div>
                  <span className="font-bold text-xs text-gray-900 dark:text-white block">{u.username}</span>
                  <span className="text-[10px] text-gray-400">{u.teamName}</span>
                </div>
                <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-1 rounded">
                  {passwords[u.username] || 'password123'}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}