"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';

const SLEEPER_LEAGUE_ID = "1312122584644476928";

export default function SchedulePage() {
  const { users } = useAuth();
  const [matchupsData, setMatchupsData] = useState<Record<number, any[]>>({});
  const [rostersMap, setRostersMap] = useState<Record<number, any>>({});
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [nflPlayers, setNflPlayers] = useState<Record<string, any>>({});
  const [playerValues, setPlayerValues] = useState<Record<string, number>>({});
  
  const [viewMode, setViewMode] = useState<'weekly' | 'team'>('weekly');
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedTeamRosterId, setSelectedTeamRosterId] = useState<number>(1);
  
  // Detailed Matchup Modal State
  const [activeMatchupModal, setActiveMatchupModal] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadScheduleData() {
      try {
        const [usersRes, rostersRes, playersRes, ddRes] = await Promise.all([
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/users`),
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/rosters`),
          fetch('https://api.sleeper.app/v1/players/nfl'),
          fetch('https://www.dynastydealer.com/api/player-values').catch(() => null)
        ]);

        const usersData = await usersRes.json();
        const rostersData = await rostersRes.json();
        const playersData = await playersRes.json();
        const ddData = ddRes ? await ddRes.json() : null;

        const uMap: Record<string, any> = {};
        if (Array.isArray(usersData)) {
          usersData.forEach((u: any) => {
            const username = u.username || u.display_name?.toLowerCase();
            uMap[u.user_id] = {
              username,
              name: u.metadata?.team_name || u.display_name || `Team ${u.user_id.slice(-4)}`,
              avatar: u.avatar
            };
          });
        }
        setUsersMap(uMap);

        const rMap: Record<number, any> = {};
        const rosterToUser: Record<number, any> = {};
        if (Array.isArray(rostersData)) {
          rostersData.forEach((r: any) => {
            rMap[r.roster_id] = r;
            const owner = uMap[r.owner_id] || { name: `Team #${r.roster_id}`, username: `team_${r.roster_id}`, avatar: null };
            rosterToUser[r.roster_id] = { rosterId: r.roster_id, ...owner };
          });
        }
        setRostersMap(rosterToUser);

        const vals: Record<string, number> = {};
        if (ddData && ddData.players) {
          ddData.players.forEach((p: any) => {
            if (p.sleeper_id) vals[p.sleeper_id] = p.current_value;
          });
        }
        setPlayerValues(vals);
        setNflPlayers(playersData || {});

        // Fetch weeks 1 through 14 matchups
        const weekPromises = [];
        for (let w = 1; w <= 14; w++) {
          weekPromises.push(fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/matchups/${w}`).then(res => res.json()));
        }

        const weeksResults = await Promise.all(weekPromises);
        const parsedMatchups: Record<number, any[]> = {};

        weeksResults.forEach((weekArray, idx) => {
          const wNum = idx + 1;
          const matchPairs: Record<number, any> = {};

          if (Array.isArray(weekArray)) {
            weekArray.forEach((m: any) => {
              const mId = m.matchup_id;
              if (!mId) return;

              if (!matchPairs[mId]) {
                matchPairs[mId] = { matchupId: mId, team1: null, team2: null };
              }

              const teamOwner = rosterToUser[m.roster_id] || { rosterId: m.roster_id, name: `Team ${m.roster_id}`, username: `team_${m.roster_id}`, avatar: null };
              
              // Parse starters & players for position comparisons
              const starters = m.starters || [];
              const allPlayers = m.players || [];
              const bench = allPlayers.filter((pid: string) => !starters.includes(pid));

              const teamPayload = {
                ...teamOwner,
                points: m.points || 0,
                starters,
                bench,
                customPoints: m.custom_points
              };

              if (!matchPairs[mId].team1) {
                matchPairs[mId].team1 = teamPayload;
              } else {
                matchPairs[mId].team2 = teamPayload;
              }
            });
          }
          parsedMatchups[wNum] = Object.values(matchPairs);
        });

        setMatchupsData(parsedMatchups);
        if (Object.keys(rosterToUser).length > 0) {
          setSelectedTeamRosterId(Number(Object.keys(rosterToUser)[0]));
        }
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load schedule data", err);
        setIsLoading(false);
      }
    }

    loadScheduleData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  // Helper to build enriched player objects for a matchup roster
  const enrichPlayers = (playerIds: string[]) => {
    return playerIds.map(pid => {
      const pInfo = nflPlayers[pid];
      if (!pInfo) return null;
      return {
        id: pid,
        name: `${pInfo.first_name || ''} ${pInfo.last_name || ''}`.trim(),
        pos: pInfo.position || 'FLEX',
        team: pInfo.team || 'FA',
        value: playerValues[pid] || 1500,
        photoUrl: `https://sleepercdn.com/content/nfl/players/${pid}.jpg`
      };
    }).filter(Boolean);
  };

  // Helper to calculate positional advantage in a matchup
  const calculatePositionBreakdown = (team1Starters: any[], team2Starters: any[]) => {
    const positions = ['QB', 'RB', 'WR', 'TE'];
    const breakdown = positions.map(pos => {
      const t1PosPlayers = team1Starters.filter(p => p?.pos === pos);
      const t2PosPlayers = team2Starters.filter(p => p?.pos === pos);

      const t1Val = t1PosPlayers.reduce((sum, p) => sum + (p?.value || 0), 0);
      const t2Val = t2PosPlayers.reduce((sum, p) => sum + (p?.value || 0), 0);

      let advantage = 'Even ⚖️';
      if (t1Val > t2Val + 500) advantage = 'Team 1 Advantage 🔥';
      else if (t2Val > t1Val + 500) advantage = 'Team 2 Advantage 🔥';

      return { pos, t1Players: t1PosPlayers, t2Players: t2PosPlayers, t1Val, t2Val, advantage };
    });
    return breakdown;
  };

  // Get all matchups for a specific team across the season (Weeks 1-14)
  const getTeamSeasonSchedule = (rosterId: number) => {
    const schedule = [];
    for (let w = 1; w <= 14; w++) {
      const weekMatchups = matchupsData[w] || [];
      const match = weekMatchups.find(m => m.team1?.rosterId === rosterId || m.team2?.rosterId === rosterId);
      if (match) {
        const isTeam1 = match.team1?.rosterId === rosterId;
        const teamData = isTeam1 ? match.team1 : match.team2;
        const oppData = isTeam1 ? match.team2 : match.team1;
        
        let result = 'UPCOMING';
        if (teamData?.points > 0 || oppData?.points > 0) {
          if (teamData.points > oppData.points) result = 'WIN';
          else if (teamData.points < oppData.points) result = 'LOSS';
          else result = 'TIE';
        }

        schedule.push({
          week: w,
          matchupId: match.matchupId,
          team: teamData,
          opponent: oppData,
          result
        });
      }
    }
    return schedule;
  };

  const selectedTeamSchedule = getTeamSeasonSchedule(selectedTeamRosterId);
  const currentWeekMatchups = matchupsData[selectedWeek] || [];

  return (
    <div className="space-y-8 pb-10">
      
      {/* MATCHUP DETAIL MODAL */}
      {activeMatchupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-4xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-4">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-indigo-600 dark:text-indigo-400">Week {activeMatchupModal.week} Matchup Breakdown</span>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  {activeMatchupModal.team1.name} vs. {activeMatchupModal.team2.name}
                </h3>
              </div>
              <button
                onClick={() => setActiveMatchupModal(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                ✕
              </button>
            </div>

            {/* SCORE SUMMARY BANNER */}
            <div className="grid grid-cols-2 gap-4 bg-gradient-to-r from-gray-50 to-indigo-50/40 dark:from-gray-800/60 dark:to-indigo-950/40 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/60 text-center">
              <div>
                <span className="text-xs font-bold text-gray-500">{activeMatchupModal.team1.name}</span>
                <p className="font-mono text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {activeMatchupModal.team1.points.toFixed(2)}
                </p>
              </div>
              <div className="border-l border-gray-200 dark:border-gray-700">
                <span className="text-xs font-bold text-gray-500">{activeMatchupModal.team2.name}</span>
                <p className="font-mono text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {activeMatchupModal.team2.points.toFixed(2)}
                </p>
              </div>
            </div>

            {/* POSITION BREAKDOWN COMPARISON */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-extrabold text-gray-400 tracking-wider">Positional Matchup Advantages</h4>
              <div className="space-y-3">
                {calculatePositionBreakdown(
                  enrichPlayers(activeMatchupModal.team1.starters),
                  enrichPlayers(activeMatchupModal.team2.starters)
                ).map((posGroup, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="w-full sm:w-1/3">
                      <span className="text-[10px] uppercase font-bold text-indigo-500 block">Team 1 ({posGroup.pos})</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {posGroup.t1Players.length === 0 ? <span className="text-xs text-gray-400">None</span> : posGroup.t1Players.map((p: any, i: number) => (
                          <span key={i} className="text-xs font-semibold bg-white dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                            {p.name} ({p.value})
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-center shrink-0">
                      <span className="text-xs font-black uppercase px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {posGroup.pos}: {posGroup.advantage}
                      </span>
                    </div>

                    <div className="w-full sm:w-1/3 text-right sm:text-left">
                      <span className="text-[10px] uppercase font-bold text-amber-500 block">Team 2 ({posGroup.pos})</span>
                      <div className="flex flex-wrap gap-1 mt-1 justify-start sm:justify-end">
                        {posGroup.t2Players.length === 0 ? <span className="text-xs text-gray-400">None</span> : posGroup.t2Players.map((p: any, i: number) => (
                          <span key={i} className="text-xs font-semibold bg-white dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                            {p.name} ({p.value})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BENCH PLAYERS SECTION */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-800">
              <div>
                <span className="text-xs font-bold text-gray-500 block mb-2">{activeMatchupModal.team1.name} Bench</span>
                <div className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-200 dark:border-gray-800 space-y-1 max-h-40 overflow-y-auto">
                  {enrichPlayers(activeMatchupModal.team1.bench).map((p: any, i: number) => (
                    <div key={i} className="text-xs flex justify-between">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{p.name} ({p.pos} - {p.team})</span>
                      <span className="font-mono text-gray-400">{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-gray-500 block mb-2">{activeMatchupModal.team2.name} Bench</span>
                <div className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-200 dark:border-gray-800 space-y-1 max-h-40 overflow-y-auto">
                  {enrichPlayers(activeMatchupModal.team2.bench).map((p: any, i: number) => (
                    <div key={i} className="text-xs flex justify-between">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{p.name} ({p.pos} - {p.team})</span>
                      <span className="font-mono text-gray-400">{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* HEADER & VIEW TOGGLES */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">League Schedule 📅</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Browse weekly league matchups or inspect specific team calendars.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'weekly' 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            Weekly Grid View
          </button>
          <button
            onClick={() => setViewMode('team')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'team' 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            Team Schedule View
          </button>
        </div>
      </div>

      {/* WEEKLY GRID VIEW */}
      {viewMode === 'weekly' && (
        <div className="space-y-6">
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {[...Array(14)].map((_, i) => {
              const wNum = i + 1;
              return (
                <button
                  key={wNum}
                  onClick={() => setSelectedWeek(wNum)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    selectedWeek === wNum
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  Week {wNum}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentWeekMatchups.map((match, idx) => {
              const t1 = match.team1;
              const t2 = match.team2;
              const t1Winner = t1 && t2 && t1.points > t2.points;
              const t2Winner = t1 && t2 && t2.points > t1.points;

              return (
                <div 
                  key={idx} 
                  onClick={() => setActiveMatchupModal({ week: selectedWeek, ...match })}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm space-y-3 cursor-pointer hover:border-indigo-500 transition-all"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">
                      Matchup #{match.matchupId}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                      View Matchup Details 🔍
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* Team 1 */}
                    <div className={`flex items-center justify-between p-2.5 rounded-lg border ${
                      t1Winner ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 font-bold' : 'bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800'
                    }`}>
                      <div className="flex items-center gap-2.5 truncate pr-2">
                        <img 
                          src={t1?.avatar ? `https://sleepercdn.com/avatars/thumbs/${t1.avatar}` : 'https://sleepercdn.com/images/v2/icons/player_default.webp'} 
                          className="w-6 h-6 rounded-full bg-gray-200 shrink-0" 
                          alt={t1?.name}
                        />
                        <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{t1?.name || 'BYE'}</span>
                      </div>
                      <span className="font-mono text-sm font-black text-gray-900 dark:text-white shrink-0">
                        {t1?.points ? t1.points.toFixed(2) : '0.00'}
                      </span>
                    </div>

                    {/* Team 2 */}
                    <div className={`flex items-center justify-between p-2.5 rounded-lg border ${
                      t2Winner ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 font-bold' : 'bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800'
                    }`}>
                      <div className="flex items-center gap-2.5 truncate pr-2">
                        <img 
                          src={t2?.avatar ? `https://sleepercdn.com/avatars/thumbs/${t2.avatar}` : 'https://sleepercdn.com/images/v2/icons/player_default.webp'} 
                          className="w-6 h-6 rounded-full bg-gray-200 shrink-0" 
                          alt={t2?.name}
                        />
                        <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{t2?.name || 'BYE'}</span>
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
        </div>
      )}

      {/* TEAM SCHEDULE VIEW */}
      {viewMode === 'team' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase text-gray-400">Select Team:</label>
            <select
              value={selectedTeamRosterId}
              onChange={(e) => setSelectedTeamRosterId(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold text-gray-900 dark:text-white"
            >
              {Object.values(rostersMap).map((team: any) => (
                <option key={team.rosterId} value={team.rosterId}>
                  {team.name} ({team.username})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedTeamSchedule.map((item) => (
              <div 
                key={item.week}
                onClick={() => setActiveMatchupModal({ week: item.week, matchupId: item.matchupId, team1: item.team, team2: item.opponent })}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm space-y-3 cursor-pointer hover:border-indigo-500 transition-all"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">Week {item.week}</span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded ${
                    item.result === 'WIN' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                    item.result === 'LOSS' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {item.result}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-semibold">
                  <div className="flex justify-between">
                    <span className="text-gray-900 dark:text-white font-bold">{item.team?.name}</span>
                    <span className="font-mono">{item.team?.points.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>vs. {item.opponent?.name || 'BYE'}</span>
                    <span className="font-mono">{item.opponent?.points.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}