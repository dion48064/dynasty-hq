"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
}

const COMMISSIONER_USER = "dionvanboekel";

export default function LeagueHome() {
  const leagueId = "1312122584644476928"; 
  const { currentUser } = useAuth();
  
  const [leagueData, setLeagueData] = useState<any>(null);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Announcements state from JSONBin cloud database
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isAddingAnnouncement, setIsAddingAnnouncement] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser === COMMISSIONER_USER;

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // 1. Fetch cloud database announcements
        const dbRes = await fetch('/api/league-data');
        if (dbRes.ok) {
          const dbData = await dbRes.json();
          if (dbData && dbData.announcements) {
            setAnnouncements(dbData.announcements);
          }
        }

        // 2. Fetch Sleeper Data
        const [leagueRes, usersRes, rostersRes] = await Promise.all([
          fetch(`https://api.sleeper.app/v1/league/${leagueId}`),
          fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`),
          fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`)
        ]);

        const league = await leagueRes.json();
        const users = await usersRes.json();
        const rosters = await rostersRes.json();
        const previousLeagueId = league.previous_league_id; 
        setLeagueData(league);

        const teamMap: Record<number, any> = {};
        let teams = rosters.map((roster: any) => {
          const user = users.find((u: any) => u.user_id === roster.owner_id);
          const username = user?.username || user?.display_name?.toLowerCase();
          const teamInfo = {
            rosterId: roster.roster_id,
            username: username,
            owner: user?.metadata?.team_name || user?.display_name || 'Unknown',
            avatar: user?.avatar,
            wins: roster.settings.wins,
            losses: roster.settings.losses,
            ties: roster.settings.ties,
            fpts: roster.settings.fpts + (roster.settings.fpts_decimal / 100),
            division: roster.settings.division || 1 
          };
          teamMap[roster.roster_id] = teamInfo;
          return teamInfo;
        });

        teams.sort((a: any, b: any) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            return b.fpts - a.fpts;
          });
        teams = teams.map((t: any, index: number) => ({ ...t, overallRank: index + 1 }));

        const divisionGroups: any = {};
        teams.forEach((t: any) => {
          if (!divisionGroups[t.division]) {
            divisionGroups[t.division] = {
              name: league.metadata ? league.metadata[`division_${t.division}`] || `Division ${t.division}` : `Division ${t.division}`,
              teams: []
            };
          }
          divisionGroups[t.division].teams.push(t);
        });
        Object.values(divisionGroups).forEach((div: any) => {
           div.teams.sort((a: any, b: any) => {
             if (b.wins !== a.wins) return b.wins - a.wins;
             return b.fpts - a.fpts;
           });
        });
        setDivisions(Object.values(divisionGroups));

        const nflRes = await fetch('https://api.sleeper.app/v1/players/nfl');
        const nflData = await nflRes.json();

        let allCompletedTrades: any[] = [];
        
        const currentYearTransRes = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/transactions/1`);
        const currentYearTrans = await currentYearTransRes.json();
        allCompletedTrades = [...allCompletedTrades, ...currentYearTrans.filter((t: any) => t.type === 'trade' && t.status === 'complete')];

        if (allCompletedTrades.length < 5 && previousLeagueId) {
           for (let week = 18; week >= 1; week--) {
              const pastRes = await fetch(`https://api.sleeper.app/v1/league/${previousLeagueId}/transactions/${week}`);
              const pastTrans = await pastRes.json();
              allCompletedTrades = [...allCompletedTrades, ...pastTrans.filter((t: any) => t.type === 'trade' && t.status === 'complete')];
              if (allCompletedTrades.length >= 5) break; 
           }
        }

        allCompletedTrades.sort((a: any, b: any) => b.status_updated - a.status_updated);
        const top5Trades = allCompletedTrades.slice(0, 5);

        const gradedTrades = top5Trades.map((trade: any) => {
          const teamLedgers: Record<number, { owner: string, avatar: string, assetsGained: any[], assetsLost: any[] }> = {};
          
          const involvedRosterIds = trade.roster_ids || [];
          involvedRosterIds.forEach((rosterId: number) => {
             const teamInfo = teamMap[rosterId];
             teamLedgers[rosterId] = {
                owner: teamInfo?.owner || `Team ${rosterId}`,
                avatar: teamInfo?.avatar,
                assetsGained: [],
                assetsLost: []
             };
          });

          let tradeParticipants: { owner: string, assets: string[] }[] = [];
          let allPlayerObjects: { name: string, pos: string, age: number }[] = [];

          involvedRosterIds.forEach((rosterId: number) => {
             const teamOwner = teamMap[rosterId]?.owner || `Team`;
             const teamGainedNames: string[] = [];

             if (trade.adds) {
                Object.entries(trade.adds).forEach(([playerId, gainingRosterId]) => {
                   if (Number(gainingRosterId) === rosterId) {
                      const pData = nflData[playerId];
                      const playerName = pData ? `${pData.first_name} ${pData.last_name}` : 'Player';
                      const pPos = pData?.position || 'UNK';
                      const pAge = pData?.age || 25;

                      teamGainedNames.push(playerName);
                      allPlayerObjects.push({ name: playerName, pos: pPos, age: pAge });

                      if (teamLedgers[rosterId]) {
                         teamLedgers[rosterId].assetsGained.push({ name: playerName, pos: pPos, age: pAge });
                      }
                   }
                });
             }

             if (trade.draft_picks) {
                trade.draft_picks.forEach((pick: any) => {
                   if (pick.owner_id === rosterId) {
                      const pickString = `${pick.season} Round ${pick.round}`;
                      teamGainedNames.push(pickString);
                      allPlayerObjects.push({ name: pickString, pos: 'PICK', age: 0 });

                      if (teamLedgers[rosterId]) {
                         teamLedgers[rosterId].assetsGained.push({ name: pickString, pos: 'PICK', age: 0 });
                      }
                   }
                });
             }

             tradeParticipants.push({ owner: teamOwner, assets: teamGainedNames });
          });

          if (trade.adds && trade.drops) {
             Object.entries(trade.adds).forEach(([playerId, gainingRosterId]) => {
                const givingRosterId = trade.drops[playerId];
                if (givingRosterId && teamLedgers[givingRosterId]) {
                   const pData = nflData[playerId];
                   const playerName = pData ? `${pData.first_name} ${pData.last_name}` : 'Player';
                   const pPos = pData?.position || 'UNK';
                   const pAge = pData?.age || 25;

                   teamLedgers[givingRosterId].assetsLost.push({ name: playerName, pos: pPos, age: pAge });
                }
             });
          }

          if (trade.draft_picks) {
             trade.draft_picks.forEach((pick: any) => {
                const givingRosterId = pick.previous_owner_id;
                if (givingRosterId && teamLedgers[givingRosterId]) {
                   const pickString = `${pick.season} Round ${pick.round}`;
                   teamLedgers[givingRosterId].assetsLost.push({ name: pickString, pos: 'PICK', age: 0 });
                }
             });
          }

          const teamsArray = Object.values(teamLedgers);

          let summary = "";
          if (involvedRosterIds.length > 2) {
             const ownerNames = teamsArray.map(t => t.owner).join(', ');
             summary = `A massive ${involvedRosterIds.length}-team blockbuster involving ${ownerNames}. Coordinating a multi-team deal like this takes serious diplomacy, and the team pulling the strings on the extra assets walks away as the ultimate winner.`;
          } else if (tradeParticipants.length >= 2) {
             const t1 = tradeParticipants[0];
             const t2 = tradeParticipants[1];
             const assetDesc1 = t1.assets.length > 0 ? t1.assets.join(', ') : 'pieces';
             const assetDesc2 = t2.assets.length > 0 ? t2.assets.join(', ') : 'pieces';
             
             const hasPicks = allPlayerObjects.some(p => p.pos === 'PICK');
             const youngStars = allPlayerObjects.filter(p => p.age > 0 && p.age <= 24);

             if (hasPicks && youngStars.length > 0) {
                summary = `${t1.owner} acquired ${assetDesc1} while shipping off ${assetDesc2} to ${t2.owner}. ${t2.owner} wins this deal cleanly by cashing out on proven upside for flexible future draft capital.`;
             } else {
                summary = `${t1.owner} landed ${assetDesc1} in exchange for ${assetDesc2} from ${t2.owner}. This is a classic positional value trade, but ${t2.owner} walks away as the winner by addressing their depth chart better.`;
             }
          } else {
             summary = `A unique trade transaction involving multiple assets. Both sides optimized their lineups, but the value lean favors the team receiving the cleaner long-term asset profile.`;
          }

          return {
             id: trade.transaction_id,
             date: new Date(trade.status_updated).toLocaleDateString(),
             teams: teamsArray,
             summary
          };
        });

        setRecentTrades(gradedTrades);
        setIsLoading(false);

      } catch (error) {
        console.error("Failed to load dashboard:", error);
        setIsLoading(false);
      }
    }
    fetchDashboardData();
  }, [leagueId]);

  // Save Announcements to Cloud Database
  const saveToCloudDatabase = async (updatedAnnouncements: Announcement[]) => {
    setIsSaving(true);
    try {
      const getRes = await fetch('/api/league-data');
      const currentDb = getRes.ok ? await getRes.json() : {};

      const payload = {
        ...currentDb,
        announcements: updatedAnnouncements
      };

      const res = await fetch('/api/league-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setAnnouncements(updatedAnnouncements);
      } else {
        alert("Failed to save changes to cloud database.");
      }
    } catch (e) {
      console.error("Error updating cloud database", e);
      alert("Error saving announcement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim() || !contentInput.trim()) return;

    let updated: Announcement[];
    if (editingId) {
      updated = announcements.map(a => 
        a.id === editingId ? { ...a, title: titleInput, content: contentInput } : a
      );
    } else {
      const newAnnouncement: Announcement = {
        id: Date.now().toString(),
        title: titleInput,
        content: contentInput,
        date: new Date().toLocaleDateString()
      };
      updated = [newAnnouncement, ...announcements];
    }

    await saveToCloudDatabase(updated);

    setTitleInput('');
    setContentInput('');
    setEditingId(null);
    setIsAddingAnnouncement(false);
  };

  const handleEditClick = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setTitleInput(announcement.title);
    setContentInput(announcement.content);
    setIsAddingAnnouncement(true);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const updated = announcements.filter(a => a.id !== id);
    await saveToCloudDatabase(updated);
  };

  const toggleExpand = (id: string) => {
    setExpandedTradeId(expandedTradeId === id ? null : id);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Crunching historical league data...</p>
        </div>
      </div>
    );
  }

  if (!leagueData) return <div className="p-8 text-gray-900 dark:text-white">Could not load league data.</div>;

  return (
    <div className="space-y-8 pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-gray-200 dark:border-gray-800 pb-4 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{leagueData.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
              Season: {leagueData.season} • Total Teams: {leagueData.total_rosters} • {leagueData.status === 'in_season' ? 'In Season' : 'Offseason'}
            </p>
          </div>
        </div>

        {/* Defending Champion Badge */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-xs">
          <span className="text-base">👑</span>
          <div className="text-left">
            <span className="text-[9px] font-extrabold uppercase text-amber-600 dark:text-amber-400 block tracking-wider">Defending Champion</span>
            <span className="text-xs font-black text-amber-900 dark:text-amber-200">Eckler34</span>
          </div>
        </div>
      </div>

      {/* COMMISSIONER ANNOUNCEMENTS SECTION */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">📢 League Announcements</h2>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                setIsAddingAnnouncement(!isAddingAnnouncement);
                setEditingId(null);
                setTitleInput('');
                setContentInput('');
              }}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
            >
              {isAddingAnnouncement ? 'Cancel' : '+ New Announcement'}
            </button>
          )}
        </div>

        {/* ADMIN ADD / EDIT FORM */}
        {isAdmin && isAddingAnnouncement && (
          <form onSubmit={handleSaveAnnouncement} className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              {editingId ? 'Edit Announcement' : 'Post New Announcement'}
            </h3>
            <input
              type="text"
              placeholder="Announcement Title"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            <textarea
              placeholder="Announcement details..."
              value={contentInput}
              onChange={(e) => setContentInput(e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddingAnnouncement(false);
                  setEditingId(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Post Announcement'}
              </button>
            </div>
          </form>
        )}

        {/* ANNOUNCEMENTS LIST */}
        {announcements.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-3">No announcements posted yet.</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((item) => (
              <div key={item.id} className="bg-indigo-50/40 dark:bg-gray-800/50 border border-indigo-100 dark:border-gray-700/80 p-4 rounded-xl space-y-2 shadow-xs transition-all hover:border-indigo-300 dark:hover:border-indigo-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-indigo-950 dark:text-white tracking-tight">{item.title}</h3>
                    <span className="text-[10px] font-semibold text-gray-400 bg-white dark:bg-gray-900 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-800">{item.date}</span>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAnnouncement(item.id)}
                        className="text-[11px] font-bold text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">
                  {item.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* STANDINGS SECTION */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
          🏆 Division Standings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {divisions.map((div, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800/80 px-4 py-3 border-b border-gray-200 dark:border-gray-800 font-bold text-gray-700 dark:text-gray-300 text-sm flex justify-between">
                <span>{div.name}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">OVR</span>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {div.teams.map((team: any, index: number) => (
                  <li key={team.rosterId} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-4 text-center">{index + 1}</span>
                      <img 
                        src={team.avatar ? `https://sleepercdn.com/avatars/thumbs/${team.avatar}` : 'https://sleepercdn.com/images/v2/icons/player_default.webp'} 
                        className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"
                        alt={team.owner}
                      />
                      <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{team.owner}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right flex flex-col">
                        <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{team.wins}-{team.losses}{team.ties > 0 ? `-${team.ties}` : ''}</span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">{team.fpts.toFixed(1)} PF</span>
                      </div>
                      <span className="font-black text-gray-300 dark:text-gray-700 text-xl w-6 text-center">#{team.overallRank}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* RECENT TRADES FEED */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            🤝 Recent League Trades
          </h2>
          <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950/50 border border-green-200 dark:border-green-800 px-2 py-1 rounded-full animate-pulse">Live from Sleeper</span>
        </div>

        {recentTrades.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-800 p-10 text-center">
            <p className="text-gray-500 dark:text-gray-400 font-medium">No recent trades found in league history.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTrades.map(trade => {
              const isExpanded = expandedTradeId === trade.id;
              const teamNames = trade.teams.map((t: any) => t.owner).join(' ↔️ ');

              return (
                <div key={trade.id} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-all">
                  
                  {/* Skinny Clickable Header */}
                  <div 
                    onClick={() => toggleExpand(trade.id)}
                    className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors select-none"
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 shrink-0">{trade.date}</span>
                      <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
                        {teamNames}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-md">
                        {isExpanded ? 'Hide Details' : 'View Trade 🔍'}
                      </span>
                    </div>
                  </div>

                  {/* Expandable Details Container */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-800 flex flex-col">
                      
                      {/* Analyst Verdict Banner */}
                      <div className="bg-gray-50 dark:bg-gray-800/80 px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                        <p className="text-xs text-gray-700 dark:text-gray-300 italic bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 px-3 py-2 rounded-md leading-relaxed">
                          🔍 <span className="font-bold text-blue-900 dark:text-blue-300 not-italic">Analyst Verdict:</span> {trade.summary}
                        </p>
                      </div>

                      {/* Team Asset Breakdown Columns */}
                      <div className="flex flex-col md:flex-row flex-1 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-800">
                        {trade.teams.map((team: any, i: number) => (
                          <div key={i} className="flex-1 p-4 flex flex-col justify-between bg-white dark:bg-gray-900">
                            <div>
                              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                                <img src={team.avatar ? `https://sleepercdn.com/avatars/thumbs/${team.avatar}` : 'https://sleepercdn.com/images/v2/icons/player_default.webp'} className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700" alt={team.owner} />
                                <span className="font-bold text-sm text-gray-900 dark:text-white truncate">{team.owner}</span>
                              </div>
                              
                              {/* Received */}
                              <div className="mb-4">
                               <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1 block tracking-wider">Acquired</span>
                               {(!team.assetsGained || team.assetsGained.length === 0) ? (
                                 <span className="text-xs italic text-gray-400 dark:text-gray-500">Nothing</span>
                               ) : (
                                 <ul className="space-y-1.5">
                                   {team.assetsGained.map((asset: any, idx: number) => (
                                     <li key={idx} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                                       <div className="flex items-center gap-1.5">
                                         <span className={`shrink-0 text-[9px] font-bold px-1 py-0.5 rounded ${asset.pos === 'PICK' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'}`}>{asset.pos}</span>
                                         <span className="font-semibold text-gray-800 dark:text-gray-200">{asset.name}</span>
                                       </div>
                                       {asset.age > 0 && <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Age {asset.age}</span>}
                                     </li>
                                   ))}
                                 </ul>
                               )}
                              </div>

                              {/* Given Up */}
                              <div>
                               <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1 block tracking-wider">Gave Up</span>
                               {(!team.assetsLost || team.assetsLost.length === 0) ? (
                                 <span className="text-xs italic text-gray-400 dark:text-gray-500">Nothing</span>
                               ) : (
                                 <ul className="space-y-1.5">
                                   {team.assetsLost.map((asset: any, idx: number) => (
                                     <li key={idx} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800/40 px-2 py-1 rounded opacity-70">
                                       <div className="flex items-center gap-1.5">
                                         <span className={`shrink-0 text-[9px] font-bold px-1 py-0.5 rounded ${asset.pos === 'PICK' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{asset.pos}</span>
                                         <span className="font-semibold text-gray-800 dark:text-gray-300 line-through">{asset.name}</span>
                                       </div>
                                       {asset.age > 0 && <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Age {asset.age}</span>}
                                     </li>
                                   ))}
                                 </ul>
                               )}
                              </div>

                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}