"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';

const SLEEPER_LEAGUE_ID = "1312122584644476928";

export default function SchedulePage() {
  const [matchups, setMatchups] = useState<Record<string, any[]>>({});
  const [usersMap, setUsersMap] = useState<Record<string, { name: string; username: string; avatar: string }>>({});
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSchedule() {
      try {
        const [usersRes, rostersRes] = await Promise.all([
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/users`),
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/rosters`)
        ]);

        const usersData = await usersRes.json();
        const rostersData = await rostersRes.json();

        const uMap: Record<string, { name: string; username: string; avatar: string }> = {};
        const rosterToUserMap: Record<number, { name: string; username: string; avatar: string }> = {};

        if (Array.isArray(usersData)) {
          usersData.forEach((u: any) => {
            const username = u.username || u.display_name?.toLowerCase();
            const name = u.metadata?.team_name || u.display_name || `Team ${u.user_id.slice(-4)}`;
            uMap[u.user_id] = { name, username, avatar: u.avatar };
          });
        }

        if (Array.isArray(rostersData)) {
          rostersData.forEach((r: any) => {
            const owner = uMap[r.owner_id] || { name: `Team #${r.roster_id}`, username: `team_${r.roster_id}`, avatar: null };
            rosterToUserMap[r.roster_id] = owner;
          });
        }

        setUsersMap(uMap);

        // Fetch matchups for weeks 1 through 14 (standard regular season)
        const weekPromises = [];
        for (let w = 1; w <= 14; w++) {
          weekPromises.push(fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/matchups/${w}`).then(res => res.json()));
        }

        const weeksData = await Promise.all(weekPromises);
        const scheduleMap: Record<string, any[]> = {};

        weeksData.forEach((weekMatchups, index) => {
          const weekNum = index + 1;
          const matchPairs: Record<number, any> = {};

          if (Array.isArray(weekMatchups)) {
            weekMatchups.forEach((m: any) => {
              const mId = m.matchup_id;
              if (!mId) return;

              if (!matchPairs[mId]) {
                matchPairs[mId] = { matchupId: mId, team1: null, team2: null };
              }

              const teamOwner = rosterToUserMap[m.roster_id] || { name: `Team ${m.roster_id}`, username: `team_${m.roster_id}`, avatar: null };
              const teamInfo = {
                rosterId: m.roster_id,
                name: teamOwner.name,
                username: teamOwner.username,
                avatar: teamOwner.avatar,
                points: m.points || 0,
              };

              if (!matchPairs[mId].team1) {
                matchPairs[mId].team1 = teamInfo;
              } else {
                matchPairs[mId].team2 = teamInfo;
              }
            });
          }

          scheduleMap[weekNum] = Object.values(matchPairs);
        });

        setMatchups(scheduleMap);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load schedule", err);
        setIsLoading(false);
      }
    }

    fetchSchedule();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  const currentWeekMatchups = matchups[selectedWeek] || [];

  return (
    <div className="space-y-8 pb-10">
      
      {/* HEADER */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">League Schedule 📅</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Official regular season matchups week-by-week.
          </p>
        </div>

        {/* WEEK SELECTOR TABS */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-2">
          {[...Array(14)].map((_, i) => {
            const wNum = i + 1;
            return (
              <button
                key={wNum}
                onClick={() => setSelectedWeek(wNum)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  selectedWeek === wNum
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Wk {wNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* WEEK MATCHUPS GRID */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Week {selectedWeek} Matchups
        </h2>

        {currentWeekMatchups.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-10 border border-gray-200 dark:border-gray-800 text-center text-gray-400 text-xs">
            No matchups scheduled for Week {selectedWeek}.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentWeekMatchups.map((match, idx) => {
              const t1 = match.team1;
              const t2 = match.team2;

              const t1Winner = t1 && t2 && t1.points > t2.points;
              const t2Winner = t1 && t2 && t2.points > t1.points;

              return (
                <div key={idx} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm space-y-3">
                  <div className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">
                    Matchup #{match.matchupId}
                  </div>

                  <div className="space-y-2">
                    {/* Team 1 */}
                    <div className={`flex items-center justify-between p-2.5 rounded-lg border ${
                      t1Winner 
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 font-bold' 
                        : 'bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800'
                    }`}>
                      <div className="flex items-center gap-2.5 truncate pr-2">
                        <img 
                          src={t1?.avatar ? `https://sleepercdn.com/avatars/thumbs/${t1.avatar}` : 'https://sleepercdn.com/images/v2/icons/player_default.webp'} 
                          className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" 
                          alt={t1?.name}
                        />
                        <div className="truncate">
                          <span className="text-xs font-bold text-gray-900 dark:text-white truncate block">{t1?.name || 'BYE'}</span>
                          <span className="text-[10px] text-gray-400 truncate block">({t1?.username})</span>
                        </div>
                      </div>
                      <span className="font-mono text-sm font-black text-gray-900 dark:text-white shrink-0">
                        {t1?.points ? t1.points.toFixed(2) : '0.00'}
                      </span>
                    </div>

                    {/* Team 2 */}
                    <div className={`flex items-center justify-between p-2.5 rounded-lg border ${
                      t2Winner 
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 font-bold' 
                        : 'bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800'
                    }`}>
                      <div className="flex items-center gap-2.5 truncate pr-2">
                        <img 
                          src={t2?.avatar ? `https://sleepercdn.com/avatars/thumbs/${t2.avatar}` : 'https://sleepercdn.com/images/v2/icons/player_default.webp'} 
                          className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" 
                          alt={t2?.name}
                        />
                        <div className="truncate">
                          <span className="text-xs font-bold text-gray-900 dark:text-white truncate block">{t2?.name || 'BYE'}</span>
                          <span className="text-[10px] text-gray-400 truncate block">({t2?.username})</span>
                        </div>
                      </div>
                      <span className="font-mono text-sm font-black text-gray-900 dark:text-white shrink-0">
                        {t2?.points ? t2.points.toFixed(2) : '0.00'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}