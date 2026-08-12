"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';

const SLEEPER_LEAGUE_ID = "1312122584644476928";

export default function RostersPage() {
  const { users } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [currentSeason, setCurrentSeason] = useState<string>("2026");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRostersData() {
      try {
        // 1. Fetch live NFL state to dynamically get the active season year
        const stateRes = await fetch('https://api.sleeper.app/v1/state/nfl');
        const nflState = await stateRes.json();
        const activeSeason = nflState?.season || "2026";
        setCurrentSeason(activeSeason);

        // 2. Fetch players, market values, live season stats, league rosters, traded picks, and users concurrently
        const [nflRes, ddRes, statsRes, rostersRes, tradedPicksRes, usersRes] = await Promise.all([
          fetch('https://api.sleeper.app/v1/players/nfl'),
          fetch('https://www.dynastydealer.com/api/player-values'),
          fetch(`https://api.sleeper.app/v1/stats/nfl/regular/${activeSeason}`).catch(() => null),
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/rosters`),
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/traded_picks`),
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/users`)
        ]);

        const nflData = await nflRes.json();
        const ddData = await ddRes.json();
        const statsData = statsRes ? await statsRes.json() : {};
        const rostersData = await rostersRes.json();
        const tradedPicksData = tradedPicksRes ? await tradedPicksRes.json() : [];
        const usersData = await usersRes.json();

        const userMap: Record<string, any> = {};
        const rosterIdToOwnerName: Record<number, string> = {};
        
        if (Array.isArray(usersData)) {
          usersData.forEach((u: any) => {
            const username = u.username || u.display_name?.toLowerCase();
            userMap[u.user_id] = {
              username: username,
              name: u.metadata?.team_name || u.display_name || `Team ${u.user_id.slice(-4)}`,
              avatar: u.avatar
            };
          });
        }

        rostersData.forEach((r: any) => {
          const ownerInfo = userMap[r.owner_id] || { name: `Team #${r.roster_id}` };
          rosterIdToOwnerName[r.roster_id] = ownerInfo.name;
        });

        const vals: Record<string, number> = {};
        if (ddData && ddData.players) {
          ddData.players.forEach((p: any) => {
            if (p.sleeper_id) vals[p.sleeper_id] = p.current_value;
          });
        }

        // Map stats blurbs
        const playerStatsBlurbMap: Record<string, string> = {};
        if (statsData) {
          Object.entries(statsData).forEach(([pid, st]: [string, any]) => {
            const passYds = st.pass_yd || 0;
            const passTd = st.pass_td || 0;
            const rushYds = st.rush_yd || 0;
            const rushTd = st.rush_td || 0;
            const rec = st.rec || 0;
            const recYds = st.rec_yd || 0;
            const recTd = st.rec_td || 0;
            const fgm = st.fgm || 0;
            const fga = st.fga || 0;
            const xpm = st.xpm || 0;
            const xpa = st.xpa || 0;

            const pos = nflData[pid]?.position;
            let snippetParts = [];

            if (pos === 'K') {
              if (fga > 0 || xpa > 0) {
                snippetParts.push(`FG: ${fgm}/${fga} • XP: ${xpm}/${xpa}`);
              }
            } else {
              if (passYds > 0) snippetParts.push(`${passYds} Pass Yds (${passTd} TD)`);
              if (rushYds > 0) snippetParts.push(`${rushYds} Rush Yds (${rushTd} TD)`);
              if (rec > 0 || recYds > 0) snippetParts.push(`${rec} Rec • ${recYds} Yds (${recTd} TD)`);
            }

            playerStatsBlurbMap[pid] = snippetParts.length > 0 
              ? `${activeSeason}: ${snippetParts.join(' • ')}` 
              : `${activeSeason}: No stats recorded`;
          });
        }

        // Gather all unique rostered player IDs
        const allRosteredPlayerIds: string[] = [];
        rostersData.forEach((r: any) => {
          if (r.players) allRosteredPlayerIds.push(...r.players);
          if (r.reserve) allRosteredPlayerIds.push(...r.reserve);
          if (r.taxi) allRosteredPlayerIds.push(...r.taxi);
        });

        const scoredPlayersList = Array.from(new Set(allRosteredPlayerIds)).map(pid => ({
          id: pid,
          pos: nflData[pid]?.position || 'UNK',
          value: vals[pid] || (nflData[pid]?.position === 'K' ? 200 : 1500)
        }));

        scoredPlayersList.sort((a, b) => b.value - a.value);
        const overallRankMap: Record<string, number> = {};
        scoredPlayersList.forEach((p, idx) => { overallRankMap[p.id] = idx + 1; });

        const posRankMap: Record<string, number> = {};
        ['QB', 'RB', 'WR', 'TE', 'K'].forEach(pos => {
          const posList = scoredPlayersList.filter(p => p.pos === pos);
          posList.sort((a, b) => b.value - a.value);
          posList.forEach((p, idx) => { posRankMap[p.id] = idx + 1; });
        });

        const helperMapPlayer = (pid: string) => {
          const p = nflData[pid];
          if (!p) return null;
          const pVal = vals[pid] || (p.position === 'K' ? 200 : 1500);
          return {
            id: pid,
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            pos: p.position || 'UNK',
            team: p.team || 'FA',
            value: pVal,
            age: p.age || 25,
            stats: playerStatsBlurbMap[pid] || `${activeSeason}: No stats recorded`,
            posRank: posRankMap[pid] || 99,
            overallRank: overallRankMap[pid] || 999,
            photoUrl: `https://sleepercdn.com/content/nfl/players/${pid}.jpg`
          };
        };

        // 3. STRICT SLEEPER DRAFT PICK PARSING FROM SCRATCH
        // Step A: Generate standard 3 rounds for the next 3 seasons for each team originally
        const currentYearNum = parseInt(activeSeason, 10);
        const draftYears = [currentYearNum, currentYearNum + 1, currentYearNum + 2];

        const rosterPicksMap: Record<number, any[]> = {};
        rostersData.forEach((r: any) => {
          rosterPicksMap[r.roster_id] = [];
          draftYears.forEach(season => {
            for (let round = 1; round <= 3; round++) {
              rosterPicksMap[r.roster_id].push({
                season: season.toString(),
                round: round,
                originalOwnerId: r.roster_id,
                originalOwnerName: rosterIdToOwnerName[r.roster_id] || `Team ${r.roster_id}`,
                value: round === 1 ? 2500 : round === 2 ? 1400 : 800
              });
            }
          });
        });

        // Step B: Purely execute Sleeper's traded picks mapping
        if (Array.isArray(tradedPicksData)) {
          tradedPicksData.forEach((tp: any) => {
            const season = tp.season;
            const round = tp.round;
            const originalOwnerId = tp.roster_id; // The team that originally owned the pick
            const currentOwnerId = tp.owner_id;     // The team that currently holds the pick via Sleeper

            // Find and extract this exact pick from wherever it currently lives in the map
            let extractedPick: any = null;
            Object.keys(rosterPicksMap).forEach(rIdStr => {
              const rId = Number(rIdStr);
              const foundIndex = rosterPicksMap[rId].findIndex(
                p => p.season === season && p.round === round && p.originalOwnerId === originalOwnerId
              );
              if (foundIndex !== -1) {
                extractedPick = rosterPicksMap[rId].splice(foundIndex, 1)[0];
              }
            });

            // If we didn't have it initialized yet, create it fresh
            if (!extractedPick) {
              extractedPick = {
                season: season,
                round: round,
                originalOwnerId: originalOwnerId,
                originalOwnerName: rosterIdToOwnerName[originalOwnerId] || `Team ${originalOwnerId}`,
                value: round === 1 ? 2500 : round === 2 ? 1400 : 800
              };
            }

            // Deposit the pick into the current owner's inventory
            if (!rosterPicksMap[currentOwnerId]) {
              rosterPicksMap[currentOwnerId] = [];
            }
            rosterPicksMap[currentOwnerId].push(extractedPick);
          });
        }

        const formattedTeams = rostersData.map((r: any) => {
          const ownerInfo = userMap[r.owner_id] || { username: `user_${r.roster_id}`, name: `Team #${r.roster_id}`, avatar: null };
          
          const reserveIds = new Set(r.reserve || []);
          const taxiIds = new Set(r.taxi || []);

          const primaryPlayerIds = (r.players || []).filter((pid: string) => !reserveIds.has(pid) && !taxiIds.has(pid));

          const playerObjects = primaryPlayerIds.map(helperMapPlayer).filter(Boolean);
          const reserveObjects = (r.reserve || []).map(helperMapPlayer).filter(Boolean);
          const taxiObjects = (r.taxi || []).map(helperMapPlayer).filter(Boolean);
          const draftPicks = rosterPicksMap[r.roster_id] || [];

          // Sort draft picks by season and round
          draftPicks.sort((a, b) => {
            if (a.season !== b.season) return Number(a.season) - Number(b.season);
            return a.round - b.round;
          });

          const allAssignedPlayers = [...playerObjects, ...reserveObjects, ...taxiObjects];
          const playersValue = allAssignedPlayers.reduce((sum: number, p: any) => sum + p.value, 0);
          const picksValue = draftPicks.reduce((sum: number, p: any) => sum + p.value, 0);
          const totalValue = playersValue + picksValue;

          return {
            rosterId: r.roster_id,
            username: ownerInfo.username,
            ownerName: ownerInfo.name,
            avatar: ownerInfo.avatar,
            wins: r.settings.wins || 0,
            losses: r.settings.losses || 0,
            ties: r.settings.ties || 0,
            fpts: (r.settings.fpts || 0) + ((r.settings.fpts_decimal || 0) / 100),
            players: playerObjects,
            reserve: reserveObjects,
            taxi: taxiObjects,
            draftPicks,
            totalValue
          };
        });

        formattedTeams.sort((a: any, b: any) => b.totalValue - a.totalValue);

        setTeams(formattedTeams);
        if (formattedTeams.length > 0) setSelectedTeam(formattedTeams[0]);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load live rosters data:", err);
        setIsLoading(false);
      }
    }
    loadRostersData();
  }, []);

  const exportToExcelCSV = () => {
    let csvRows = [];
    csvRows.push(['Team / Manager', 'Asset Name', 'Type', 'Position / Round', 'NFL Team / Season', 'Age', 'Value', 'Roster Slot'].join(','));

    teams.forEach(team => {
      const teamLabel = `"${team.ownerName} (${team.username})"`;
      
      const allList = [
        ...(team.players || []).map((p: any) => ({ ...p, type: 'Player', slot: 'Active / Bench' })),
        ...(team.reserve || []).map((p: any) => ({ ...p, type: 'Player', slot: 'IR' })),
        ...(team.taxi || []).map((p: any) => ({ ...p, type: 'Player', slot: 'Taxi Squad' })),
        ...(team.draftPicks || []).map((p: any) => ({ 
          name: `${p.season} Round ${p.round} (${p.originalOwnerName})`, 
          type: 'Draft Pick', 
          pos: `Round ${p.round}`, 
          team: p.season, 
          age: '', 
          value: p.value, 
          slot: 'Draft Capital' 
        }))
      ];

      allList.forEach(p => {
        const assetName = `"${p.name.replace(/"/g, '""')}"`;
        const type = p.type;
        const posOrRound = p.pos;
        const nflTeamOrSeason = p.team || '';
        const age = p.age || '';
        const value = p.value;
        const slot = `"${p.slot}"`;

        csvRows.push([teamLabel, assetName, type, posOrRound, nflTeamOrSeason, age, value, slot].join(','));
      });
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'League_Rosters_Data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading dynasty rankings & draft capital...</p>
        </div>
      </div>
    );
  }

  const getGroupedActiveAssets = (team: any) => {
    if (!team) return [];
    const players = team.players || [];

    const qbs = players.filter((p: any) => p.pos === 'QB').sort((a: any, b: any) => b.value - a.value);
    const rbs = players.filter((p: any) => p.pos === 'RB').sort((a: any, b: any) => b.value - a.value);
    const wrs = players.filter((p: any) => p.pos === 'WR').sort((a: any, b: any) => b.value - a.value);
    const tes = players.filter((p: any) => p.pos === 'TE').sort((a: any, b: any) => b.value - a.value);
    const ks = players.filter((p: any) => p.pos === 'K').sort((a: any, b: any) => b.value - a.value);

    const groups = [];
    if (qbs.length > 0) groups.push({ title: 'Quarterbacks (QB)', items: qbs });
    if (rbs.length > 0) groups.push({ title: 'Running Backs (RB)', items: rbs });
    if (wrs.length > 0) groups.push({ title: 'Wide Receivers (WR)', items: wrs });
    if (tes.length > 0) groups.push({ title: 'Tight Ends (TE)', items: tes });
    if (ks.length > 0) groups.push({ title: 'Kickers (K)', items: ks });

    return groups;
  };

  const assetGroups = selectedTeam ? getGroupedActiveAssets(selectedTeam) : [];
  const reservePlayers = selectedTeam?.reserve || [];
  const taxiPlayers = selectedTeam?.taxi || [];
  const draftPicks = selectedTeam?.draftPicks || [];

  return (
    <div className="space-y-8 pb-10">
      
      {/* HEADER */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">League Rosters</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Manager squads, live {currentSeason} stats, IR/Taxi slots, draft capital, and rankings.
          </p>
        </div>
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full">
          System Live 🟢
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* TEAM SELECTOR SIDEBAR */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm space-y-2 h-fit">
          <span className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider block px-2 mb-2">Teams</span>
          <div className="space-y-1">
            {teams.map(team => {
              const isSelected = selectedTeam?.rosterId === team.rosterId;
              return (
                <button
                  key={team.rosterId}
                  onClick={() => setSelectedTeam(team)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all ${
                    isSelected 
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 text-indigo-900 dark:text-indigo-200 shadow-xs' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <img 
                      src={team.avatar ? `https://sleepercdn.com/avatars/thumbs/${team.avatar}` : 'https://sleepercdn.com/images/v2/icons/player_default.webp'} 
                      className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" 
                      alt={team.ownerName}
                    />
                    <div className="truncate">
                      <span className="font-bold text-xs truncate block">{team.ownerName}</span>
                      <span className="text-[10px] text-gray-400 truncate block">({team.username})</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0">
                    {team.totalValue.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SELECTED TEAM ROSTER DETAIL */}
        <div className="lg:col-span-3 space-y-6">
          {selectedTeam && (
            <>
              {/* Team Overview Card */}
              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <img 
                    src={selectedTeam.avatar ? `https://sleepercdn.com/avatars/thumbs/${selectedTeam.avatar}` : 'https://sleepercdn.com/images/v2/icons/player_default.webp'} 
                    className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-indigo-500 shadow-sm" 
                    alt={selectedTeam.ownerName}
                  />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedTeam.ownerName} <span className="text-sm font-normal text-gray-400">({selectedTeam.username})</span></h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Record: <span className="font-bold text-gray-800 dark:text-gray-200">{selectedTeam.wins}-{selectedTeam.losses}{selectedTeam.ties > 0 ? `-${selectedTeam.ties}` : ''}</span> • Points For: <span className="font-bold text-gray-800 dark:text-gray-200">{selectedTeam.fpts.toFixed(1)}</span>
                    </p>
                  </div>
                </div>

                <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 px-4 py-2.5 rounded-xl text-right">
                  <span className="text-[10px] uppercase font-extrabold text-indigo-500 block">Total Roster Value</span>
                  <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{selectedTeam.totalValue.toLocaleString()}</span>
                </div>
              </div>

              {/* Positional Breakdown Sections */}
              <div className="space-y-6">
                {assetGroups.map((group, gIdx) => (
                  <div key={gIdx} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-800/80 px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex justify-between">
                      <span>{group.title}</span>
                      <span className="text-gray-400 font-medium">({group.items.length})</span>
                    </div>

                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                      {group.items.map((asset: any) => (
                        <li key={asset.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                              <img 
                                src={asset.photoUrl} 
                                onError={(e: any) => { e.target.src = 'https://sleepercdn.com/images/v2/icons/player_default.webp'; }}
                                className="w-full h-full object-cover" 
                                alt={asset.name}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                                asset.pos === 'QB' ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300' :
                                asset.pos === 'RB' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' :
                                asset.pos === 'WR' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' :
                                asset.pos === 'TE' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' :
                                'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                                }`}>{asset.pos}</span>
                                <span className="font-bold text-sm text-gray-900 dark:text-white">{asset.name}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                  {asset.team} • Age {asset.age}
                                </span>
                                <span className="text-[10px] text-gray-300 dark:text-gray-600">•</span>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                  {asset.stats}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex flex-col justify-center">
                            <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">{asset.value.toLocaleString()}</span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              {asset.pos} #{asset.posRank} <span className="text-gray-300 dark:text-gray-600">|</span> OVR #{asset.overallRank}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {/* IR (RESERVE) SLOT SECTION */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex justify-between">
                    <span>Injured Reserve (IR) Slots</span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">({reservePlayers.length})</span>
                  </div>

                  {reservePlayers.length === 0 ? (
                    <div className="p-4 text-xs italic text-gray-400 text-center">No players currently on IR.</div>
                  ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                      {reservePlayers.map((asset: any) => (
                        <li key={asset.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                              <img 
                                src={asset.photoUrl} 
                                onError={(e: any) => { e.target.src = 'https://sleepercdn.com/images/v2/icons/player_default.webp'; }}
                                className="w-full h-full object-cover" 
                                alt={asset.name}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">{asset.pos}</span>
                                <span className="font-bold text-sm text-gray-900 dark:text-white">{asset.name}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                  {asset.team} • Age {asset.age}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex flex-col justify-center">
                            <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">{asset.value.toLocaleString()}</span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              {asset.pos} #{asset.posRank} <span className="text-gray-300 dark:text-gray-600">|</span> OVR #{asset.overallRank}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* TAXI SQUAD SLOT SECTION */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="bg-purple-50 dark:bg-purple-950/40 px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider flex justify-between">
                    <span>Taxi Squad Slots</span>
                    <span className="text-purple-600 dark:text-purple-400 font-medium">({taxiPlayers.length})</span>
                  </div>

                  {taxiPlayers.length === 0 ? (
                    <div className="p-4 text-xs italic text-gray-400 text-center">No players currently on Taxi Squad.</div>
                  ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                      {taxiPlayers.map((asset: any) => (
                        <li key={asset.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                              <img 
                                src={asset.photoUrl} 
                                onError={(e: any) => { e.target.src = 'https://sleepercdn.com/images/v2/icons/player_default.webp'; }}
                                className="w-full h-full object-cover" 
                                alt={asset.name}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">{asset.pos}</span>
                                <span className="font-bold text-sm text-gray-900 dark:text-white">{asset.name}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                  {asset.team} • Age {asset.age}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right flex flex-col justify-center">
                            <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">{asset.value.toLocaleString()}</span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              {asset.pos} #{asset.posRank} <span className="text-gray-300 dark:text-gray-600">|</span> OVR #{asset.overallRank}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* FUTURE DRAFT PICKS SECTION (STRICTLY FROM SLEEPER TRADED PICKS ENDPOINT ONLY) */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="bg-blue-50 dark:bg-blue-950/40 px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex justify-between">
                    <span>Future Draft Capital (Traded Picks)</span>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">({draftPicks.length})</span>
                  </div>

                  {draftPicks.length === 0 ? (
                    <div className="p-4 text-xs italic text-gray-400 text-center">No traded future draft picks currently assigned to this team.</div>
                  ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                      {draftPicks.map((pick: any, idx: number) => (
                        <li key={idx} className="p-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs shrink-0 border border-blue-200 dark:border-blue-800">
                              {pick.season.slice(-2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-gray-900 dark:text-white">
                                  {pick.season} Round {pick.round} 
                                  <span className="text-xs font-normal text-amber-600 dark:text-amber-400 ml-1.5">
                                    (via {pick.originalOwnerName})
                                  </span>
                                </span>
                              </div>
                              <span className="text-[11px] text-gray-400 dark:text-gray-500 block mt-0.5">
                                Original Owner: <span className="font-semibold text-gray-600 dark:text-gray-300">{pick.originalOwnerName}</span>
                              </span>
                            </div>
                          </div>

                          <div className="text-right flex flex-col justify-center">
                            <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">{pick.value.toLocaleString()}</span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-semibold">
                              Traded Pick
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

              </div>
            </>
          )}
        </div>

      </div>

      {/* EXPORT TO EXCEL / CSV BUTTON */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Excel Clean Data Export 📊</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Download a structured CSV file formatted specifically with columns for Team, Asset Name, Type, Position/Round, and Roster Slot.
          </p>
        </div>
        <button
          onClick={exportToExcelCSV}
          className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 flex items-center gap-2 cursor-pointer"
        >
          📥 Download League Data as Excel / CSV
        </button>
      </div>

    </div>
  );
}