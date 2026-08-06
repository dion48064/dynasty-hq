"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';

const COMMISSIONER_USER = "dionvanboekel";

interface PunishmentAssignment {
  assignedUser: string;
  status: 'PENDING' | 'COMPLETED';
}

const DEFAULT_PUNISHMENTS = [
  { place: 1, title: "Champion", reward: "Cash prize of $450, championship trophy for a year, and gets to name the league for the next season" },
  { place: 2, title: "Runner-Up", reward: "Cash prize of $100, and rename the 9th place team for the next season" },
  { place: 3, title: "Third Place", reward: "Cash prize of $50, choose a charity for 8th place to donate $20 to" },
  { place: 4, title: "Fourth Place", reward: "Has to create a graphic for next year's power rankings, of which they decide on" },
  { place: 5, title: "Fifth Place", reward: "Create a meme tier list ranking every owner using a meme to describe their team" },
  { place: 6, title: "Sixth Place", reward: "Must set their profile picture in Sleeper to a photo of a participation trophy for the entire next year" },
  { place: 7, title: "Seventh Place", reward: "Must change their team name to ‘Emperor of Mediocrity’ for the next season" },
  { place: 8, title: "Eighth Place", reward: "Before week 1, predict all 8 playoff teams, the league champion, and the last-placed finisher. At season’s end, record a 30-second video for each incorrect prediction explaining why you were wrong and giving credit to the team that proved you right." },
  { place: 9, title: "Ninth Place", reward: "Let the second place team rename your team for the next season" },
  { place: 10, title: "Tenth Place", reward: "Record a 2 minute video explaining why your season failed and send it to the league" },
  { place: 11, title: "Eleventh Place", reward: "Buys a cameo from a random D-list celebrity congratulating the champion" },
  { place: 12, title: "Twelfth Place (Last)", reward: "Run a charity 5k, post your race time and photo from the finish, OR record a 5 minute last place press conference where they have to explain why their season went wrong, and answer all questions submitted by leaguemates" },
];

export default function PunishmentsPage() {
  const { users, currentUser } = useAuth();
  const [assignments, setAssignments] = useState<Record<number, PunishmentAssignment>>({});
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = currentUser === COMMISSIONER_USER;

  useEffect(() => {
    async function fetchPunishments() {
      try {
        const res = await fetch('/api/league-data');
        if (res.ok) {
          const data = await res.json();
          if (data && data.punishmentAssignments) {
            setAssignments(data.punishmentAssignments);
          }
        }
      } catch (err) {
        console.error("Failed to load punishment assignments", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPunishments();
  }, []);

  const saveToCloud = async (updatedAssignments: Record<number, PunishmentAssignment>) => {
    try {
      const getRes = await fetch('/api/league-data');
      const currentDb = getRes.ok ? await getRes.json() : {};

      const payload = {
        ...currentDb,
        punishmentAssignments: updatedAssignments
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

  const handleAssignUser = async (place: number, username: string) => {
    if (!isAdmin) return;
    const currentEntry = assignments[place] || { assignedUser: '', status: 'PENDING' };
    const updated: Record<number, PunishmentAssignment> = {
      ...assignments,
      [place]: { ...currentEntry, assignedUser: username }
    };
    setAssignments(updated);
    await saveToCloud(updated);
  };

  const toggleStatus = async (place: number) => {
    if (!isAdmin) return;
    const currentEntry = assignments[place] || { assignedUser: '', status: 'PENDING' };
    const newStatus = currentEntry.status === 'PENDING' ? 'COMPLETED' : 'PENDING';
    const updated: Record<number, PunishmentAssignment> = {
      ...assignments,
      [place]: { ...currentEntry, status: newStatus }
    };
    setAssignments(updated);
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">2026 Season Payouts & Punishments 🏆</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Final standings breakdown, rewards, and off-season penalties based on 2026 finish order.
          </p>
        </div>
      </div>

      {/* LIST OF PLACEMENTS & PUNISHMENTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {DEFAULT_PUNISHMENTS.map((item) => {
          const entry = assignments[item.place] || { assignedUser: '', status: 'PENDING' };
          const isFinished = entry.status === 'COMPLETED';

          return (
            <div 
              key={item.place} 
              className={`rounded-xl border p-5 shadow-sm flex flex-col justify-between space-y-4 transition-all ${
                item.place === 1 
                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80' 
                  : item.place >= 10 
                  ? 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/60'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-md ${
                    item.place === 1 ? 'bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200' :
                    item.place <= 3 ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' :
                    item.place >= 10 ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' :
                    'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}>
                    {item.place === 1 ? '1st Place (Champion)' : 
                     item.place === 2 ? '2nd Place' : 
                     item.place === 3 ? '3rd Place' : 
                     `${item.place}th Place`}
                  </span>

                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                    isFinished 
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}>
                    {isFinished ? 'Completed ✓' : 'Pending'}
                  </span>
                </div>

                <h3 className="text-base font-black text-gray-900 dark:text-white">{item.title}</h3>
                
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
                  {item.reward}
                </p>
              </div>

              {/* ASSIGNMENT & ADMIN CONTROLS */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Owner:</span>
                  {isAdmin ? (
                    <select
                      value={entry.assignedUser || ''}
                      onChange={(e) => handleAssignUser(item.place, e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white flex-1"
                    >
                      <option value="">-- Unassigned --</option>
                      {Array.isArray(users) && users.map((u: any, idx: number) => (
                        <option key={idx} value={u.username}>{u.username} ({u.teamName})</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {entry.assignedUser || 'Unassigned'}
                    </span>
                  )}
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => toggleStatus(item.place)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                      isFinished 
                        ? 'bg-emerald-600 text-white border-emerald-600' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {isFinished ? 'Done ✓' : 'Mark Done'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}