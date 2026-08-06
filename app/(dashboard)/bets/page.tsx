"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';

const COMMISSIONER_TEAM_NAME = "Hampton Inn";

export default function SideBetsPage(): import("react").JSX.Element {
  const { teams, currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'active' | 'archive' | 'leaderboard'>('active');
  const [bets, setBets] = useState<any[]>([]);

  // New Bet Form State
  const [amount, setAmount] = useState('');
  const [venmoHandle, setVenmoHandle] = useState('');
  const [cashAppHandle, setCashAppHandle] = useState('');
  const [betType, setBetType] = useState<'season' | 'weekly'>('season');
  const [week, setWeek] = useState('Week 1');
  const [dates, setDates] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  
  // Commissioner Edit & Settlement Modal State
  const [settleModalBet, setSettleModalBet] = useState<any>(null);
  const [selectedWinner, setSelectedWinner] = useState('');
  
  const [editModalBet, setEditModalBet] = useState<any>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editVenmo, setEditVenmo] = useState('');
  const [editCashApp, setEditCashApp] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [newParticipantName, setNewParticipantName] = useState('');

  const requireLoginPrompt = () => {
    alert("Please sign in using the overall website login at the top right before performing this action.");
  };

  const handleCreateBet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      requireLoginPrompt();
      return;
    }

    if (!amount.trim() || !description.trim() || !deadline.trim() || (!venmoHandle.trim() && !cashAppHandle.trim()) || (betType === 'weekly' && !dates.trim())) {
      alert("Please fill out all mandatory fields, including the entry deadline date/time and at least one payment handle.");
      return;
    }

    const newBet = {
      id: `b_${Date.now()}`,
      creator: currentUser,
      venmoHandle: venmoHandle.trim(),
      cashAppHandle: cashAppHandle.trim(),
      amount,
      betType,
      week: betType === 'weekly' ? week : '',
      dates: betType === 'weekly' ? dates : '',
      deadline,
      description,
      participants: [{ name: currentUser, paid: true }],
      winner: null,
      payoutComplete: false,
      status: 'ACTIVE'
    };

    setBets([newBet, ...bets]);
    setAmount('');
    setVenmoHandle('');
    setCashAppHandle('');
    setDates('');
    setDeadline('');
    setDescription('');
  };

  const joinBet = (betId: string, deadlineStr: string) => {
    if (!currentUser) {
      requireLoginPrompt();
      return;
    }

    const isCommissioner = currentUser === COMMISSIONER_TEAM_NAME;
    if (deadlineStr && new Date().getTime() > new Date(deadlineStr).getTime() && !isCommissioner) {
      alert("The entry deadline for this wager has passed. No new participants can join.");
      return;
    }

    setBets(bets.map(b => {
      if (b.id === betId) {
        const isAlreadyJoined = b.participants.some((p: any) => p.name === currentUser);
        if (isAlreadyJoined) {
          if (b.creator === currentUser && !isCommissioner) return b;
          return { ...b, participants: b.participants.filter((p: any) => p.name !== currentUser) };
        } else {
          return { ...b, participants: [...b.participants, { name: currentUser, paid: false }] };
        }
      }
      return b;
    }));
  };

  const toggleParticipantPaid = (betId: string, participantName: string) => {
    if (!currentUser) {
      requireLoginPrompt();
      return;
    }

    const isCommissioner = currentUser === COMMISSIONER_TEAM_NAME;
    setBets(bets.map(b => {
      if (b.id === betId) {
        if (!isCommissioner && b.creator !== currentUser) return b;
        const updatedParticipants = b.participants.map((p: any) => {
          if (p.name === participantName) {
            return { ...p, paid: !p.paid };
          }
          return p;
        });
        return { ...b, participants: updatedParticipants };
      }
      return b;
    }));
  };

  const handleSettleBet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleModalBet || !selectedWinner) return;

    setBets(bets.map(b => {
      if (b.id === settleModalBet.id) {
        return {
          ...b,
          winner: selectedWinner,
          payoutComplete: true,
          status: 'SETTLED'
        };
      }
      return b;
    }));

    setSettleModalBet(null);
    setSelectedWinner('');
  };

  const openEditModal = (bet: any) => {
    setEditModalBet(bet);
    setEditDescription(bet.description);
    setEditAmount(bet.amount);
    setEditVenmo(bet.venmoHandle);
    setEditCashApp(bet.cashAppHandle);
    setEditDeadline(bet.deadline);
    setNewParticipantName('');
  };

  const handleSaveEditBet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalBet) return;

    setBets(bets.map(b => {
      if (b.id === editModalBet.id) {
        return {
          ...b,
          description: editDescription,
          amount: editAmount,
          venmoHandle: editVenmo,
          cashAppHandle: editCashApp,
          deadline: editDeadline
        };
      }
      return b;
    }));

    setEditModalBet(null);
  };

  const commissionerAddParticipant = (betId: string) => {
    if (!newParticipantName.trim()) return;
    setBets(bets.map(b => {
      if (b.id === betId) {
        const exists = b.participants.some((p: any) => p.name === newParticipantName);
        if (exists) return b;
        return {
          ...b,
          participants: [...b.participants, { name: newParticipantName.trim(), paid: false }]
        };
      }
      return b;
    }));
    setNewParticipantName('');
  };

  const commissionerRemoveParticipant = (betId: string, participantName: string) => {
    setBets(bets.map(b => {
      if (b.id === betId) {
        return {
          ...b,
          participants: b.participants.filter((p: any) => p.name !== participantName)
        };
      }
      return b;
    }));
  };

  const deleteBet = (id: string) => {
    if (currentUser !== COMMISSIONER_TEAM_NAME) {
      alert("Only the Commissioner (Hampton Inn) is authorized to delete wagers.");
      return;
    }

    setBets(bets.filter(b => b.id !== id));
  };

  // Helper function to calculate dynamic prize pool total
  const calculateTotalPot = (amountStr: string, participantCount: number) => {
    const cleanNum = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    if (isNaN(cleanNum)) return amountStr;
    return `$${(cleanNum * participantCount).toLocaleString()}`;
  };

  // Calculate Season Leaderboard Stats per Team
  const parseNum = (amt: string) => {
    const n = parseFloat(amt.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const leaderboardMap: Record<string, { team: string; betsEntered: number; totalWagered: number; totalWon: number; netProfit: number }> = {};
  
  // Initialize map with all league teams if available
  const allTeamNames = teams && teams.length > 0 ? teams : [];
  allTeamNames.forEach(t => {
    leaderboardMap[t] = { team: t, betsEntered: 0, totalWagered: 0, totalWon: 0, netProfit: 0 };
  });

  bets.forEach(bet => {
    const stake = parseNum(bet.amount);
    const potSize = stake * (bet.participants ? bet.participants.length : 0);

    if (bet.participants) {
      bet.participants.forEach((p: any) => {
        if (!leaderboardMap[p.name]) {
          leaderboardMap[p.name] = { team: p.name, betsEntered: 0, totalWagered: 0, totalWon: 0, netProfit: 0 };
        }
        leaderboardMap[p.name].betsEntered += 1;
        leaderboardMap[p.name].totalWagered += stake;
      });
    }

    // If settled, award the total pot to the winner
    if (bet.status === 'SETTLED' && bet.winner) {
      if (!leaderboardMap[bet.winner]) {
        leaderboardMap[bet.winner] = { team: bet.winner, betsEntered: 0, totalWagered: 0, totalWon: 0, netProfit: 0 };
      }
      leaderboardMap[bet.winner].totalWon += potSize;
    }
  });

  // Calculate Net Profit & Sort Leaderboard descending by Net Profit
  const leaderboardList = Object.values(leaderboardMap).map(item => ({
    ...item,
    netProfit: item.totalWon - item.totalWagered
  })).sort((a, b) => b.netProfit - a.netProfit);

  const activeBets = bets.filter(b => b.status === 'ACTIVE');
  const archivedBets = bets.filter(b => b.status === 'SETTLED');
  const isCommissioner = currentUser === COMMISSIONER_TEAM_NAME;

  return (
    <div className="space-y-8 pb-10 relative">
      
      {/* COMMISSIONER EDIT MODAL */}
      {editModalBet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              🛡️ Commissioner Edit Wager
            </h3>

            <form onSubmit={handleSaveEditBet} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400">Terms & Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Stake Amount</label>
                  <input
                    type="text"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Deadline</label>
                  <input
                    type="datetime-local"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Venmo Handle</label>
                  <input
                    type="text"
                    value={editVenmo}
                    onChange={(e) => setEditVenmo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400">CashApp Handle</label>
                  <input
                    type="text"
                    value={editCashApp}
                    onChange={(e) => setEditCashApp(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Manage Participants Section */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
                <label className="text-[10px] uppercase font-bold text-gray-400 block">Manage Participants</label>
                <div className="flex flex-wrap gap-2">
                  {editModalBet.participants.map((p: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg text-xs font-semibold">
                      <span>{p.name}</span>
                      <button
                        type="button"
                        onClick={() => commissionerRemoveParticipant(editModalBet.id, p.name)}
                        className="text-red-500 hover:text-red-700 font-bold ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <select
                    value={newParticipantName}
                    onChange={(e) => setNewParticipantName(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                  >
                    <option value="">-- Add Team --</option>
                    {teams.filter((t: string) => !editModalBet.participants.some((p: any) => p.name === t)).map((t: string, idx: number) => (
                      <option key={idx} value={t}>{t}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => commissionerAddParticipant(editModalBet.id)}
                    className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-xs"
                  >
                    Add Team
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  Save Changes ✓
                </button>
                <button
                  type="button"
                  onClick={() => setEditModalBet(null)}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xs rounded-xl"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SETTLEMENT MODAL */}
      {settleModalBet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Settle Wager & Declare Winner 🏆</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select the winner for: <span className="font-semibold text-gray-800 dark:text-gray-200">"{settleModalBet.description}"</span>
            </p>

            <form onSubmit={handleSettleBet} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400">Winner</label>
                <select
                  value={selectedWinner}
                  onChange={(e) => setSelectedWinner(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">-- Select Winner --</option>
                  {settleModalBet.participants.map((p: any, idx: number) => (
                    <option key={idx} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  Confirm Winner & Archive Bet ✓
                </button>
                <button
                  type="button"
                  onClick={() => setSettleModalBet(null)}
                  className="px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">League Side Bets 🎲</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Propose wagers, track pot contributions, and archive completed results.
          </p>
        </div>

        {/* SIGN IN REMINDER BADGE */}
        {!currentUser && (
          <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-4 py-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300">
            Sign in at the top right to post or join wagers 🔑
          </div>
        )}
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'active' 
              ? 'bg-indigo-600 text-white shadow-xs' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
          }`}
        >
          Active Wagers ({activeBets.length})
        </button>
        <button
          onClick={() => setActiveTab('archive')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'archive' 
              ? 'bg-indigo-600 text-white shadow-xs' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
          }`}
        >
          Archived Bets ({archivedBets.length})
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'leaderboard' 
              ? 'bg-indigo-600 text-white shadow-xs' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
          }`}
        >
          📊 Season Leaderboard
        </button>
      </div>

      {activeTab === 'leaderboard' ? (
        /* LEADERBOARD VIEW */
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Side Bet Season Leaderboard</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Aggregated winnings, wager volumes, and net profit across all entered wagers.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="pb-2.5 font-bold">Rank & Team</th>
                  <th className="pb-2.5 font-bold text-center">Bets Entered</th>
                  <th className="pb-2.5 font-bold text-center">Total Wagered</th>
                  <th className="pb-2.5 font-bold text-center">Total Won</th>
                  <th className="pb-2.5 font-bold text-right">Net Profit / Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
                {leaderboardList.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="py-3 flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                        index === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' :
                        index === 1 ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200' :
                        index === 2 ? 'bg-amber-700/20 text-amber-900 dark:bg-amber-900/40 dark:text-amber-400' :
                        'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">{row.team}</span>
                    </td>
                    <td className="py-3 text-center font-mono font-bold text-gray-700 dark:text-gray-300">
                      {row.betsEntered}
                    </td>
                    <td className="py-3 text-center font-mono font-bold text-gray-600 dark:text-gray-400">
                      ${row.totalWagered.toLocaleString()}
                    </td>
                    <td className="py-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ${row.totalWon.toLocaleString()}
                    </td>
                    <td className={`py-3 text-right font-mono font-black text-sm ${
                      row.netProfit > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                      row.netProfit < 0 ? 'text-red-600 dark:text-red-400' :
                      'text-gray-500 dark:text-gray-400'
                    }`}>
                      {row.netProfit > 0 ? `+$${row.netProfit.toLocaleString()}` : row.netProfit < 0 ? `-$${Math.abs(row.netProfit).toLocaleString()}` : '$0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* CREATE BET FORM (1 Column) */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 h-fit">
            <h2 className="text-base font-bold text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-gray-800">
              Propose New Wager {currentUser ? `(as ${currentUser})` : ''}
            </h2>
            
            <form onSubmit={handleCreateBet} className="space-y-4">
              {/* Wager Category (Mandatory) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-gray-400 block">Wager Category *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBetType('season')}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                      betType === 'season' ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-700 text-gray-500'
                    }`}
                  >
                    Season Long
                  </button>
                  <button
                    type="button"
                    onClick={() => setBetType('weekly')}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                      betType === 'weekly' ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-700 text-gray-500'
                    }`}
                  >
                    Weekly Matchup
                  </button>
                </div>
              </div>

              {betType === 'weekly' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400">Week *</label>
                    <select
                      value={week}
                      onChange={(e) => setWeek(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                    >
                      {[...Array(18)].map((_, i) => (
                        <option key={i+1} value={`Week ${i+1}`}>Week {i+1}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400">Dates / Range *</label>
                    <input 
                      type="text"
                      value={dates}
                      onChange={(e) => setDates(e.target.value)}
                      placeholder="e.g. Sept 10-14"
                      required={betType === 'weekly'}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Entry Deadline (Mandatory) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-gray-400 block">Entry Deadline Date & Time *</label>
                <input 
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Stake Amount (Mandatory) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-gray-400 block">Stake Amount *</label>
                <input 
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. $25"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Separate Payment Handles (At least one mandatory) */}
              <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                <label className="text-xs font-bold uppercase text-gray-400 block">Payment Handles * (Provide at least one)</label>
                <div className="space-y-2">
                  <input 
                    type="text"
                    value={venmoHandle}
                    onChange={(e) => setVenmoHandle(e.target.value)}
                    placeholder="Venmo Handle (e.g. @YourVenmo)"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                  <input 
                    type="text"
                    value={cashAppHandle}
                    onChange={(e) => setCashAppHandle(e.target.value)}
                    placeholder="CashApp Handle (e.g. $YourCashTag)"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Wager Terms & Description (Mandatory) */}
              <div className="space-y-1.5 pt-1 border-t border-gray-100 dark:border-gray-800">
                <label className="text-xs font-bold uppercase text-gray-400 block">Wager Terms & Description *</label>
                <textarea 
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What are the exact rules of this bet?"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-amber-500 text-white font-bold text-xs rounded-xl shadow-md hover:opacity-95 transition-all"
              >
                Post Wager Pool 🎯
              </button>
            </form>
          </div>

          {/* BETS FEED (2 Columns) */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              {activeTab === 'active' ? '📜 Open Wager Pools' : '📦 Archived Wagers'}
            </h2>

            {(activeTab === 'active' ? activeBets : archivedBets).length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-10 border border-gray-200 dark:border-gray-800 text-center text-gray-400 text-sm">
                {activeTab === 'active' ? 'No active wagers right now. Propose one using the form!' : 'No archived wagers yet.'}
              </div>
            ) : (
              <div className="space-y-4">
                {(activeTab === 'active' ? activeBets : archivedBets).map(bet => {
                  const isCreator = bet.creator === currentUser;
                  const hasJoined = bet.participants.some((p: any) => p.name === currentUser);
                  const isSettled = bet.status === 'SETTLED';
                  const isExpired = bet.deadline ? new Date().getTime() > new Date(bet.deadline).getTime() : false;
                  const totalPot = calculateTotalPot(bet.amount, bet.participants.length);

                  return (
                    <div 
                      key={bet.id} 
                      className={`bg-white dark:bg-gray-900 rounded-xl p-5 border shadow-sm transition-all flex flex-col justify-between gap-4 ${
                        isSettled ? 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40' : 'border-indigo-200 dark:border-indigo-900/60'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {bet.betType === 'weekly' && (
                              <span className="text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                {bet.week} {bet.dates ? `(${bet.dates})` : ''}
                              </span>
                            )}
                            <span className="font-bold text-sm text-gray-900 dark:text-white">
                              Proposed by <span className="text-indigo-600 dark:text-indigo-400">{bet.creator}</span>
                            </span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                              isSettled ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
                              isExpired ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' :
                              'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            }`}>
                              {isSettled ? `Winner: ${bet.winner}` : isExpired ? 'ENTRY CLOSED' : 'ACTIVE'}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 space-y-0.5">
                            <div>
                              Stake: <span className="text-gray-900 dark:text-white font-bold">{bet.amount}</span> • 
                              Prize Pool: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{totalPot}</span> ({bet.participants.length} {bet.participants.length === 1 ? 'entry' : 'entries'}) • 
                              Deadline: <span className="text-gray-900 dark:text-white font-bold">{new Date(bet.deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            {(bet.venmoHandle || bet.cashAppHandle) && (
                              <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                                Send funds to: {bet.venmoHandle ? `Venmo (${bet.venmoHandle})` : ''} {bet.venmoHandle && bet.cashAppHandle ? '•' : ''} {bet.cashAppHandle ? `CashApp (${bet.cashAppHandle})` : ''}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isSettled && (!isExpired || hasJoined || isCommissioner) && (
                            <button
                              onClick={() => joinBet(bet.id, bet.deadline)}
                              className={`text-xs font-bold px-4 py-2 rounded-lg border transition-all shadow-xs ${
                                hasJoined 
                                  ? 'bg-emerald-600 text-white border-emerald-600' 
                                  : isExpired && !isCommissioner
                                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed border-transparent' 
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                              }`}
                            >
                              {hasJoined ? 'Joined ✓' : isExpired && !isCommissioner ? 'Closed' : 'Join Bet 🤝'}
                            </button>
                          )}
                          {(isCreator || isCommissioner) && !isSettled && (
                            <button
                              onClick={() => setSettleModalBet(bet)}
                              className="text-xs font-bold px-3 py-2 rounded-lg border bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                            >
                              Settle 🏆
                            </button>
                          )}
                          {isCommissioner && (
                            <button
                              onClick={() => openEditModal(bet)}
                              title="Commissioner Edit"
                              className="text-xs font-bold px-2.5 py-2 rounded-lg border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                            >
                              Edit 🛡️
                            </button>
                          )}
                          {isCommissioner && (
                            <button
                              onClick={() => deleteBet(bet.id)}
                              title="Commissioner Delete"
                              className="text-gray-400 hover:text-red-500 font-bold px-2 py-1 text-sm"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800 text-xs text-gray-700 dark:text-gray-300 space-y-3">
                        <div>
                          <span className="font-bold text-gray-400 block text-[10px] uppercase mb-0.5">Terms</span>
                          {bet.description}
                        </div>

                        {/* Participants & Payment Status Checkboxes */}
                        <div className="pt-2 border-t border-gray-200/60 dark:border-gray-700/60 space-y-2">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Participants & Payment Tracker</span>
                          <div className="flex flex-wrap gap-2">
                            {bet.participants.map((p: any, idx: number) => (
                              <div 
                                key={idx} 
                                className={`flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-semibold ${
                                  p.paid 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                                }`}
                              >
                                <span>{p.name}</span>
                                {(isCreator || isCommissioner) && !isSettled ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleParticipantPaid(bet.id, p.name)}
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase transition-colors ${
                                      p.paid ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                    }`}
                                  >
                                    {p.paid ? 'Paid ✓' : 'Unpaid'}
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-bold">
                                    {p.paid ? 'Paid ✓' : 'Unpaid'}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}