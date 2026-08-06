"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';

const SLEEPER_LEAGUE_ID = "1312122584644476928";

const generate2026Picks = () => {
  const picks = [];
  const baseRoundValues = [6500, 3200, 1600];
  
  for (let round = 1; round <= 3; round++) {
    for (let slot = 1; slot <= 12; slot++) {
      const slotStr = slot < 10 ? `0${slot}` : `${slot}`;
      const pickName = `2026 ${round}.${slotStr}`;
      const dropOff = (slot - 1) * (round === 1 ? 220 : round === 2 ? 110 : 60);
      const value = Math.max(500, baseRoundValues[round - 1] - dropOff);
      
      picks.push({
        id: `p_2026_${round}_${slot}`,
        name: pickName,
        pos: 'PICK',
        team: 'DRAFT',
        value: value,
        type: 'PICK'
      });
    }
  }
  return picks;
};

const FUTURE_PICKS = [
  { id: 'p_2027_1', name: '2027 Round 1', pos: 'PICK', team: 'DRAFT', value: 5700, type: 'PICK' },
  { id: 'p_2027_2', name: '2027 Round 2', pos: 'PICK', team: 'DRAFT', value: 3200, type: 'PICK' },
  { id: 'p_2027_3', name: '2027 Round 3', pos: 'PICK', team: 'DRAFT', value: 1600, type: 'PICK' },
  { id: 'p_2028_1', name: '2028 Round 1', pos: 'PICK', team: 'DRAFT', value: 4500, type: 'PICK' },
  { id: 'p_2028_2', name: '2028 Round 2', pos: 'PICK', team: 'DRAFT', value: 2200, type: 'PICK' },
  { id: 'p_2028_3', name: '2028 Round 3', pos: 'PICK', team: 'DRAFT', value: 1000, type: 'PICK' },
];

const ALL_GENERATED_PICKS = [...generate2026Picks(), ...FUTURE_PICKS];

export default function TradeCalculator() {
  const { users, currentUser } = useAuth();
  
  const [rosters, setRosters] = useState<Record<string, any[]>>({});
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Trade Setup State:
  const [team1Assets, setTeam1Assets] = useState<any[]>([]);
  const [search1, setSearch1] = useState('');
  const [isSearching1, setIsSearching1] = useState(false);

  const [targetTeam, setTargetTeam] = useState<string>('');
  const [team2Assets, setTeam2Assets] = useState<any[]>([]);
  const [search2, setSearch2] = useState('');
  const [isSearching2, setIsSearching2] = useState(false);

  // Manual Pick Modal State
  const [showPickModal, setShowPickModal] = useState(false);
  const [pickModalSide, setPickModalSide] = useState<1 | 2>(1);
  const [selectedPickYear, setSelectedPickYear] = useState('2026');
  const [selectedPickRound, setSelectedPickRound] = useState('1');
  const [selectedPickSlot, setSelectedPickSlot] = useState('1');

  const searchRef1 = useRef<HTMLDivElement>(null);
  const searchRef2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadLeagueData() {
      try {
        const [usersRes, rostersRes, nflRes, ddRes] = await Promise.all([
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/users`),
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/rosters`),
          fetch('https://api.sleeper.app/v1/players/nfl'),
          fetch('https://www.dynastydealer.com/api/player-values')
        ]);

        const usersData = await usersRes.json();
        const rostersData = await rostersRes.json();
        const nflData = await nflRes.json();
        const ddData = await ddRes.json();

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
            value: vals[id] || 1500,
            photoUrl,
            type: 'PLAYER'
          };
        });

        const uMap: Record<string, string> = {};
        if (Array.isArray(usersData)) {
          usersData.forEach((u: any) => {
            const username = u.username || u.display_name?.toLowerCase();
            if (username) uMap[u.user_id] = username;
          });
        }
        setUsersMap(uMap);

        const rMap: Record<string, any[]> = {};
        if (Array.isArray(rostersData)) {
          rostersData.forEach((r: any) => {
            const username = uMap[r.owner_id] || `team_${r.roster_id}`;
            const rosterPlayers = (r.players || [])
              .map((pid: string) => playerObjects[pid])
              .filter((p: any) => p && p.name.length > 2 && ['QB', 'RB', 'WR', 'TE'].includes(p.pos))
              .sort((a: any, b: any) => {
                const posOrder: Record<string, number> = { 'QB': 1, 'RB': 2, 'WR': 3, 'TE': 4 };
                const orderDiff = (posOrder[a.pos] || 9) - (posOrder[b.pos] || 9);
                if (orderDiff !== 0) return orderDiff;
                return b.value - a.value;
              });

            rMap[username] = rosterPlayers;
          });
        }
        setRosters(rMap);

        const availableUsers = Object.keys(rMap).filter(u => u !== currentUser);
        if (availableUsers.length > 0) {
          setTargetTeam(availableUsers[0]);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load trade data:", err);
        setIsLoading(false);
      }
    }

    loadLeagueData();

    function handleClickOutside(event: MouseEvent) {
      if (searchRef1.current && !searchRef1.current.contains(event.target as Node)) {
        setIsSearching1(false);
      }
      if (searchRef2.current && !searchRef2.current.contains(event.target as Node)) {
        setIsSearching2(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [currentUser]);

  useEffect(() => {
    const availableUsers = Object.keys(rosters).filter(u => u !== currentUser);
    if (availableUsers.length > 0 && (!targetTeam || targetTeam === currentUser)) {
      setTargetTeam(availableUsers[0]);
    }
    setTeam1Assets([]);
    setTeam2Assets([]);
  }, [currentUser, rosters]);

  const currentUserRoster = rosters[currentUser] || [];
  const targetTeamRoster = rosters[targetTeam] || [];

  const getFilteredAssets = (query: string, rosterSource: any[]) => {
    const lower = query.toLowerCase();
    const source = [...rosterSource, ...ALL_GENERATED_PICKS];
    
    const sortedSource = source.sort((a, b) => {
      const posOrder: Record<string, number> = { 'QB': 1, 'RB': 2, 'WR': 3, 'TE': 4, 'PICK': 5 };
      const orderDiff = (posOrder[a.pos] || 9) - (posOrder[b.pos] || 9);
      if (orderDiff !== 0) return orderDiff;
      return b.value - a.value;
    });

    if (!query.trim()) return sortedSource;

    return sortedSource.filter(p => p.name.toLowerCase().includes(lower));
  };

  const filteredPlayers1 = getFilteredAssets(search1, currentUserRoster);
  const filteredPlayers2 = getFilteredAssets(search2, targetTeamRoster);

  const addAsset = (side: 1 | 2, item: any) => {
    if (side === 1) {
      setTeam1Assets([...team1Assets, item]);
      setSearch1('');
      setIsSearching1(false);
    } else {
      setTeam2Assets([...team2Assets, item]);
      setSearch2('');
      setIsSearching2(false);
    }
  };

  const removeAsset = (side: 1 | 2, index: number) => {
    if (side === 1) {
      setTeam1Assets(team1Assets.filter((_, i) => i !== index));
    } else {
      setTeam2Assets(team2Assets.filter((_, i) => i !== index));
    }
  };

  const handleAddManualPick = (e: React.FormEvent) => {
    e.preventDefault();
    const pickName = `${selectedPickYear} ${selectedPickRound}.${selectedPickSlot.padStart(2, '0')}`;
    
    const baseRoundValues = [6500, 3200, 1600];
    const rIdx = parseInt(selectedPickRound) - 1;
    const slotNum = parseInt(selectedPickSlot);
    const dropOff = (slotNum - 1) * (rIdx === 0 ? 220 : rIdx === 1 ? 110 : 60);
    const val = Math.max(500, (baseRoundValues[rIdx] || 1500) - dropOff);

    const newPick = {
      id: `manual_${Date.now()}`,
      name: pickName,
      pos: 'PICK',
      team: 'DRAFT',
      value: val,
      type: 'PICK'
    };

    if (pickModalSide === 1) {
      setTeam1Assets([...team1Assets, newPick]);
    } else {
      setTeam2Assets([...team2Assets, newPick]);
    }

    setShowPickModal(false);
  };

  const team2Total = team1Assets.reduce((sum, item) => sum + item.value, 0);
  const team1Total = team2Assets.reduce((sum, item) => sum + item.value, 0);
  
  const totalValue = team1Total + team2Total;
  let team1Percent = 50;
  let team2Percent = 50;
  
  if (totalValue > 0) {
    team1Percent = Math.round((team1Total / totalValue) * 100);
    team2Percent = 100 - team1Percent;
  }

  const isEvenTrade = team1Assets.length > 0 && team2Assets.length > 0 && team1Percent >= 48 && team1Percent <= 52;

  let tradeVerdict = "⚖️ Perfectly Even Trade";
  let verdictColor = "text-gray-700 dark:text-gray-300";

  if (team1Assets.length === 0 && team2Assets.length === 0) {
    tradeVerdict = "Select assets to evaluate trade";
    verdictColor = "text-gray-400 dark:text-gray-500";
  } else if (isEvenTrade) {
    tradeVerdict = "🤝 Fair & Even Trade";
    verdictColor = "text-emerald-600 dark:text-emerald-400";
  } else if (team1Total > team2Total) {
    tradeVerdict = `🔥 ${currentUser} Wins Value`;
    verdictColor = "text-indigo-600 dark:text-indigo-400";
  } else if (team2Total > team1Total) {
    tradeVerdict = `🔥 ${targetTeam} Wins Value`;
    verdictColor = "text-amber-600 dark:text-amber-400";
  }

  const valueDifference = Math.abs(team1Total - team2Total);
  
  const suggestedTeamName = team1Total > team2Total ? currentUser : targetTeam;
  const rosterToSuggestFrom = team1Total > team2Total ? currentUserRoster : targetTeamRoster;

  let recommendedAssets: any[] = [];
  if (!isEvenTrade && (team1Assets.length > 0 || team2Assets.length > 0) && valueDifference > 0) {
    const addedIds = new Set([...team1Assets, ...team2Assets].map(a => a.id));
    const pool = [...rosterToSuggestFrom, ...ALL_GENERATED_PICKS].filter(p => !addedIds.has(p.id));

    if (pool.length > 0) {
      const sortedByClosest = [...pool].sort((a, b) => {
        const diffA = Math.abs(a.value - valueDifference);
        const diffB = Math.abs(b.value - valueDifference);
        return diffA - diffB;
      });
      recommendedAssets = sortedByClosest.slice(0, 3);
    }
  }

  const handleAddSuggestion = (asset: any) => {
    if (suggestedTeamName === currentUser) {
      addAsset(1, asset);
    } else {
      addAsset(2, asset);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading league rosters & market data...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manager Sign In Required 🔐</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-md">
          Please sign in using your manager profile at the top right of the website to access your roster in the Trade Calculator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 relative">
      
      {/* MANUAL PICK MODAL */}
      {showPickModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Add Draft Pick Manually ({pickModalSide === 1 ? currentUser : targetTeam}) 🏈</h3>
            
            <form onSubmit={handleAddManualPick} className="space-y-4 pt-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Year</label>
                  <select
                    value={selectedPickYear}
                    onChange={(e) => setSelectedPickYear(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                  >
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                    <option value="2028">2028</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Round</label>
                  <select
                    value={selectedPickRound}
                    onChange={(e) => setSelectedPickRound(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                  >
                    <option value="1">Rd 1</option>
                    <option value="2">Rd 2</option>
                    <option value="3">Rd 3</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Slot</label>
                  <select
                    value={selectedPickSlot}
                    onChange={(e) => setSelectedPickSlot(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i+1} value={i+1}>{i+1}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  Add Pick ✓
                </button>
                <button
                  type="button"
                  onClick={() => setShowPickModal(false)}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-gray-200 dark:border-gray-800 pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dynasty Trade Calculator 🧮</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Building trades directly from your roster ({currentUser}) against league opponents.
          </p>
        </div>
      </div>

      {/* DYNAMIC VERDICT & SLIDING SCALE BANNER */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <span className="text-[10px] uppercase font-extrabold text-gray-400 dark:text-gray-500 tracking-wider">Evaluation Verdict</span>
            <p className={`text-xl font-black ${verdictColor} mt-0.5`}>{tradeVerdict}</p>
          </div>
          
          <div className="flex items-center gap-6 bg-gray-50 dark:bg-gray-800/60 px-5 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-indigo-500 block">{currentUser} Receives</span>
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{team1Total.toLocaleString()}</span>
            </div>
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-amber-500 block">{targetTeam} Receives</span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{team2Total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* SLIDING TRADE SCALE BAR */}
        <div className="space-y-3 pt-2">
          <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
            <span className="text-indigo-600 dark:text-indigo-400">{currentUser} ({team1Percent}%)</span>
            <span className="text-emerald-600 dark:text-emerald-400">⚖️ Fair Zone (48% - 52%)</span>
            <span className="text-amber-600 dark:text-amber-400">{targetTeam} ({team2Percent}%)</span>
          </div>
          
          <div className="relative">
            <div className="absolute -top-2 -bottom-2 left-[48%] right-[48%] bg-emerald-500/15 dark:bg-emerald-400/20 border-x-2 border-emerald-500 dark:border-emerald-400 z-10 pointer-events-none rounded-sm"></div>

            <div className="h-6 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex p-1 shadow-inner border border-gray-200 dark:border-gray-700 relative">
              <div 
                style={{ width: `${team1Percent}%` }} 
                className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 rounded-l-full transition-all duration-700 ease-in-out"
              ></div>
              <div 
                style={{ width: `${team2Percent}%` }} 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-r-full transition-all duration-700 ease-in-out"
              ></div>
            </div>
          </div>
        </div>

        {/* CONDITIONAL VALUE GAP & RECOMMENDATIONS */}
        {!isEvenTrade && (team1Assets.length > 0 || team2Assets.length > 0) && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3 bg-gray-50/75 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-200/60 dark:border-gray-800">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
              <div className="space-y-0.5 text-center sm:text-left">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-gray-400 block">Value Discrepancy</span>
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  <span className={team1Total > team2Total ? "text-indigo-600 dark:text-indigo-400" : "text-amber-600 dark:text-amber-400"}>
                    {team1Total > team2Total ? currentUser : targetTeam}
                  </span> is favored by <span className="underline">{valueDifference.toLocaleString()} points</span>.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                💡 Click an asset from <strong className={suggestedTeamName === currentUser ? "text-indigo-600" : "text-amber-600"}>{suggestedTeamName}'s</strong> roster to add it:
              </span>
            </div>

            {recommendedAssets.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {recommendedAssets.map((asset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAddSuggestion(asset)}
                    className="bg-white dark:bg-gray-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xs flex items-center justify-between transition-all cursor-pointer group text-left"
                    title={`Click to add ${asset.name} to trade`}
                  >
                    <div className="truncate pr-2">
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 mr-1 text-gray-600 dark:text-gray-300">{asset.pos}</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{asset.name}</span>
                    </div>
                    <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0">+{asset.value} val</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* CALCULATOR INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Team 1 Side */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 relative">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-base font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span> Players You Give ({currentUser})
            </h2>
            <span className="text-xs font-bold text-gray-400">{currentUserRoster.length} players available</span>
          </div>
          
          <div className="relative" ref={searchRef1}>
            <input 
              type="text" 
              placeholder={`Search your roster or picks... (Click to view all)`}
              value={search1}
              onChange={(e) => {
                setSearch1(e.target.value);
                setIsSearching1(true);
              }}
              onFocus={() => setIsSearching1(true)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            {isSearching1 && (
              <ul className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                {filteredPlayers1.length === 0 ? (
                  <li className="px-4 py-3 text-xs text-gray-400 text-center">No matching players or picks found.</li>
                ) : (
                  filteredPlayers1.map(item => (
                    <li 
                      key={item.id}
                      onClick={() => addAsset(1, item)}
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
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">PK</div>
                        )}
                        <div>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded mr-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">{item.pos}</span>
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

          <div className="pt-1">
            <button
              onClick={() => {
                setPickModalSide(1);
                setShowPickModal(true);
              }}
              className="w-full py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-900 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 transition-all flex items-center justify-center gap-1.5"
            >
              + Manually Add Draft Pick 🎯
            </button>
          </div>

          <div className="space-y-2 pt-2 min-h-[140px]">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Assets Selected</span>
            {team1Assets.length === 0 ? (
              <div className="p-6 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 text-center text-sm text-gray-400">
                No players or picks added yet.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {team1Assets.map((item, idx) => (
                  <li key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/80 px-3 py-2 rounded-lg text-sm">
                    <div className="flex items-center gap-2.5">
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
                        <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">PK</div>
                      )}
                      <div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded mr-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">{item.pos}</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{item.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">{item.value}</span>
                      <button onClick={() => removeAsset(1, idx)} className="text-gray-400 hover:text-red-500 font-bold">×</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Team 2 Side */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-gray-100 dark:border-gray-800 gap-2">
            <h2 className="text-base font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Players You Receive
            </h2>
            
            <select
              value={targetTeam}
              onChange={(e) => {
                setTargetTeam(e.target.value);
                setTeam2Assets([]);
              }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
            >
              {Object.keys(rosters).filter(t => t !== currentUser).map((t, idx) => (
                <option key={idx} value={t}>{t}</option>
              ))}
            </select>
          </div>
          
          <div className="relative" ref={searchRef2}>
            <input 
              type="text" 
              placeholder={`Search ${targetTeam}'s roster or picks... (Click to view all)`}
              value={search2}
              onChange={(e) => {
                setSearch2(e.target.value);
                setIsSearching2(true);
              }}
              onFocus={() => setIsSearching2(true)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {isSearching2 && (
              <ul className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                {filteredPlayers2.length === 0 ? (
                  <li className="px-4 py-3 text-xs text-gray-400 text-center">No matching players or picks found.</li>
                ) : (
                  filteredPlayers2.map(item => (
                    <li 
                      key={item.id}
                      onClick={() => addAsset(2, item)}
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
                          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">PK</div>
                        )}
                        <div>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded mr-2 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">{item.pos}</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{item.name}</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Val: {item.value}</span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          <div className="pt-1">
            <button
              onClick={() => {
                setPickModalSide(2);
                setShowPickModal(true);
              }}
              className="w-full py-2 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-900 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-300 transition-all flex items-center justify-center gap-1.5"
            >
              + Manually Add Draft Pick 🎯
            </button>
          </div>

          <div className="space-y-2 pt-2 min-h-[140px]">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Assets Selected</span>
            {team2Assets.length === 0 ? (
              <div className="p-6 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 text-center text-sm text-gray-400">
                No players or picks added yet.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {team2Assets.map((item, idx) => (
                  <li key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/80 px-3 py-2 rounded-lg text-sm">
                    <div className="flex items-center gap-2.5">
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
                        <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">PK</div>
                      )}
                      <div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded mr-2 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">{item.pos}</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{item.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-amber-600 dark:text-amber-400 text-xs">{item.value}</span>
                      <button onClick={() => removeAsset(2, idx)} className="text-gray-400 hover:text-red-500 font-bold">×</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}