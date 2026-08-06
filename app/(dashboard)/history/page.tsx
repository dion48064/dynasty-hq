"use client";

import { useState } from 'react';

// MANUAL LEAGUE HISTORY DATA (2025 Inaugural Season)
const LEAGUE_HISTORY_DATA = [
  {
    year: 2025,
    champion: { team: "X Gon Give It To Ya", manager: "Eckler34", score: 159.60, place: 1 },
    runnerUp: { team: "BIGMEATYCLAWS", manager: "AdAMMAiN", score: 154.68, place: 2 },
    thirdPlace: { team: "Team Andeezy", manager: "Andeezy", place: 3 },
    fourthPlace: { team: "You Slept On My Couch", manager: "MacDaddy1997", place: 4 },
    fifthPlace: { team: "Team RickCity97", manager: "RickCity97", place: 5 },
    sixthPlace: { team: "Hampton Inn", manager: "dionvanboekel", place: 6 },
    seventhPlace: { team: "Concussion KINGZ", manager: "bcphotos", place: 7 },
    eighthPlace: { team: "Team splitereggs", manager: "splitereggs", place: 8 },
    ninthPlace: { team: "I Chase Brown Kids", manager: "Jshaner215", place: 9 },
    tenthPlace: { team: "Jeanty and Juice", manager: "LTran21", place: 10 },
    toiletBowlWinner: { team: "Wa'Conner For Two Weeks", manager: "JamalMcTiggles", score: 142.56, place: 11 },
    lastPlace: { 
      team: "Team raiderranger", 
      manager: "raiderranger", 
      score: 90.78, 
      place: 12,
      punishment: "Has to pay for 3rd place's entry fee in 2026 (won by Andeezy / Team Andeezy)." 
    }
  }
];

// MANUAL LEAGUE RECORDS DATA SPLIT INTO SINGLE GAME & SEASON RECORDS
const SINGLE_GAME_RECORDS = {
  highestScore: { team: "Concussion KINGZ", manager: "bcphotos", score: 198.36, week: 4, year: 2025 },
  lowestScore: { team: "Team raiderranger", manager: "raiderranger", score: 67.46, week: 7, year: 2025 },
  highestMatchup: { team1: "BIGMEATYCLAWS", manager1: "AdAMMAiN", score1: 190.12, team2: "Team RickCity97", manager2: "RickCity97", score2: 178.30, total: 368.42, week: 15, year: 2025 },
  lowestMatchup: { team1: "Team raiderranger", manager1: "raiderranger", score1: 85.60, team2: "Team splitereggs", manager2: "splitereggs", score2: 78.10, total: 163.70, week: 8, year: 2025 },
  biggestBlowout: { winnerTeam: "X Gon Give It To Ya", winner: "Eckler34", winnerScore: 196.32, loserTeam: "Concussion KINGZ", loser: "bcphotos", loserScore: 105.38, margin: 90.94, week: 15, year: 2025 },
  nailBiter: { winnerTeam: "X Gon Give It To Ya", winner: "Eckler34", winnerScore: 168.04, loserTeam: "Team Andeezy", loser: "Andeezy", loserScore: 167.78, margin: 0.26, week: 6, year: 2025 }
};

const SEASON_RECORDS = {
  mostPointsFor: { team: "Team Andeezy", manager: "Andeezy", score: 2041.94, year: 2025 },
  leastPointsFor: { team: "Team raiderranger", manager: "raiderranger", score: 1462.10, year: 2025 },
  mostPointsAgainst: { team: "X Gon Give It To Ya", manager: "Eckler34", score: 1976.54, year: 2025 },
  leastPointsAgainst: { team: "BIGMEATYCLAWS", manager: "AdAMMAiN", score: 1764.22, year: 2025 }
};

export default function LeagueHistoryPage() {
  const [activeTab, setActiveTab] = useState<'history' | 'records'>('history');

  // Compute all-time franchise standings
  const managerStatsMap: Record<string, { 
    manager: string; 
    team: string; 
    totalRank: number; 
    seasonsCount: number; 
    championships: number; 
    runnerUps: number; 
    lastPlaces: number;
    titlePoints: number;
  }> = {};

  LEAGUE_HISTORY_DATA.forEach(season => {
    const allTeamsInSeason = [
      { manager: season.champion.manager, team: season.champion.team, rank: season.champion.place, isChamp: true, isRunner: false, isLast: false },
      { manager: season.runnerUp.manager, team: season.runnerUp.team, rank: season.runnerUp.place, isChamp: false, isRunner: true, isLast: false },
      { manager: season.thirdPlace.manager, team: season.thirdPlace.team, rank: season.thirdPlace.place, isChamp: false, isRunner: false, isLast: false },
      { manager: season.fourthPlace.manager, team: season.fourthPlace.team, rank: season.fourthPlace.place, isChamp: false, isRunner: false, isLast: false },
      { manager: season.fifthPlace.manager, team: season.fifthPlace.team, rank: season.fifthPlace.place, isChamp: false, isRunner: false, isLast: false },
      { manager: season.sixthPlace.manager, team: season.sixthPlace.team, rank: season.sixthPlace.place, isChamp: false, isRunner: false, isLast: false },
      { manager: season.seventhPlace.manager, team: season.seventhPlace.team, rank: season.seventhPlace.place, isChamp: false, isRunner: false, isLast: false },
      { manager: season.eighthPlace.manager, team: season.eighthPlace.team, rank: season.eighthPlace.place, isChamp: false, isRunner: false, isLast: false },
      { manager: season.ninthPlace.manager, team: season.ninthPlace.team, rank: season.ninthPlace.place, isChamp: false, isRunner: false, isLast: false },
      { manager: season.tenthPlace.manager, team: season.tenthPlace.team, rank: season.tenthPlace.place, isChamp: false, isRunner: false, isLast: false },
      { manager: season.toiletBowlWinner.manager, team: season.toiletBowlWinner.team, rank: season.toiletBowlWinner.place, isChamp: false, isRunner: false, isLast: false },
      { manager: season.lastPlace.manager, team: season.lastPlace.team, rank: season.lastPlace.place, isChamp: false, isRunner: false, isLast: true },
    ];

    allTeamsInSeason.forEach(t => {
      if (!managerStatsMap[t.manager]) {
        managerStatsMap[t.manager] = { 
          manager: t.manager, 
          team: t.team, 
          totalRank: 0, 
          seasonsCount: 0,
          championships: 0,
          runnerUps: 0,
          lastPlaces: 0,
          titlePoints: 0
        };
      }
      managerStatsMap[t.manager].totalRank += t.rank;
      managerStatsMap[t.manager].seasonsCount += 1;
      managerStatsMap[t.manager].team = t.team;
      if (t.isChamp) managerStatsMap[t.manager].championships += 1;
      if (t.isRunner) managerStatsMap[t.manager].runnerUps += 1;
      if (t.isLast) managerStatsMap[t.manager].lastPlaces += 1;
    });
  });

  if (managerStatsMap['Andeezy']) {
    managerStatsMap['Andeezy'].titlePoints += 1;
  }

  const allTimeStandings = Object.values(managerStatsMap).map(m => ({
    ...m,
    avgFinish: Number((m.totalRank / m.seasonsCount).toFixed(2))
  })).sort((a, b) => {
    if (a.avgFinish !== b.avgFinish) {
      return a.avgFinish - b.avgFinish;
    }
    return b.titlePoints - a.titlePoints;
  });

  return (
    <div className="space-y-8 pb-10">
      
      {/* HEADER */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">League History & Records 🏆</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Relive past championship glory, historical matchups, and all-time standings.
          </p>
        </div>

        {/* SECTION SWITCHER TABS */}
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'history' 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            📜 League History
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'records' 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            📊 League Records
          </button>
        </div>
      </div>

      {/* HISTORY SECTION */}
      {activeTab === 'history' ? (
        <div className="space-y-8">
          
          {/* ALL-TIME STANDINGS TABLE */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">All-Time Franchise Standings</h2>
              </div>
              <span className="text-[10px] font-extrabold uppercase bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full">
                {LEAGUE_HISTORY_DATA.length} Season Recorded
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="pb-2.5 font-bold">Rk</th>
                    <th className="pb-2.5 font-bold">Manager / Team</th>
                    <th className="pb-2.5 font-bold text-center">Titles 👑</th>
                    <th className="pb-2.5 font-bold text-center">2nds 🥈</th>
                    <th className="pb-2.5 font-bold text-center">Last 💩</th>
                    <th className="pb-2.5 font-bold text-center">Title Pts 🎯</th>
                    <th className="pb-2.5 font-bold text-right">Avg Finish</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
                  {allTimeStandings.map((standing, idx) => (
                    <tr key={standing.manager} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-2.5 font-black text-gray-400 w-12">#{idx + 1}</td>
                      <td className="py-2.5">
                        <span className="font-bold text-gray-900 dark:text-white">{standing.team}</span>
                        <span className="text-gray-400 ml-1.5 font-normal">({standing.manager})</span>
                      </td>
                      <td className="py-2.5 text-center font-bold text-gray-700 dark:text-gray-300">{standing.championships}</td>
                      <td className="py-2.5 text-center font-bold text-gray-700 dark:text-gray-300">{standing.runnerUps}</td>
                      <td className="py-2.5 text-center font-bold text-gray-700 dark:text-gray-300">{standing.lastPlaces}</td>
                      <td className="py-2.5 text-center font-black text-gray-900 dark:text-white">{standing.titlePoints}</td>
                      <td className="py-2.5 text-right font-mono font-black text-gray-900 dark:text-white">
                        {standing.avgFinish}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CHAMPIONSHIP ARCHIVES HEADER */}
          <div className="flex items-center gap-2 pt-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Championship Archives & Punishments</h2>
          </div>

          {/* ARCHIVES */}
          <div className="space-y-4">
            {LEAGUE_HISTORY_DATA.map((season) => (
              <div 
                key={season.year} 
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4"
              >
                {/* SEASON YEAR */}
                <div className="flex xl:flex-col items-center xl:items-start justify-between xl:justify-start shrink-0 xl:w-40 border-b xl:border-b-0 xl:border-r border-gray-100 dark:border-gray-800 pb-2 xl:pb-0 xl:pr-4">
                  <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
                    {season.year}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full mt-0.5">
                    Inaugural Season
                  </span>
                </div>

                {/* CHAMPIONSHIP BATTLE */}
                <div className="flex-[1.5] space-y-1.5">
                  <div className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                    <span>🏆</span> Championship Final Matchup
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Champion */}
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="text-sm shrink-0">👑</span>
                        <div className="min-w-0">
                          <span className="font-extrabold text-xs text-gray-900 dark:text-white block truncate">{season.champion.team}</span>
                          <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 block truncate">({season.champion.manager})</span>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-black text-gray-900 dark:text-white shrink-0">{season.champion.score} pts</span>
                    </div>

                    {/* Runner Up */}
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="text-sm shrink-0">🥈</span>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-gray-800 dark:text-gray-200 block truncate">{season.runnerUp.team}</span>
                          <span className="text-[9px] font-semibold text-gray-500 block truncate">({season.runnerUp.manager})</span>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-gray-600 dark:text-gray-300 shrink-0">{season.runnerUp.score} pts</span>
                    </div>
                  </div>
                </div>

                {/* TOILET BOWL / PUNISHMENT */}
                <div className="flex-1 space-y-1.5 border-t xl:border-t-0 xl:border-l border-gray-100 dark:border-gray-800 pt-3 xl:pt-0 xl:pl-4 opacity-90">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                      <span>💩</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Toilet Bowl & Punishment</span>
                    </div>
                    <span className="text-[10px] font-medium text-gray-400">Winner: {season.toiletBowlWinner.team} ({season.toiletBowlWinner.score})</span>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-800 px-3 py-2 rounded-xl space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-xs text-gray-700 dark:text-gray-300 truncate pr-2">{season.lastPlace.team} ({season.lastPlace.manager})</span>
                      <span className="font-mono text-xs font-bold text-gray-600 dark:text-gray-400 shrink-0">{season.lastPlace.score} pts</span>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed italic pt-1 border-t border-gray-200/50 dark:border-gray-700/50">
                      "Punishment: {season.lastPlace.punishment}"
                    </p>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      ) : (
        /* RECORDS SECTION (SPLIT INTO SINGLE GAME & SEASON RECORDS, 2 COLUMNS) */
        <div className="space-y-10">
          
          {/* SINGLE GAME RECORDS */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Single-Game Records</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* HIGHEST SINGLE GAME SCORE */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-3 shadow-xs border-l-4 border-l-indigo-600">
                <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-gray-400">
                  <span>🚀 High Score (Single Game)</span>
                  <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full font-bold">Week {SINGLE_GAME_RECORDS.highestScore.week}, {SINGLE_GAME_RECORDS.highestScore.year}</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                    {SINGLE_GAME_RECORDS.highestScore.team} <span className="text-xs font-medium text-gray-500">({SINGLE_GAME_RECORDS.highestScore.manager})</span>
                  </h3>
                  <span className="font-mono text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1.5 block">{SINGLE_GAME_RECORDS.highestScore.score} pts</span>
                </div>
              </div>

              {/* LOWEST SINGLE GAME SCORE */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-3 shadow-xs border-l-4 border-l-indigo-600">
                <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-gray-400">
                  <span>📉 Low Score (Disaster Game)</span>
                  <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full font-bold">Week {SINGLE_GAME_RECORDS.lowestScore.week}, {SINGLE_GAME_RECORDS.lowestScore.year}</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                    {SINGLE_GAME_RECORDS.lowestScore.team} <span className="text-xs font-medium text-gray-500">({SINGLE_GAME_RECORDS.lowestScore.manager})</span>
                  </h3>
                  <span className="font-mono text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1.5 block">{SINGLE_GAME_RECORDS.lowestScore.score} pts</span>
                </div>
              </div>

              {/* HIGHEST SCORING MATCHUP */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-3 shadow-xs border-l-4 border-l-indigo-600">
                <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-gray-400">
                  <span>🔥 Highest Scoring Matchup</span>
                  <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full font-bold">Week {SINGLE_GAME_RECORDS.highestMatchup.week}, {SINGLE_GAME_RECORDS.highestMatchup.year}</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {SINGLE_GAME_RECORDS.highestMatchup.team1} ({SINGLE_GAME_RECORDS.highestMatchup.manager1}) — {SINGLE_GAME_RECORDS.highestMatchup.score1} pts
                  </h3>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {SINGLE_GAME_RECORDS.highestMatchup.team2} ({SINGLE_GAME_RECORDS.highestMatchup.manager2}) — {SINGLE_GAME_RECORDS.highestMatchup.score2} pts
                  </h3>
                  <span className="font-mono text-2xl font-black text-indigo-600 dark:text-indigo-400 pt-1 block">{SINGLE_GAME_RECORDS.highestMatchup.total} total pts</span>
                </div>
              </div>

              {/* LOWEST SCORING MATCHUP */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-3 shadow-xs border-l-4 border-l-indigo-600">
                <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-gray-400">
                  <span>🐢 Lowest Scoring Matchup</span>
                  <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full font-bold">Week {SINGLE_GAME_RECORDS.lowestMatchup.week}, {SINGLE_GAME_RECORDS.lowestMatchup.year}</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {SINGLE_GAME_RECORDS.lowestMatchup.team1} ({SINGLE_GAME_RECORDS.lowestMatchup.manager1}) — {SINGLE_GAME_RECORDS.lowestMatchup.score1} pts
                  </h3>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {SINGLE_GAME_RECORDS.lowestMatchup.team2} ({SINGLE_GAME_RECORDS.lowestMatchup.manager2}) — {SINGLE_GAME_RECORDS.lowestMatchup.score2} pts
                  </h3>
                  <span className="font-mono text-2xl font-black text-indigo-600 dark:text-indigo-400 pt-1 block">{SINGLE_GAME_RECORDS.lowestMatchup.total} total pts</span>
                </div>
              </div>

              {/* BIGGEST BLOWOUT */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-3 shadow-xs border-l-4 border-l-indigo-600">
                <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-gray-400">
                  <span>💥 Biggest Blowout</span>
                  <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full font-bold">Week {SINGLE_GAME_RECORDS.biggestBlowout.week}, {SINGLE_GAME_RECORDS.biggestBlowout.year}</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    👑 Winner: {SINGLE_GAME_RECORDS.biggestBlowout.winnerTeam} ({SINGLE_GAME_RECORDS.biggestBlowout.winner}) — {SINGLE_GAME_RECORDS.biggestBlowout.winnerScore} pts
                  </h3>
                  <h3 className="text-xs font-semibold text-gray-500 truncate">
                    Loser: {SINGLE_GAME_RECORDS.biggestBlowout.loserTeam} ({SINGLE_GAME_RECORDS.biggestBlowout.loser}) — {SINGLE_GAME_RECORDS.biggestBlowout.loserScore} pts
                  </h3>
                  <span className="font-mono text-2xl font-black text-indigo-600 dark:text-indigo-400 pt-1 block">+{SINGLE_GAME_RECORDS.biggestBlowout.margin} margin</span>
                </div>
              </div>

              {/* CLOSEST NAIL-BITER */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-3 shadow-xs border-l-4 border-l-indigo-600">
                <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-gray-400">
                  <span>⚡ Closest Nail-Biter</span>
                  <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full font-bold">Week {SINGLE_GAME_RECORDS.nailBiter.week}, {SINGLE_GAME_RECORDS.nailBiter.year}</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    👑 Winner: {SINGLE_GAME_RECORDS.nailBiter.winnerTeam} ({SINGLE_GAME_RECORDS.nailBiter.winner}) — {SINGLE_GAME_RECORDS.nailBiter.winnerScore} pts
                  </h3>
                  <h3 className="text-xs font-semibold text-gray-500 truncate">
                    Loser: {SINGLE_GAME_RECORDS.nailBiter.loserTeam} ({SINGLE_GAME_RECORDS.nailBiter.loser}) — {SINGLE_GAME_RECORDS.nailBiter.loserScore} pts
                  </h3>
                  <span className="font-mono text-2xl font-black text-indigo-600 dark:text-indigo-400 pt-1 block">+{SINGLE_GAME_RECORDS.nailBiter.margin} margin</span>
                </div>
              </div>

            </div>
          </div>

          {/* SEASON RECORDS */}
          <div className="space-y-6 pt-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Season Records</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* MOST POINTS FOR */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-3 shadow-xs border-l-4 border-l-emerald-500">
                <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-gray-400">
                  <span>📈 Most Points For (Season)</span>
                  <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">{SEASON_RECORDS.mostPointsFor.year} Season</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                    {SEASON_RECORDS.mostPointsFor.team} <span className="text-xs font-medium text-gray-500">({SEASON_RECORDS.mostPointsFor.manager})</span>
                  </h3>
                  <span className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 block">{SEASON_RECORDS.mostPointsFor.score} pts</span>
                </div>
              </div>

              {/* LEAST POINTS FOR */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-3 shadow-xs border-l-4 border-l-emerald-500">
                <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-gray-400">
                  <span>📉 Least Points For (Season)</span>
                  <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">{SEASON_RECORDS.leastPointsFor.year} Season</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                    {SEASON_RECORDS.leastPointsFor.team} <span className="text-xs font-medium text-gray-500">({SEASON_RECORDS.leastPointsFor.manager})</span>
                  </h3>
                  <span className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 block">{SEASON_RECORDS.leastPointsFor.score} pts</span>
                </div>
              </div>

              {/* MOST POINTS AGAINST */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-3 shadow-xs border-l-4 border-l-emerald-500">
                <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-gray-400">
                  <span>🛡️ Most Points Against (Season)</span>
                  <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">{SEASON_RECORDS.mostPointsAgainst.year} Season</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                    {SEASON_RECORDS.mostPointsAgainst.team} <span className="text-xs font-medium text-gray-500">({SEASON_RECORDS.mostPointsAgainst.manager})</span>
                  </h3>
                  <span className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 block">{SEASON_RECORDS.mostPointsAgainst.score} pts</span>
                </div>
              </div>

              {/* LEAST POINTS AGAINST */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-3 shadow-xs border-l-4 border-l-emerald-500">
                <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-gray-400">
                  <span>🧱 Least Points Against (Season)</span>
                  <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">{SEASON_RECORDS.leastPointsAgainst.year} Season</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                    {SEASON_RECORDS.leastPointsAgainst.team} <span className="text-xs font-medium text-gray-500">({SEASON_RECORDS.leastPointsAgainst.manager})</span>
                  </h3>
                  <span className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 block">{SEASON_RECORDS.leastPointsAgainst.score} pts</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}