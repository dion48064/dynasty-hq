"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';

const SLEEPER_LEAGUE_ID = "1312122584644476928";

export default function TradeFinder() {
  const { currentUser } = useAuth();
  const [marketAssets, setMarketAssets] = useState<any[]>([]);
  const [myRosterPlayers, setMyRosterPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [offeredAssets, setOfferedAssets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Filters
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>(['QB', 'RB', 'WR', 'TE', 'PICK']);
  const [returnCount, setReturnCount] = useState<number>(1);
  const [teamGoal, setTeamGoal] = useState<'CONTENDING' | 'REBUILDING' | 'FENCE'>('CONTENDING');
  
  const [searchExecuted, setSearchExecuted] = useState(false);
  const [tradeResults, setTradeResults] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [nflRes, ddRes, rostersRes, usersRes] = await Promise.all([
          fetch('https://api.sleeper.app/v1/players/nfl'),
          fetch('https://www.dynastydealer.com/api/player-values'),
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/rosters`).catch(() => null),
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/users`).catch(() => null)
        ]);

        const nflData = await nflRes.json();
        const ddData = await ddRes.json();
        const rostersData = rostersRes ? await rostersRes.json() : [];
        const usersData = usersRes ? await usersRes.json() : [];

        const userMap: Record<string, string> = {};
        if (Array.isArray(usersData)) {
          usersData.forEach((u: any) => {
            const username = u.username || u.display_name?.toLowerCase();
            if (username) userMap[u.user_id] = username;
          });
        }

        const rosterUsernameMap: Record<number, string> = {};
        const playerOwnerMap: Record<string, number> = {};
        let loggedInRosterId: number | null = null;
        
        if (Array.isArray(rostersData)) {
          rostersData.forEach((r: any) => {
            const ownerUsername = userMap[r.owner_id] || `team_${r.roster_id}`;
            rosterUsernameMap[r.roster_id] = ownerUsername;

            if (currentUser && ownerUsername === currentUser) {
              loggedInRosterId = r.roster_id;
            }

            if (r.players) {
              r.players.forEach((pid: string) => {
                playerOwnerMap[pid] = r.roster_id;
              });
            }
          });
        }

        const vals: Record<string, number> = {};
        if (ddData && ddData.players) {
          ddData.players.forEach((p: any) => {
            if (p.sleeper_id) vals[p.sleeper_id] = p.current_value;
          });
        }

        const playerList = Object.entries(nflData).map(([id, p]: [string, any]) => {
          const rosterId = playerOwnerMap[id] || null;
          return {
            id,
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            pos: p.position || 'UNK',
            team: p.team || 'FA',
            value: vals[id] || 1500,
            photoUrl: `https://sleepercdn.com/content/nfl/players/${id}.jpg`,
            type: 'PLAYER',
            rosterId: rosterId,
            teamName: rosterId ? rosterUsernameMap[rosterId] : 'Free Agent',
            age: p.age || 25
          };
        }).filter(p => p.name.length > 2 && ['QB', 'RB', 'WR', 'TE'].includes(p.pos));

        setMarketAssets(playerList);

        if (loggedInRosterId !== null) {
          const mine = playerList
            .filter(p => p.rosterId === loggedInRosterId)
            .sort((a, b) => {
              const posOrder: Record<string, number> = { 'QB': 1, 'RB': 2, 'WR': 3, 'TE': 4 };
              const orderDiff = (posOrder[a.pos] || 9) - (posOrder[b.pos] || 9);
              if (orderDiff !== 0) return orderDiff;
              return b.value - a.value;
            });
          setMyRosterPlayers(mine);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load finder market:", err);
        setIsLoading(false);
      }
    }
    loadData();

    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearching(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [currentUser]);

  const searchResults = myRosterPlayers.filter(item => {
    return item.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const addOfferedAsset = (item: any) => {
    setOfferedAssets([...offeredAssets, item]);
    setSearchQuery('');
    setIsSearching(false);
  };

  const removeOfferedAsset = (index: number) => {
    setOfferedAssets(offeredAssets.filter((_, i) => i !== index));
  };

  const toggleCriterion = (criterion: string) => {
    if (selectedCriteria.includes(criterion)) {
      if (selectedCriteria.length > 1) {
        setSelectedCriteria(selectedCriteria.filter(c => c !== criterion));
      }
    } else {
      setSelectedCriteria([...selectedCriteria, criterion]);
    }
  };

  const totalOfferedValue = offeredAssets.reduce((sum, item) => sum + item.value, 0);

  const executeSearch = () => {
    if (offeredAssets.length === 0) return;
    setSearchExecuted(true);

    const validPool = marketAssets.filter(asset => {
      if (asset.teamName === currentUser) return false;
      if (asset.type === 'PICK') return selectedCriteria.includes('PICK');
      return selectedCriteria.includes(asset.pos);
    });

    const rosterMap: Record<string, any[]> = {};

    validPool.forEach(asset => {
      if (asset.teamName && asset.teamName !== currentUser) {
        if (!rosterMap[asset.teamName]) rosterMap[asset.teamName] = [];
        rosterMap[asset.teamName].push(asset);
      }
    });

    const results: any[] = [];
    const valueWindow = totalOfferedValue * 0.45;

    const getStrategyScore = (items: any[]) => {
      let score = 0;
      items.forEach(item => {
        if (teamGoal === 'REBUILDING') {
          if (item.type === 'PICK') score += 300;
          if (item.age && item.age <= 24) score += 200;
        } else if (teamGoal === 'CONTENDING') {
          score += item.value * 0.1;
        }
      });
      return score;
    };

    if (returnCount === 1) {
      validPool.forEach(asset => {
        const diff = Math.abs(asset.value - totalOfferedValue);
        if (diff <= totalOfferedValue * 0.35) {
          results.push({
            type: 'SINGLE TARGET',
            teamName: asset.teamName,
            items: [asset],
            totalVal: asset.value,
            diff: asset.value - totalOfferedValue,
            score: getStrategyScore([asset])
          });
        }
      });
    } else if (returnCount === 2) {
      Object.entries(rosterMap).forEach(([teamName, teamPlayers]) => {
        for (let i = 0; i < teamPlayers.length; i++) {
          for (let j = i + 1; j < teamPlayers.length; j++) {
            const p1 = teamPlayers[i];
            const p2 = teamPlayers[j];
            const comboVal = p1.value + p2.value;
            if (Math.abs(comboVal - totalOfferedValue) <= valueWindow) {
              results.push({
                type: '2-PLAYER PACKAGE',
                teamName: teamName,
                items: [p1, p2],
                totalVal: comboVal,
                diff: comboVal - totalOfferedValue,
                score: getStrategyScore([p1, p2])
              });
            }
          }
        }
      });
    } else if (returnCount >= 3) {
      Object.entries(rosterMap).forEach(([teamName, teamPlayers]) => {
        if (teamPlayers.length >= 3) {
          for (let i = 0; i < teamPlayers.length; i++) {
            for (let j = i + 1; j < teamPlayers.length; j++) {
              for (let k = j + 1; k < teamPlayers.length; k++) {
                const p1 = teamPlayers[i];
                const p2 = teamPlayers[j];
                const p3 = teamPlayers[k];
                const comboVal = p1.value + p2.value + p3.value;
                if (Math.abs(comboVal - totalOfferedValue) <= valueWindow) {
                  results.push({
                    type: '3-PLAYER PACKAGE',
                    teamName: teamName,
                    items: [p1, p2, p3],
                    totalVal: comboVal,
                    diff: comboVal - totalOfferedValue,
                    score: getStrategyScore([p1, p2, p3])
                  });
                }
              }
            }
          }
        }
      });
    }

    results.sort((a, b) => (b.score - Math.abs(b.diff) * 0.5) - (a.score - Math.abs(b.diff) * 0.5));
    setTradeResults(results.slice(0, 12));
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading your roster and trade engine...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manager Sign In Required 🔐</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-md">
          Please sign in using your manager profile at the top right of the website to use the Trade Finder.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      
      {/* HEADER */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dynasty Trade Finder</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
          Logged in as <span className="font-bold text-indigo-600 dark:text-indigo-400">{currentUser}</span>. Select players from your roster to offer.
        </p>
      </div>

      {/* ADVANCED FILTER CONTROL PANEL */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* STEP 1: Package You Are Trading */}
          <div className="space-y-3 relative" ref={searchRef}>
            <label className="text-xs font-bold uppercase text-gray-400 tracking-wider block">1. Your Roster Assets to Trade</label>
            <input 
              type="text"
              placeholder="Search your players... (Click to view all)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearching(true);
              }}
              onFocus={() => setIsSearching(true)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            {isSearching && (
              <ul className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                {searchResults.length === 0 ? (
                  <li className="px-4 py-3 text-xs text-gray-400 text-center">No players found on your roster.</li>
                ) : (
                  searchResults.map(item => (
                    <li 
                      key={item.id}
                      onClick={() => addOfferedAsset(item)}
                      className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between items-center text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">{item.pos}</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{item.name}</span>
                        <span className="text-[10px] text-gray-400">({item.age} yrs)</span>
                      </div>
                      <span className="text-xs font-bold text-indigo-600">Val: {item.value}</span>
                    </li>
                  ))
                )}
              </ul>
            )}

            {/* Selected Offering Chips */}
            <div className="min-h-[80px] p-3 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 space-y-1.5">
              {offeredAssets.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">No assets added from your roster yet.</p>
              ) : (
                offeredAssets.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white dark:bg-gray-900 px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-xs">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{item.name} <span className="text-gray-400 text-[10px]">({item.age}y)</span> <span className="text-indigo-600 font-bold">({item.value})</span></span>
                    <button onClick={() => removeOfferedAsset(idx)} className="text-gray-400 hover:text-red-500 font-bold">×</button>
                  </div>
                ))
              )}
            </div>
            <div className="text-right text-xs font-bold text-gray-500">
              Total Package Value: <span className="text-indigo-600 dark:text-indigo-400 text-sm">{totalOfferedValue}</span>
            </div>
          </div>

          {/* STEP 2: Target Criteria */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase text-gray-400 tracking-wider block">2. Target Assets (Positions & Picks)</label>
            <div className="grid grid-cols-3 gap-2">
              {['QB', 'RB', 'WR', 'TE', 'PICK'].map(crit => {
                const isSelected = selectedCriteria.includes(crit);
                return (
                  <button
                    key={crit}
                    onClick={() => toggleCriterion(crit)}
                    className={`py-3 text-xs font-bold rounded-lg border transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}
                  >
                    {crit} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 3: Return Count & Goal */}
          <div className="space-y-3 lg:col-span-2 flex flex-col justify-between">
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase text-gray-400 tracking-wider block">3. Assets to Get Back</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '1 Asset', val: 1 },
                  { label: '2 Assets', val: 2 },
                  { label: '3 Assets', val: 3 },
                ].map(count => (
                  <button
                    key={count.val}
                    onClick={() => setReturnCount(count.val)}
                    className={`py-3 text-xs font-bold rounded-lg border transition-all ${returnCount === count.val ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}
                  >
                    {count.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-3">
              <label className="text-xs font-bold uppercase text-gray-400 tracking-wider block">4. Team Posture / Goal</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '🏆 Contending', val: 'CONTENDING' },
                  { label: '🌱 Rebuilding', val: 'REBUILDING' },
                  { label: '⚖️ Balanced', val: 'FENCE' },
                ].map(goal => (
                  <button
                    key={goal.val}
                    onClick={() => setTeamGoal(goal.val as any)}
                    className={`py-2.5 px-2 text-[11px] font-bold rounded-lg border transition-all text-center ${teamGoal === goal.val ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}
                  >
                    {goal.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={executeSearch}
                disabled={offeredAssets.length === 0}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-amber-500 text-white font-bold rounded-xl shadow-md hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Find Matching Deals 🔍
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* RESULTS AREA */}
      {searchExecuted && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex justify-between items-center">
            <span>Generated Trade Proposals</span>
            <span className="text-xs font-normal text-gray-400">Found {tradeResults.length} league-verified matches</span>
          </h2>

          {tradeResults.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-10 border border-gray-200 dark:border-gray-800 text-center text-gray-400">
              No matching trades found on rival rosters matching these parameters. Try broadening your criteria or offering package!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tradeResults.map((proposal, idx) => {
                const diffText = proposal.diff >= 0 ? `+${proposal.diff} (You win)` : `${proposal.diff} (They win)`;
                const diffColor = proposal.diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400';

                return (
                  <div key={idx} className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                          {proposal.type}
                        </span>
                        <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 truncate max-w-[140px]" title={proposal.teamName}>
                          {proposal.teamName}
                        </span>
                      </div>
                      
                      <div className="space-y-2 pt-1">
                        {proposal.items.map((target: any, tIdx: number) => (
                          <div key={tIdx} className="flex items-center gap-3">
                            {target.type === 'PLAYER' ? (
                              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700">
                                <img 
                                  src={target.photoUrl} 
                                  onError={(e: any) => { e.target.src = 'https://sleepercdn.com/images/v2/icons/player_default.webp'; }}
                                  className="w-full h-full object-cover" 
                                  alt={target.name}
                                />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">PK</div>
                            )}
                            <div className="overflow-hidden">
                              <h3 className="font-bold text-gray-900 dark:text-white text-xs truncate">{target.name}</h3>
                              <span className="text-[10px] text-gray-400">
                                {target.pos} {target.type === 'PLAYER' ? `- ${target.team}` : ''} {target.age ? `(${target.age} yrs)` : ''} (Val: {target.value})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-gray-400 block text-[10px]">Target Value</span>
                        <span className="font-bold text-gray-900 dark:text-white">{proposal.totalVal}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-400 block text-[10px]">Value Diff</span>
                        <span className={`font-bold ${diffColor}`}>{diffText}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}