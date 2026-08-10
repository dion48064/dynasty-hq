"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';

const SLEEPER_LEAGUE_ID = "1312122584644476928";

export default function SchedulePage() {
  const { users } = useAuth();
  const [matchupsData, setMatchupsData] = useState<Record<number, any[]>>({});
  const [rostersMap, setRostersMap] = useState<Record<number, any>>({});
  const [teamFullRosters, setTeamFullRosters] = useState<Record<number, any[]>>({});
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [playerProjections, setPlayerProjections] = useState<Record<number, Record<string, number>>>({});
  
  const [viewMode, setViewMode] = useState<'weekly' | 'team'>('weekly');
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedTeamRosterId, setSelectedTeamRosterId] = useState<number>(1);
  
  // Detailed Matchup Modal State
  const [activeMatchupModal, setActiveMatchupModal] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadScheduleData() {
      try {
        const [usersRes, rostersRes, playersRes] = await Promise.all([
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/users`),
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/rosters`),
          fetch('https://api.sleeper.app/v1/players/nfl')
        ]);

        const usersData = await usersRes.json();
        const rostersData = await rostersRes.json();
        const playersData = await playersRes.json();

        // Fetch official Sleeper weekly projections for weeks 1 through 14
        const projPromises = [];
        for (let w = 1; w <= 14; w++) {
          projPromises.push(
            fetch(`https://api.sleeper.app/v1/projections/nfl/regular/2026/${w}`)
              .then(res => res.json())
              .catch(() => null)
          );
        }

        const projResults = await Promise.all(projPromises);
        const pMap: Record<number, Record<string, number>> = {};
        
        projResults.forEach((weekProjData, idx) => {
          const wNum = idx + 1;
          pMap[wNum] = {};
          if (weekProjData && typeof weekProjData === 'object') {
            Object.entries(weekProjData).forEach(([pid, data]: [string, any]) => {
              const stats = data.stats || data;
              const ppr = stats.pts_ppr !== undefined ? stats.pts_ppr : (stats.pts_half_ppr || stats.pts_std || 0);
              pMap[wNum][pid] = Number(ppr);
            });
          }
        });
        setPlayerProjections(pMap);

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
        const fullRosters: Record<number, any[]> = {};

        if (Array.isArray(rostersData)) {
          rostersData.forEach((r: any) => {
            rMap[r.roster_id] = r;
            const owner = uMap[r.owner_id] || { name: `Team #${r.roster_id}`, username: `team_${r.roster_id}`, avatar: null };
            rosterToUser[r.roster_id] = { 
              rosterId: r.roster_id, 
              ...owner, 
              settings: r.settings
            };

            const rosterPlayerObjs = (r.players || []).map((pid: string) => {
              const pInfo = playersData[pid];
              if (!pInfo || !['QB', 'RB', 'WR', 'TE', 'K'].includes(pInfo.position)) return null;
              const nflTeam = pInfo.team || 'FA';

              return {
                id: pid,
                name: `${pInfo.first_name || ''} ${pInfo.last_name || ''}`.trim(),
                pos: pInfo.position,
                team: nflTeam,
                photoUrl: `https://sleepercdn.com/content/nfl/players/${pid}.jpg`
              };
            }).filter(Boolean);

            fullRosters[r.roster_id] = rosterPlayerObjs;
          });
        }
        setRostersMap(rosterToUser);
        setTeamFullRosters(fullRosters);

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
              
              const teamPayload = {
                ...teamOwner,
                points: m.points || 0,
                rosterId: m.roster_id
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

  const getPlayerWeeklyProj = (playerId: string, weekNum: number) => {
    const weekMap = playerProjections[weekNum];
    if (weekMap && weekMap[playerId] !== undefined) {
      return weekMap[playerId];
    }
    return 0;
  };

  // Exact Roster Optimization: 1QB, 2RB, 2WR, 1TE, 3FLEX (RB/WR/TE), 1K
  const getOptimalLineupForWeek = (rosterId: number, weekNum: number) => {
    const players = teamFullRosters[rosterId] || [];
    
    const mappedPlayers = players.map(p => {
      const proj = getPlayerWeeklyProj(p.id, weekNum);
      return {
        ...p,
        weeklyProj: proj,
        isBye: proj <= 0
      };
    }).filter(p => !p.isBye);

    const qbs = mappedPlayers.filter((p: any) => p.pos === 'QB').sort((a: any, b: any) => b.weeklyProj - a.weeklyProj);
    const rbs = mappedPlayers.filter((p: any) => p.pos === 'RB').sort((a: any, b: any) => b.weeklyProj - a.weeklyProj);
    const wrs = mappedPlayers.filter((p: any) => p.pos === 'WR').sort((a: any, b: any) => b.weeklyProj - a.weeklyProj);
    const tes = mappedPlayers.filter((p: any) => p.pos === 'TE').sort((a: any, b: any) => b.weeklyProj - a.weeklyProj);
    const ks = mappedPlayers.filter((p: any) => p.pos === 'K').sort((a: any, b: any) => b.weeklyProj - a.weeklyProj);

    const starters: any[] = [];
    const usedIds = new Set<string>();

    if (qbs.length > 0) {
      starters.push({ ...qbs[0], slot: 'QB' });
      usedIds.add(qbs[0].id);
    }
    rbs.slice(0, 2).forEach(p => { 
      starters.push({ ...p, slot: 'RB' }); 
      usedIds.add(p.id); 
    });
    wrs.slice(0, 2).forEach(p => { 
      starters.push({ ...p, slot: 'WR' }); 
      usedIds.add(p.id); 
    });
    if (tes.length > 0) {
      starters.push({ ...tes[0], slot: 'TE' });
      usedIds.add(tes[0].id);
    }
    if (ks.length > 0) {
      starters.push({ ...ks[0], slot: 'K' });
      usedIds.add(ks[0].id);
    }

    const remainingFlexPool = mappedPlayers
      .filter((p: any) => !usedIds.has(p.id) && ['RB', 'WR', 'TE'].includes(p.pos))
      .sort((a: any, b: any) => b.weeklyProj - a.weeklyProj);

    remainingFlexPool.slice(0, 3).forEach(p => {
      starters.push({ ...p, slot: 'FLEX' });
      usedIds.add(p.id);
    });

    const bench = mappedPlayers.filter((p: any) => !usedIds.has(p.id));
    const totalProjectedScore = starters.reduce((sum, p) => sum + p.weeklyProj, 0);

    return { starters, bench, totalProjectedScore };
  };

  const getWeeklyMatchupPrediction = (team1RosterId: number, team2RosterId: number, weekNum: number, team1Name: string, team2Name: string) => {
    const t1Opt = getOptimalLineupForWeek(team1RosterId, weekNum);
    const t2Opt = getOptimalLineupForWeek(team2RosterId, weekNum);

    const score1 = t1Opt.totalProjectedScore;
    const score2 = t2Opt.totalProjectedScore;

    const totalScore = score1 + score2;
    let t1Pct = totalScore > 0 ? Math.round((score1 / totalScore) * 100) : 50;
    let t2Pct = 100 - t1Pct;

    const favoredName = score1 >= score2 ? team1Name : team2Name;
    const predictedWinner = score1 >= score2 ? team1Name : team2Name;

    return { 
      t1Pct, 
      t2Pct, 
      favoredName, 
      predictedWinner, 
      projectedScore1: score1, 
      projectedScore2: score2 
    };
  };

  const calculateModalPositionBreakdown = (t1Starters: any[], t2Starters: any[], team1Name: string, team2Name: string) => {
    const slots = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K'];
    const breakdown = slots.map(slot => {
      const t1Players = t1Starters.filter(p => p.slot === slot);
      const t2Players = t2Starters.filter(p => p.slot === slot);

      const t1Pts = t1Players.reduce((sum, p) => sum + p.weeklyProj, 0);
      const t2Pts = t2Players.reduce((sum, p) => sum + p.weeklyProj, 0);

      let advantage = 'Even ⚖️';
      if (t1Pts > t2Pts + 0.5) advantage = `${team1Name} Edge 🔥`;
      else if (t2Pts > t1Pts + 0.5) advantage = `${team2Name} Edge 🔥`;

      return { slot, t1Players, t2Players, t1Pts, t2Pts, advantage };
    });
    return breakdown;
  };

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

  const calculatePredictedRecord = (rosterId: number) => {
    const schedule = getTeamSeasonSchedule(rosterId);
    let wins = 0;
    let losses = 0;
    let ties = 0;

    schedule.forEach(item => {
      if (item.result === 'WIN') {
        wins++;
        return;
      }
      if (item.result === 'LOSS') {
        losses++;
        return;
      }
      if (item.result === 'TIE') {
        ties++;
        return;
      }

      const oppId = item.team?.rosterId === rosterId ? item.opponent?.rosterId : item.team?.rosterId;
      if (!oppId) return;

      const pred = getWeeklyMatchupPrediction(rosterId, oppId, item.week, rostersMap[rosterId]?.name, rostersMap[oppId]?.name);
      const isTeam1 = item.team?.rosterId === rosterId;
      const teamWon = isTeam1 ? pred.projectedScore1 >= pred.projectedScore2 : pred.projectedScore2 >= pred.projectedScore1;

      if (teamWon) {
        wins++;
      } else {
        losses++;
      }
    });

    return { wins, losses, ties };
  };

  const selectedTeamSchedule = getTeamSeasonSchedule(selectedTeamRosterId);
  const currentWeekMatchups = matchupsData[selectedWeek] || [];
  const predictedRecord = calculatePredictedRecord(selectedTeamRosterId);

  return (
    <div className="space-y-8 pb-10">
      
      {/* MATCHUP DETAIL MODAL */}
      {activeMatchupModal && (() => {
        const modalWeek = activeMatchupModal.week;
        const t1Id = activeMatchupModal.team1.rosterId;
        const t2Id = activeMatchupModal.team2.rosterId;
        const t1Optimal = getOptimalLineupForWeek(t1Id, modalWeek);
        const t2Optimal = getOptimalLineupForWeek(t2Id, modalWeek);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-4xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-4">
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-indigo-600 dark:text-indigo-400">Week {modalWeek} Official Sleeper Projections (1QB, 2RB, 2WR, 1TE, 3FLEX, 1K)</span>
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

              {/* PROJECTED SCORE BANNER */}
              <div className="grid grid-cols-2 gap-4 bg-gradient-to-r from-gray-50 to-indigo-50/40 dark:from-gray-800/60 dark:to-indigo-950/40 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/60 text-center">
                <div>
                  <span className="text-xs font-bold text-gray-500">{activeMatchupModal.team1.name} (Projected)</span>
                  <p className="font-mono text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                    {t1Optimal.totalProjectedScore.toFixed(2)} pts
                  </p>
                </div>
                <div className="border-l border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-500">{activeMatchupModal.team2.name} (Projected)</span>
                  <p className="font-mono text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
                    {t2Optimal.totalProjectedScore.toFixed(2)} pts
                  </p>
                </div>
              </div>

              {/* SLOT-BY-SLOT POSITION BREAKDOWN COMPARISON */}
              <div className="space-y-4">
                <h4 className="text-xs uppercase font-extrabold text-gray-400 tracking-wider">Starting Lineup Slot Comparison</h4>
                <div className="space-y-3">
                  {calculateModalPositionBreakdown(
                    t1Optimal.starters,
                    t2Optimal.starters,
                    activeMatchupModal.team1.name,
                    activeMatchupModal.team2.name
                  ).map((slotGroup, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                      <div className="w-full sm:w-1/3">
                        <span className="text-[10px] uppercase font-bold text-indigo-500 block">{activeMatchupModal.team1.name} ({slotGroup.slot})</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {slotGroup.t1Players.length === 0 ? <span className="text-xs text-gray-400">None</span> : slotGroup.t1Players.map((p: any, i: number) => (
                            <span key={i} className="text-xs font-semibold bg-white dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                              {p.name} ({p.weeklyProj.toFixed(1)}p)
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="text-center shrink-0">
                        <span className="text-xs font-black uppercase px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {slotGroup.slot}: {slotGroup.advantage}
                        </span>
                      </div>

                      <div className="w-full sm:w-1/3 text-right sm:text-left">
                        <span className="text-[10px] uppercase font-bold text-amber-500 block">{activeMatchupModal.team2.name} ({slotGroup.slot})</span>
                        <div className="flex flex-wrap gap-1 mt-1 justify-start sm:justify-end">
                          {slotGroup.t2Players.length === 0 ? <span className="text-xs text-gray-400">None</span> : slotGroup.t2Players.map((p: any, i: number) => (
                            <span key={i} className="text-xs font-semibold bg-white dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                              {p.name} ({p.weeklyProj.toFixed(1)}p)
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
                    {t1Optimal.bench.map((p: any, i: number) => (
                      <div key={i} className="text-xs flex justify-between">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{p.name} ({p.pos} - {p.team})</span>
                        <span className="font-mono text-gray-400">{p.weeklyProj.toFixed(1)}p</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-gray-500 block mb-2">{activeMatchupModal.team2.name} Bench</span>
                  <div className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-200 dark:border-gray-800 space-y-1 max-h-40 overflow-y-auto">
                    {t2Optimal.bench.map((p: any, i: number) => (
                      <div key={i} className="text-xs flex justify-between">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{p.name} ({p.pos} - {p.team})</span>
                        <span className="font-mono text-gray-400">{p.weeklyProj.toFixed(1)}p</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

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
              
              const pred = getWeeklyMatchupPrediction(t1.rosterId, t2.rosterId, selectedWeek, t1.name, t2.name);
              const favoredTeamName = pred.favoredName;
              const favoredPct = pred.t1Pct >= pred.t2Pct ? pred.t1Pct : pred.t2Pct;

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
                      View Projections 🔍
                    </span>
                  </div>

                  {/* PREDICTION BADGE & WIN PROBABILITY BAR */}
                  <div className="space-y-1.5 bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                        🔮 Projected Winner: {pred.predictedWinner}
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400">{favoredTeamName} ({favoredPct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                      <div style={{ width: `${pred.t1Pct}%` }} className="h-full bg-indigo-600 transition-all"></div>
                      <div style={{ width: `${pred.t2Pct}%` }} className="h-full bg-amber-500 transition-all"></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {/* Team 1 */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg border bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2.5 truncate pr-2">
                        <img 
                          src={t1?.avatar ? `https://sleepercdn.com/avatars/thumbs/${t1.avatar}` : 'https://sleepercdn.com/images/v2/icons/player_default.webp'} 
                          className="w-6 h-6 rounded-full bg-gray-200 shrink-0" 
                          alt={t1?.name}
                        />
                        <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{t1?.name || 'BYE'}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                        Proj: {pred.projectedScore1.toFixed(1)}
                      </span>
                    </div>

                    {/* Team 2 */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg border bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2.5 truncate pr-2">
                        <img 
                          src={t2?.avatar ? `https://sleepercdn.com/avatars/thumbs/${t2.avatar}` : 'https://sleepercdn.com/images/v2/icons/player_default.webp'} 
                          className="w-6 h-6 rounded-full bg-gray-200 shrink-0" 
                          alt={t2?.name}
                        />
                        <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{t2?.name || 'BYE'}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">
                        Proj: {pred.projectedScore2.toFixed(1)}
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold uppercase text-gray-400">Select Team:</label>
              <select
                value={selectedTeamRosterId}
                onChange={(e) => setSelectedTeamRosterId(Number(e.target.value))}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
              >
                {Object.values(rostersMap).map((team: any) => (
                  <option key={team.rosterId} value={team.rosterId}>
                    {team.name} ({team.username})
                  </option>
                ))}
              </select>
            </div>

            {/* PREDICTED SEASON RECORD BANNER */}
            <div className="flex items-center gap-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 px-5 py-2.5 rounded-xl">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-indigo-500 block">Optimal-Lineup Projected Record</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                  {predictedRecord.wins}W - {predictedRecord.losses}L{predictedRecord.ties > 0 ? ` - ${predictedRecord.ties}T` : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedTeamSchedule.map((item) => {
              const oppId = item.team?.rosterId === selectedTeamRosterId ? item.opponent?.rosterId : item.team?.rosterId;
              const teamName = rostersMap[selectedTeamRosterId]?.name;
              const oppName = rostersMap[oppId]?.name || 'Opponent';
              
              const pred = getWeeklyMatchupPrediction(selectedTeamRosterId, oppId, item.week, teamName, oppName);
              
              const isTeam1 = item.team?.rosterId === selectedTeamRosterId;
              const favoredTeamName = pred.favoredName;
              const favoredPct = pred.t1Pct >= pred.t2Pct ? pred.t1Pct : pred.t2Pct;
              
              const isTeam1PredictedWinner = pred.projectedScore1 >= pred.projectedScore2;
              const isTeam2PredictedWinner = pred.projectedScore2 > pred.projectedScore1;
              const isSelectedTeamWinner = isTeam1 ? isTeam1PredictedWinner : isTeam2PredictedWinner;

              return (
                <div 
                  key={item.week}
                  onClick={() => setActiveMatchupModal({ week: item.week, matchupId: item.matchupId, team1: item.team, team2: item.opponent })}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm space-y-3 cursor-pointer hover:border-indigo-500 transition-all"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">Week {item.week}</span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded ${
                      isSelectedTeamWinner ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                    }`}>
                      {isSelectedTeamWinner ? 'PROJECTED WIN 🟢' : 'PROJECTED LOSS 🔴'}
                    </span>
                  </div>

                  {/* PROBABILITY BAR */}
                  <div className="space-y-1 bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500">
                      <span>Win Probability Model</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{favoredTeamName} ({favoredPct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                      <div style={{ width: `${pred.t1Pct}%` }} className="h-full bg-indigo-600 transition-all"></div>
                      <div style={{ width: `${pred.t2Pct}%` }} className="h-full bg-amber-500 transition-all"></div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs font-semibold">
                    <div className={`flex justify-between p-1 rounded ${isTeam1PredictedWinner ? 'bg-emerald-50 dark:bg-emerald-950/30 font-bold text-emerald-700 dark:text-emerald-300' : ''}`}>
                      <span className="truncate">{item.team?.name}</span>
                      <span className="font-mono">Proj: {pred.projectedScore1.toFixed(1)}</span>
                    </div>
                    <div className={`flex justify-between p-1 rounded ${isTeam2PredictedWinner ? 'bg-emerald-50 dark:bg-emerald-950/30 font-bold text-emerald-700 dark:text-emerald-300' : 'text-gray-500'}`}>
                      <span className="truncate">vs. {item.opponent?.name || 'BYE'}</span>
                      <span className="font-mono">Proj: {pred.projectedScore2.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}