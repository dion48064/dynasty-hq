"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';

const COMMISSIONER_USER = "dionvanboekel";

interface Punishment {
  id: string;
  manager: string;
  title: string;
  description: string;
  status: 'PENDING' | 'COMPLETED';
}

export default function PunishmentsPage() {
  const { users, currentUser } = useAuth();
  const [punishments, setPunishments] = useState<Punishment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State for Commissioner
  const [managerInput, setManagerInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const isAdmin = currentUser === COMMISSIONER_USER;

  useEffect(() => {
    async function fetchPunishments() {
      try {
        const res = await fetch('/api/league-data');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.punishments)) {
            setPunishments(data.punishments);
          }
        }
      } catch (err) {
        console.error("Failed to load punishments", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPunishments();
  }, []);

  const saveToCloud = async (updated: Punishment[]) => {
    try {
      const getRes = await fetch('/api/league-data');
      const currentDb = getRes.ok ? await getRes.json() : {};

      const payload = {
        ...currentDb,
        punishments: updated
      };

      const res = await fetch('/api/league-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        alert("Failed to save changes to cloud database.");
      }
    } catch (err) {
      console.error("Cloud save error", err);
    }
  };

  const handleAddPunishment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerInput || !titleInput.trim() || !descInput.trim()) return;

    const newPunishment: Punishment = {
      id: `p_${Date.now()}`,
      manager: managerInput,
      title: titleInput.trim(),
      description: descInput.trim(),
      status: 'PENDING'
    };

    const updated = [newPunishment, ...punishments];
    setPunishments(updated);
    await saveToCloud(updated);

    setManagerInput('');
    setTitleInput('');
    setDescInput('');
    setIsAdding(false);
  };

  const toggleStatus = async (id: string) => {
    if (!isAdmin) return;
    const updated = punishments.map(p => {
      if (p.id === id) {
        return { ...p, status: p.status === 'PENDING' ? 'COMPLETED' as const : 'PENDING' as const };
      }
      return p;
    });
    setPunishments(updated);
    await saveToCloud(updated);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    const updated = punishments.filter(p => p.id !== id);
    setPunishments(updated);
    await saveToCloud(updated);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      
      {/* HEADER */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">2026 League Punishments 🚷</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Tracking last-place penalties and off-season punishments for the 2026 season.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
          >
            {isAdding ? 'Cancel' : '+ Add Punishment'}
          </button>
        )}
      </div>

      {/* ADMIN ADD FORM */}
      {isAdmin && isAdding && (
        <form onSubmit={handleAddPunishment} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">Assign New Punishment</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Target Manager *</label>
              <select
                value={managerInput}
                onChange={(e) => setManagerInput(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
              >
                <option value="">-- Select Manager --</option>
                {users?.map((u: any, idx: number) => (
                  <option key={idx} value={u.username}>{u.username} ({u.teamName})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Punishment Title *</label>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="e.g. Waffle House Challenge"
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-400">Rules & Description *</label>
            <textarea
              rows={3}
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              placeholder="Explain the rules, deadlines, and requirements..."
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Post Punishment ✓
            </button>
          </div>
        </form>
      )}

      {/* PUNISHMENTS LIST */}
      {punishments.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center text-gray-400 text-xs font-medium">
          No punishments assigned for 2026 yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {punishments.map((p) => (
            <div key={p.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md">
                    Target: {p.manager}
                  </span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                    p.status === 'COMPLETED' 
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' 
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  }`}>
                    {p.status}
                  </span>
                </div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">{p.title}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                  {p.description}
                </p>
              </div>

              {isAdmin && (
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => toggleStatus(p.id)}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Mark as {p.status === 'PENDING' ? 'Completed ✓' : 'Pending'}
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-xs font-bold text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}