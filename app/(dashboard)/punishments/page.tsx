"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface PunishmentRecord {
  id: string;
  manager: string;
  infraction: string;
  punishment: string;
  status: 'Active' | 'Pending' | 'Completed';
}

const ADMIN_TEAM = "Hampton Inn";

export default function PunishmentsPage() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser === ADMIN_TEAM;

  const [punishmentsList, setPunishmentsList] = useState<PunishmentRecord[]>([
    {
      id: '1',
      manager: 'Open Slot / TBD',
      infraction: 'Last Place Finish',
      punishment: 'The Last-Place Toilet Bowl Trophy & Draft Penalty',
      status: 'Active',
    },
    {
      id: '2',
      manager: 'League Member',
      infraction: 'Most WEEKS with Lowest Weekly Score',
      punishment: '24-hour Waffle House challenge (subtract 1 hour per win)',
      status: 'Pending',
    },
  ]);

  const [newManager, setNewManager] = useState('');
  const [newInfraction, setNewInfraction] = useState('');
  const [newPunishment, setNewPunishment] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('league_punishments_data');
    if (saved) {
      try {
        setPunishmentsList(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load punishments state", e);
      }
    }
  }, []);

  const saveToStorage = (updated: PunishmentRecord[]) => {
    setPunishmentsList(updated);
    localStorage.setItem('league_punishments_data', JSON.stringify(updated));
  };

  const handleAddPunishment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newManager || !newInfraction || !newPunishment) return;

    const newItem: PunishmentRecord = {
      id: Date.now().toString(),
      manager: newManager,
      infraction: newInfraction,
      punishment: newPunishment,
      status: 'Active',
    };

    saveToStorage([newItem, ...punishmentsList]);
    setNewManager('');
    setNewInfraction('');
    setNewPunishment('');
  };

  const toggleStatus = (id: string) => {
    if (!isAdmin) return;
    const updated = punishmentsList.map(item => {
      if (item.id === id) {
        const nextStatus = item.status === 'Active' ? 'Completed' : 'Active';
        return { ...item, status: nextStatus as any };
      }
      return item;
    });
    saveToStorage(updated);
  };

  const deletePunishment = (id: string) => {
    if (!isAdmin) return;
    const updated = punishmentsList.filter(item => item.id !== id);
    saveToStorage(updated);
  };

  return (
    <div className="space-y-8 pb-10">
      
      {/* HEADER CARD */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm flex flex-col justify-between space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">League Punishments & Wall of Shame 🏛️</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs font-medium">
            Tracking accountability and penalties for The Ultimate Dynasty bottom-dwellers.
          </p>
        </div>
      </div>

      {/* ADMIN ADD FORM */}
      {isAdmin && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>🛡️ Admin: Add New Punishment</span>
          </h2>
          <form onSubmit={handleAddPunishment} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Team / Manager Name"
              value={newManager}
              onChange={(e) => setNewManager(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
            />
            <input
              type="text"
              placeholder="Infraction (e.g., Last Place)"
              value={newInfraction}
              onChange={(e) => setNewInfraction(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
            />
            <input
              type="text"
              placeholder="Punishment Description"
              value={newPunishment}
              onChange={(e) => setNewPunishment(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
            />
            <div className="md:col-span-3 flex justify-end">
              <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors">
                Add to Wall of Shame
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PUNISHMENTS TABLE */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Active Punishments Tracker</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="pb-2.5 font-bold">Manager / Team</th>
                <th className="pb-2.5 font-bold">Infraction</th>
                <th className="pb-2.5 font-bold">Punishment Details</th>
                <th className="pb-2.5 font-bold text-center">Status</th>
                {isAdmin && <th className="pb-2.5 font-bold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
              {punishmentsList.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="py-3 font-bold text-gray-900 dark:text-white">
                    {item.manager}
                  </td>
                  <td className="py-3 text-gray-600 dark:text-gray-300">
                    {item.infraction}
                  </td>
                  <td className="py-3 text-indigo-600 dark:text-indigo-400 font-semibold">
                    {item.punishment}
                  </td>
                  <td className="py-3 text-center">
                    <span 
                      onClick={() => toggleStatus(item.id)}
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer ${
                        item.status === 'Completed' 
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {item.status.toUpperCase()} {isAdmin ? '🔄' : ''}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-3 text-right">
                      <button 
                        onClick={() => deletePunishment(item.id)}
                        className="text-red-500 hover:text-red-700 font-bold px-2 py-1"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {punishmentsList.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">
                    No punishments listed. Everyone is safe... for now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}