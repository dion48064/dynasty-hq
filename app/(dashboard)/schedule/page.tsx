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

        const vals: Record<string, number> = {};
        if (ddData && ddData.players) {
          ddData.players.forEach((p: any) => {
            if (p.sleeper_id) vals[p.sleeper_id] = p.current_value;
          });
        }
        setPlayerValues(vals);
        setNflPlayers(playersData || {});

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
              settings: r.settings,
              fpts: (r.settings.fpts || 0) + ((r.settings.fpts_decimal || 0) / 100)
            };

            // Map all players on this roster with enriched data
            const rosterPlayerObjs = (r.players || []).map((pid: string) => {
              const pInfo = playersData[pid];
              if (!pInfo || !['QB', 'RB', 'WR', 'TE'].includes(pInfo.position)) return null;
              const nflTeam = pInfo.team || 'FA';
              return {
                id: pid,
                name: `${pInfo.first_name || ''} ${pInfo.last_name || ''}`.trim(),
                pos: pInfo.position,
                team: nflTeam,
                isBye: !nflTeam || nflTeam === 'FA',
                value: vals[pid] || 1500,
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

  // Get the Optimal Starting Lineup for a team given a specific week (filtering out byes, picking top players per position)
  const getOptimalLineup = (rosterId: number, weekNum: number) => {
    const players = teamFullRosters[rosterId] || [];
    // Filter out players on bye for this week (mock bye assignment logic if team has no games or FA status)
    const availablePlayers = players.filter((p: any) => !p.isBye);

    const qbs = availablePlayers.filter((p: any) => p.pos === 'QB').sort((a: any, b: any) => b.value - a.value);
    const rbs = availablePlayers.filter((p: any) => p.pos === 'RB').sort((a: any, b: any) => b.value - a.value);
    const wrs = availablePlayers.filter((p: any) => p.pos === 'WR').sort((a: any, b: any) => b.value - a.value);
    const tes = availablePlayers.filter((p: any) => p.pos === 'TE').sort((a: any, b: any) => b.value - a.value);

    // Standard Superflex / Standard League Optimal Starters: 1 QB, 2 RB, 3 WR, 1 TE, 2 Flex (RB/WR/TE)
    const starters: any[] = [];
    const usedIds = new Set<string>();

    // 1 QB
    if (qbs.length > 0) {
      starters.push(qbs[0]);
      usedIds.add(qbs[0].id);
    }
    // 2 RB
    rbs.slice(0, 2).forEach(p => { starters.push(p); usedIds.add(p.id); });
    // 3 WR
    wrs.slice(0, 3).forEach(p => { starters.push(p); usedIds.add(p.id); });
    // 1 TE
    if (tes.length > 0) {
      starters.push(tes[0]);
      usedIds.add(tes[0].id);
    }

    // 2 Flex (Best remaining RB, WR, TE)
    const remainingFlexPool = availablePlayers
      .filter((p: any) => !usedIds.has(p.id) && ['RB', 'WR', 'TE'].includes(p.pos))
      .sort((a: any, b: any) => b.value - a.value);

    remainingFlexPool.slice(0, 2).forEach(p => {
      starters.push(p);
      usedIds.add(p.id);
    });

    const bench = availablePlayers.filter((p: any) => !usedIds.has(p.id));

    return { starters, bench };
  };

  // Calculate power rating of an optimal lineup with diminishing returns
  const calculateOptimalTeamPower = (rosterId: number, weekNum: number) => {
    const { starters } = getOptimalLineup(rosterId, weekNum);
    const rawValueSum = starters.reduce((sum: number, p: any) => sum + Math.sqrt(p.value) * 45, 0);
    return rawValueSum;
  };

  // Generate win probability percentage between two teams using optimal lineups
  const getOptimalWinProbability = (team1RosterId: number, team2RosterId: number, weekNum: number, team1Name: string, team2Name: string) => {
    const t1Power = calculateOptimalTeamPower(team1RosterId, weekNum);
    const t2Power = calculateOptimalTeamPower(team2RosterId, weekNum);

    const totalPower = t1Power + t2Power;
    if (totalPower === 0) return { t1Pct: 50, t2Pct: 50, favoredName: 'Even' };

    let t1Pct = Math.round((t1Power / totalPower) * 100);
    // Tighter variance band to prevent 100% blowouts
    t1Pct = Math.max(20, Math.min(80, t1Pct));
    let t2Pct = 100 - t1Pct;

    const favoredName = t1Pct >= t2Pct ? team1Name : team2Name;
    return { t1Pct, t2Pct, favoredName };
  };

  // Calculate position breakdown for modal view based on optimal lineups
  const calculateOptimalPositionBreakdown = (t1Starters: any[], t2Starters: any[], team1Name: string, team2Name: string) => {
    const positions = ['QB', 'RB', 'WR', 'TE'];
    const breakdown = positions.map(pos => {
      const t1Pos = t1Starters.filter(p => p.pos === pos).sort((a, b) => b.value - a.value);
      const t2Pos = t2Starters.filter(p => p.pos === pos).sort((a, b) => b.value - a.value);

      const maxCount = Math.min(t1Pos.length, t2Pos.length, 3);
      const t1Players = t1Pos.slice(0, maxCount);
      const t2Players = t2Pos.slice(0, maxCount);

      const t1Val = t1Players.reduce((sum, p) => sum + p.value, 0);
      const t2Val = t2Players.reduce((sum, p) => sum + p.value, 0);

      let advantage = 'Even ⚖️';
      if (t1Val > t2Val + 300) advantage = `${team1Name} Edge 🔥`;
      else if (t2Val > t1Val + 300) advantage = `${team2Name} Edge 🔥`;

      return { pos, t1Players, t2Players, t1Val, t2Val, advantage };
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

  // Predictive Record Algorithm using Optimal Lineups
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

      const prob = getOptimalWinProbability(rosterId, oppId, item.week, item.team.name, item.opponent.name);
      const isTeam1 = item.team?.rosterId === rosterId;
      const teamWinChance = isTeam1 ? prob.t1Pct : prob.t2Pct;

      if (teamWinChance >= 50) {
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
        const t1Optimal = getOptimalLineup(t1Id, modalWeek);
        const t2Optimal = getOptimalLineup(t2Id, modalWeek);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-4xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-4">
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-indigo-600 dark:text-indigo-400">Week {modalWeek} Optimal Matchup Breakdown</span>
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
                    {activeMatchupModal.team1.points > 0 ? activeMatchupModal.team1.points.toFixed(2) : 'Optimal Projected'}
                  </p>
                </div>
                <div className="border-l border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-500">{activeMatchupModal.team2.name}</span>
                  <p className="font-mono text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
                    {activeMatchupModal.team2.points > 0 ? activeMatchupModal.team2.points.toFixed(2) : 'Optimal Projected'}
                  </p>
                </div>
              </div>

              {/* POSITION BREAKDOWN COMPARISON */}
              <div className="space-y-4">
                <h4 className="text-xs uppercase font-extrabold text-gray-400 tracking-wider">Optimal Starting Lineup Advantages (Bye-Week Filtered)</h4>
                <div className="space-y-3">
                  {calculateOptimalPositionBreakdown(
                    t1Optimal.starters,
                    t2Optimal.starters,
                    activeMatchupModal.team1.name,
                    activeMatchupModal.team2.name
                  ).map((posGroup, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                      <div className="w-full sm:w-1/3">
                        <span className="text-[10px] uppercase font-bold text-indigo-500 block">{activeMatchupModal.team1.name} ({posGroup.pos})</span>
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
                        <span className="text-[10px] uppercase font-bold text-amber-500 block">{activeMatchupModal.team2.name} ({posGroup.pos})</span>
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
                    {t1Optimal.bench.map((p: any, i: number) => (
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
                    {t2Optimal.bench.map((p: any, i: number) => (
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
              const t1Winner = t1 && t2 && t1.points > t2.points;
              const t2Winner = t1 && t2 && t2.points > t1.points;

              const prob = getOptimalWinProbability(t1.rosterId, t2.rosterId, selectedWeek, t1.name, t2.name);
              const favoredTeamName = prob.favoredName;
              const favoredPct = prob.t1Pct >= prob.t2Pct ? prob.t1Pct : prob.t2Pct;

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
                      View Details 🔍
                    </span>
                  </div>

                  {/* PROBABILITY BAR */}
                  <div className="space-y-1 bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500">
                      <span>Optimal Lineup Probability</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{favoredTeamName} ({favoredPct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                      <div style={{ width: `${prob.t1Pct}%` }} className="h-full bg-indigo-600 transition-all"></div>
                      <div style={{ width: `${prob.t2Pct}%` }} className="h-full bg-amber-500 transition-all"></div>
                    </div>
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
              const prob = getOptimalWinProbability(selectedTeamRosterId, oppId, item.week, rostersMap[selectedTeamRosterId]?.name, rostersMap[oppId]?.name);
              
              const isTeam1 = item.team?.rosterId === selectedTeamRosterId;
              const teamWinChance = isTeam1 ? prob.t1Pct : prob.t2Pct;
              const favoredTeamName = prob.favoredName;
              const favoredPct = prob.t1Pct >= prob.t2Pct ? prob.t1Pct : prob.t2Pct;

              return (
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

                  {/* PROBABILITY BAR */}
                  <div className="space-y-1 bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500">
                      <span>Optimal Lineup Probability</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{favoredTeamName} ({favoredPct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                      <div style={{ width: `${prob.t1Pct}%` }} className="h-full bg-indigo-600 transition-all"></div>
                      <div style={{ width: `${prob.t2Pct}%` }} className="h-full bg-amber-500 transition-all"></div>
                    </div>
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
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}