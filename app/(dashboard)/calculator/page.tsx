"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';

const SLEEPER_LEAGUE_ID = "1312122584644476928";

const getDraftPickValue = (season: string, round: number) => {
  if (season === "2027") {
    if (round === 1) return 4650;
    if (round === 2) return 2350;
    if (round === 3) return 980;
  } else if (season === "2028") {
    if (round === 1) return 3950;
    if (round === 2) return 1980;
    if (round === 3) return 820;
  } else if (season === "2029") {
    if (round === 1) return 3320;
    if (round === 2) return 1650;
    if (round === 3) return 680;
  }
  return round === 1 ? 3000 : round === 2 ? 1500 : 700;
};

interface TradeParticipant {
  id: string;
  teamName: string;
  assets: any[];
  searchQuery: string;
  isSearching: boolean;
}

export default function TradeCalculator() {
  const { currentUser } = useAuth();
  
  const [rosters, setRosters] = useState<Record<string, { players: any[], picks: any[] }>>({});
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Multi-team Trade State
  const [participants, setParticipants] = useState<TradeParticipant[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadLeagueData() {
      try {
        const [stateRes, usersRes, rostersRes, tradedPicksRes, nflRes, ddRes] = await Promise.all([
          fetch('https://api.sleeper.app/v1/state/nfl'),
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/users`),
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/rosters`),
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/traded_picks`),
          fetch('https://api.sleeper.app/v1/players/nfl'),
          fetch('https://www.dynastydealer.com/api/player-values')
        ]);

        const nflState = await stateRes.json();
        const activeSeason = nflState?.season || "2026";
        const currentYearNum = parseInt(activeSeason, 10);

        const usersData = await usersRes.json();
        const rostersData = await rostersRes.json();
        const tradedPicksData = tradedPicksRes ? await tradedPicksRes.json() : [];
        const nflData = await nflRes.json();
        const ddData = await ddRes.json();

        const userMap: Record<string, any> = {};
        const rosterIdToUsername: Record<number, string> = {};
        const rosterIdToOwnerName: Record<number, string> = {};

        if (Array.isArray(usersData)) {
          usersData.forEach((u: any) => {
            const username = u.username || u.display_name?.toLowerCase();
            userMap[u.user_id] = {
              username,
              name: u.metadata?.team_name || u.display_name || `Team ${u.user_id.slice(-4)}`
            };
          });
        }

        rostersData.forEach((r: any) => {
          const ownerInfo = userMap[r.owner_id] || { username: `team_${r.roster_id}`, name: `Team #${r.roster_id}` };
          rosterIdToUsername[r.roster_id] = ownerInfo.username;
          rosterIdToOwnerName[r.roster_id] = ownerInfo.name;
        });

        const vals: Record<string, number> = {};
        if (ddData && ddData.players) {
          ddData.players.forEach((p: any) => {
            if (p.sleeper_id) vals[p.sleeper_id] = p.current_value;
          });
        }

        const playerObjects: Record<string, any> = {};
        Object.entries(nflData).forEach(([id, p]: [string, any]) => {
          const photoUrl = `https://sleepercdn.com/content/nfl/players/${id}.jpg`;
          playerObjects[id] = {
            id,
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            pos: p.position || 'UNK',
            team: p.team || 'FA',
            value: vals[id] || (p.position === 'K' ? 200 : 1500),
            photoUrl,
            type: 'PLAYER'
          };
        });

        const draftYears = [currentYearNum + 1, currentYearNum + 2, currentYearNum + 3];
        const rosterPicksMap: Record<number, any[]> = {};

        rostersData.forEach((r: any) => {
          rosterPicksMap[r.roster_id] = [];
          draftYears.forEach(season => {
            const seasonStr = season.toString();
            for (let round = 1; round <= 3; round++) {
              rosterPicksMap[r.roster_id].push({
                id: `pick_${r.roster_id}_${seasonStr}_${round}`,
                name: `${seasonStr} Round ${round} (${rosterIdToOwnerName[r.roster_id] || `Team ${r.roster_id}`})`,
                pos: 'PICK',
                team: 'DRAFT',
                season: seasonStr,
                round: round,
                originalOwnerId: r.roster_id,
                originalOwnerName: rosterIdToOwnerName[r.roster_id] || `Team ${r.roster_id}`,
                value: getDraftPickValue(seasonStr, round),
                type: 'PICK'
              });
            }
          });
        });

        if (Array.isArray(tradedPicksData)) {
          tradedPicksData.forEach((tp: any) => {
            const season = tp.season;
            if (parseInt(season, 10) <= currentYearNum) return;

            const round = tp.round;
            const originalOwnerId = tp.roster_id;
            const currentOwnerId = tp.owner_id;

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

            if (!extractedPick) {
              extractedPick = {
                id: `pick_${originalOwnerId}_${season}_${round}_traded`,
                name: `${season} Round ${round} (${rosterIdToOwnerName[originalOwnerId] || `Team ${originalOwnerId}`})`,
                pos: 'PICK',
                team: 'DRAFT',
                season: season,
                round: round,
                originalOwnerId: originalOwnerId,
                originalOwnerName: rosterIdToOwnerName[originalOwnerId] || `Team ${originalOwnerId}`,
                value: getDraftPickValue(season, round),
                type: 'PICK'
              };
            }

            if (!rosterPicksMap[currentOwnerId]) {
              rosterPicksMap[currentOwnerId] = [];
            }
            rosterPicksMap[currentOwnerId].push(extractedPick);
          });
        }

        const rMap: Record<string, { players: any[], picks: any[] }> = {};
        if (Array.isArray(rostersData)) {
          rostersData.forEach((r: any) => {
            const username = rosterIdToUsername[r.roster_id] || `team_${r.roster_id}`;
            const reserveIds = new Set(r.reserve || []);
            const taxiIds = new Set(r.taxi || []);

            const primaryPlayerIds = (r.players || []).filter((pid: string) => !reserveIds.has(pid) && !taxiIds.has(pid));

            const rosterPlayers = primaryPlayerIds
              .map((pid: string) => playerObjects[pid])
              .filter((p: any) => p && p.name.length > 2)
              .sort((a: any, b: any) => {
                const posOrder: Record<string, number> = { 'QB': 1, 'RB': 2, 'WR': 3, 'TE': 4, 'K': 5 };
                const orderDiff = (posOrder[a.pos] || 9) - (posOrder[b.pos] || 9);
                if (orderDiff !== 0) return orderDiff;
                return b.value - a.value;
              });

            const rawPicks = rosterPicksMap[r.roster_id] || [];
            const rosterPicks = rawPicks
              .filter(p => parseInt(p.season, 10) > currentYearNum)
              .sort((a, b) => {
                if (a.season !== b.season) return Number(a.season) - Number(b.season);
                return a.round - b.round;
              });

            rMap[username] = { players: rosterPlayers, picks: rosterPicks };
          });
        }
        setRosters(rMap);

        const allTeamNames = Object.keys(rMap);
        setAvailableTeams(allTeamNames);

        const savedTrade = sessionStorage.getItem('preloadedTrade');
        if (savedTrade) {
          try {
            const tradeData = JSON.parse(savedTrade);
            sessionStorage.removeItem('preloadedTrade');
            const team2Name = tradeData.targetTeam || allTeamNames.find(t => t !== currentUser) || allTeamNames[1];
            
            setParticipants([
              { id: 'part_1', teamName: currentUser, assets: tradeData.offered || [], searchQuery: '', isSearching: false },
              { id: 'part_2', teamName: team2Name, assets: tradeData.targetItems || [], searchQuery: '', isSearching: false }
            ]);
          } catch (e) {
            console.error("Failed to parse preloaded trade", e);
          }
        } else {
          const defaultTeam2 = allTeamNames.find(t => t !== currentUser) || allTeamNames[1] || currentUser;
          setParticipants([
            { id: 'part_1', teamName: currentUser || allTeamNames[0], assets: [], searchQuery: '', isSearching: false },
            { id: 'part_2', teamName: defaultTeam2, assets: [], searchQuery: '', isSearching: false }
          ]);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load trade data:", err);
        setIsLoading(false);
      }
    }

    loadLeagueData();

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setParticipants(prev => prev.map(p => ({ ...p, isSearching: false })));
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [currentUser]);

  const addParticipant = () => {
    const unselectedTeam = availableTeams.find(t => !participants.some(p => p.teamName === t)) || availableTeams[0] || 'Team';
    setParticipants([
      ...participants,
      { id: `part_${Date.now()}`, teamName: unselectedTeam, assets: [], searchQuery: '', isSearching: false }
    ]);
  };

  const removeParticipant = (id: string) => {
    if (participants.length <= 2) {
      alert("A trade requires at least 2 teams.");
      return;
    }
    setParticipants(participants.filter(p => p.id !== id));
  };

  const updateParticipantTeam = (id: string, newTeamName: string) => {
    setParticipants(participants.map(p => p.id === id ? { ...p, teamName: newTeamName, assets: [] } : p));
  };

  const addAssetToParticipant = (id: string, item: any) => {
    setParticipants(participants.map(p => {
      if (p.id === id) {
        return {
          ...p,
          assets: [...p.assets, item],
          searchQuery: '',
          isSearching: false
        };
      }
      return p;
    }));
  };

  const removeAssetFromParticipant = (id: string, assetIdx: number) => {
    setParticipants(participants.map(p => {
      if (p.id === id) {
        return {
          ...p,
          assets: p.assets.filter((_, idx) => idx !== assetIdx)
        };
      }
      return p;
    }));
  };

  const updateSearchQuery = (id: string, query: string) => {
    setParticipants(participants.map(p => p.id === id ? { ...p, searchQuery: query, isSearching: true } : p));
  };

  const getFilteredAssetsForParticipant = (participant: TradeParticipant) => {
    const teamData = rosters[participant.teamName] || { players: [], picks: [] };
    const lower = participant.searchQuery.toLowerCase();

    const sortedPlayers = [...teamData.players].sort((a, b) => {
      const posOrder: Record<string, number> = { 'QB': 1, 'RB': 2, 'WR': 3, 'TE': 4, 'K': 5 };
      const orderDiff = (posOrder[a.pos] || 9) - (posOrder[b.pos] || 9);
      if (orderDiff !== 0) return orderDiff;
      return b.value - a.value;
    });

    const sortedPicks = [...teamData.picks].sort((a, b) => {
      if (a.season !== b.season) return Number(a.season) - Number(b.season);
      return a.round - b.round;
    });

    const combined = [...sortedPlayers, ...sortedPicks];
    if (!lower.trim()) return combined;
    return combined.filter(item => item.name.toLowerCase().includes(lower));
  };

  const participantTotals = participants.map(p => ({
    ...p,
    totalVal: p.assets.reduce((sum, item) => sum + item.value, 0)
  }));

  const grandTotalValue = participantTotals.reduce((sum, p) => sum + p.totalVal, 0);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading multi-team trade calculator...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manager Sign In Required 🔐</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-md">
          Please sign in using your manager profile at the top right of the website to access the Trade Calculator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 relative" ref={containerRef}>
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-gray-200 dark:border-gray-800 pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dynasty Trade Calculator 🧮</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Multi-team trade evaluator supporting as many teams as you want to add.
          </p>
        </div>
        <button
          onClick={addParticipant}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          + Add Another Team 🤝
        </button>
      </div>

      {/* MULTI-TEAM VALUE OVERVIEW BANNER */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <span className="text-[10px] uppercase font-extrabold text-gray-400 dark:text-gray-500 tracking-wider">Multi-Team Trade Value Overview</span>
            <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">
              {grandTotalValue === 0 ? "Select assets across teams to evaluate trade" : `Total Deal Pool: ${grandTotalValue.toLocaleString()} pts`}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3 bg-gray-50 dark:bg-gray-800/60 px-5 py-3 rounded-xl border border-gray-100 dark:border-gray-800">
            {participantTotals.map((p, idx) => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-indigo-500 block truncate max-w-[100px]">{p.teamName}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{p.totalVal.toLocaleString()}</span>
                </div>
                {idx < participantTotals.length - 1 && <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DYNAMIC COLUMNS GRID FOR ALL PARTICIPATING TEAMS */}
      <div className={`grid grid-cols-1 ${participants.length === 2 ? 'lg:grid-cols-2' : participants.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2 xl:grid-cols-4'} gap-6`}>
        {participants.map((participant) => {
          const filteredAssets = getFilteredAssetsForParticipant(participant);

          return (
            <div key={participant.id} className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 relative flex flex-col justify-between">
              
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
                    <select
                      value={participant.teamName}
                      onChange={(e) => updateParticipantTeam(participant.id, e.target.value)}
                      className="text-sm font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      {availableTeams.map((t, idx) => (
                        <option key={idx} value={t} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">{t}</option>
                      ))}
                    </select>
                  </div>

                  {participants.length > 2 && (
                    <button
                      onClick={() => removeParticipant(participant.id)}
                      className="text-gray-400 hover:text-red-500 font-bold text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800"
                      title="Remove Team"
                    >
                      Remove ✕
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input 
                    type="text" 
                    placeholder={`Search ${participant.teamName}'s roster/picks...`}
                    value={participant.searchQuery}
                    onChange={(e) => updateSearchQuery(participant.id, e.target.value)}
                    onFocus={() => {
                      setParticipants(participants.map(p => p.id === participant.id ? { ...p, isSearching: true } : p));
                    }}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                  {participant.isSearching && (
                    <ul className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredAssets.length === 0 ? (
                        <li className="px-4 py-3 text-xs text-gray-400 text-center">No matching players or picks found.</li>
                      ) : (
                        filteredAssets.map(item => (
                          <li 
                            key={item.id}
                            onClick={() => addAssetToParticipant(participant.id, item)}
                            className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center text-sm"
                          >
                            <div className="flex items-center gap-3">
                              {item.type === 'PLAYER' ? (
                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                                  <img 
                                    src={item.photoUrl} 
                                    onError={(e: any) => { e.target.src = 'https://sleepercdn.com/images/v2/icons/player_default.webp'; }}
                                    className="w-full h-full object-cover" 
                                    alt={item.name}
                                  />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">PK</div>
                              )}
                              <div>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mr-2 ${item.pos === 'PICK' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'}`}>{item.pos}</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{item.name}</span>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Val: {item.value}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>

                <div className="space-y-2 pt-2 min-h-[140px]">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Assets Selected ({participant.assets.length})</span>
                  {participant.assets.length === 0 ? (
                    <div className="p-6 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 text-center text-sm text-gray-400">
                      No players or picks added yet.
                    </div>
                  ) : (
                    <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {participant.assets.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/80 px-3 py-2 rounded-lg text-sm">
                          <div className="flex items-center gap-2.5 truncate pr-2">
                            {item.type === 'PLAYER' ? (
                              <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                                <img 
                                  src={item.photoUrl} 
                                  onError={(e: any) => { e.target.src = 'https://sleepercdn.com/images/v2/icons/player_default.webp'; }}
                                  className="w-full h-full object-cover" 
                                  alt={item.name}
                                />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">PK</div>
                            )}
                            <div className="truncate">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mr-1.5 ${item.pos === 'PICK' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'}`}>{item.pos}</span>
                              <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">{item.name}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">{item.value}</span>
                            <button onClick={() => removeAssetFromParticipant(participant.id, idx)} className="text-gray-400 hover:text-red-500 font-bold">×</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-xs font-bold">
                <span className="text-gray-400">Team Valuation Subtotal:</span>
                <span className="text-indigo-600 dark:text-indigo-400 text-sm font-black">{participantTotals.find(p => p.id === participant.id)?.totalVal.toLocaleString()} pts</span>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}