"use client";
// Test Update - Cloud Persistence Live Check v1.0.9
import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';

const COMMISSIONER_USER = "dionvanboekel";

export default function SideBetsPage() {
  const { users, currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'active' | 'archive' | 'leaderboard'>('active');
  const [bets, setBets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Bet Form State
  const [title, setTitle] = useState('');
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
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editVenmo, setEditVenmo] = useState('');
  const [editCashApp, setEditCashApp] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [newParticipantName, setNewParticipantName] = useState('');

  // Fetch initial bets from Cloud Database on load
  useEffect(() => {
    async function fetchBets() {
      try {
        const res = await fetch('/api/league-data');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.bets)) {
            setBets(data.bets);
          }
        }
      } catch (e) {
        console.error("Failed to load bets from cloud", e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchBets();
  }, []);

  // Helper function to save updated bets array back to JSONBin cloud database
  const saveBetsToCloud = async (updatedBets: any[]) => {
    try {
      const getRes = await fetch('/api/league-data');
      const currentDb = getRes.ok ? await getRes.json() : {};

      const payload = {
        ...currentDb,
        bets: updatedBets
      };

      const putRes = await fetch('/api/league-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!putRes.ok) {
        alert("Failed to save changes to cloud database.");
      }
    } catch (err) {
      console.error("Cloud save error", err);
    }
  };

  const requireLoginPrompt = () => {
    alert("Please sign in using the overall website login at the top right before performing this action.");
  };

  const handleCreateBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      requireLoginPrompt();
      return;
    }

    if (!title.trim() || !amount.trim() || !description.trim() || !deadline.trim() || (!venmoHandle.trim() && !cashAppHandle.trim()) || (betType === 'weekly' && !dates.trim())) {
      alert("Please fill out all mandatory fields, including the wager title, entry deadline, and at least one payment handle.");
      return;
    }

    const newId = `b_${Date.now()}`;
    const newBet = {
      id: newId,
      creator: currentUser,
      title: title.trim(),
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

    const updatedBets = [newBet, ...bets];
    setBets(updatedBets);
    await saveBetsToCloud(updatedBets);

    setTitle('');
    setAmount('');
    setVenmoHandle('');
    setCashAppHandle('');
    setDates('');
    setDeadline('');
    setDescription('');
  };

  const copyBetShareText = (bet: any) => {
    const typeLabel = bet.betType === 'weekly' ? `Weekly Matchup (${bet.week})` : 'Season-Long Wager';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const shareText = `🎲 NEW LEAGUE SIDE BET 🎲\n📌 "${bet.title}"\nProposed by: ${bet.creator}\nType: ${typeLabel}\nStake: ${bet.amount} per entry\nDetails: "${bet.description}"\n\nJoin the wager pool here: ${baseUrl}/bets`;

    navigator.clipboard.writeText(shareText).then(() => {
      alert("📋 Bet details copied to clipboard! You can now paste this directly into your Sleeper league chat.");
    }).catch(() => {
      alert("Failed to copy to clipboard.");
    });
  };

  const joinBet = async (betId: string, deadlineStr: string) => {
    if (!currentUser) {
      requireLoginPrompt();
      return;
    }

    const isCommissioner = currentUser === COMMISSIONER_USER;
    if (deadlineStr && new Date().getTime() > new Date(deadlineStr).getTime() && !isCommissioner) {
      alert("The entry deadline for this wager has passed. No new participants can join.");
      return;
    }

    const updatedBets = bets.map(b => {
      if (b.id === betId) {
        const existingParticipant = b.participants.find((p: any) => p.name === currentUser);
        
        if (existingParticipant) {
          if (existingParticipant.paid && !isCommissioner) {
            alert("You have already been marked as paid for this wager and cannot leave.");
            return b;
          }
          if (b.creator === currentUser && !isCommissioner && existingParticipant.paid) return b;
          
          return { ...b, participants: b.participants.filter((p: any) => p.name !== currentUser) };
        } else {
          return { ...b, participants: [...b.participants, { name: currentUser, paid: false }] };
        }
      }
      return b;
    });

    setBets(updatedBets);
    await saveBetsToCloud(updatedBets);
  };

  const toggleParticipantPaid = async (betId: string, participantName: string) => {
    if (!currentUser) {
      requireLoginPrompt();
      return;
    }

    const isCommissioner = currentUser === COMMISSIONER_USER;
    const updatedBets = bets.map(b => {
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
    });

    setBets(updatedBets);
    await saveBetsToCloud(updatedBets);
  };

  const handleSettleBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleModalBet || !selectedWinner) return;

    const updatedBets = bets.map(b => {
      if (b.id === settleModalBet.id) {
        return {
          ...b,
          winner: selectedWinner,
          payoutComplete: true,
          status: 'SETTLED'
        };
      }
      return b;
    });

    setBets(updatedBets);
    await saveBetsToCloud(updatedBets);

    setSettleModalBet(null);
    setSelectedWinner('');
  };

  const openEditModal = (bet: any) => {
    setEditModalBet(bet);
    setEditTitle(bet.title || '');
    setEditDescription(bet.description);
    setEditAmount(bet.amount);
    setEditVenmo(bet.venmoHandle);
    setEditCashApp(bet.cashAppHandle);
    setEditDeadline(bet.deadline);
    setNewParticipantName('');
  };

  const handleSaveEditBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalBet) return;

    const updatedBets = bets.map(b => {
      if (b.id === editModalBet.id) {
        return {
          ...b,
          title: editTitle.trim(),
          description: editDescription,
          amount: editAmount,
          venmoHandle: editVenmo,
          cashAppHandle: editCashApp,
          deadline: editDeadline
        };
      }
      return b;
    });

    setBets(updatedBets);
    await saveBetsToCloud(updatedBets);
    setEditModalBet(null);
  };

  const commissionerAddParticipant = async (betId: string) => {
    if (!newParticipantName.trim()) return;
    const updatedBets = bets.map(b => {
      if (b.id === betId) {
        const exists = b.participants.some((p: any) => p.name === newParticipantName);
        if (exists) return b;
        return {
          ...b,
          participants: [...b.participants, { name: newParticipantName.trim(), paid: false }]
        };
      }
      return b;
    });

    setBets(updatedBets);
    await saveBetsToCloud(updatedBets);
    setNewParticipantName('');
  };

  const commissionerRemoveParticipant = async (betId: string, participantName: string) => {
    const updatedBets = bets.map(b => {
      if (b.id === betId) {
        return {
          ...b,
          participants: b.participants.filter((p: any) => p.name !== participantName)
        };
      }
      return b;
    });

    setBets(updatedBets);
    await saveBetsToCloud(updatedBets);
  };

  const deleteBet = async (id: string) => {
    if (currentUser !== COMMISSIONER_USER) {
      alert(`Only the Commissioner (${COMMISSIONER_USER}) is authorized to delete wagers.`);
      return;
    }

    const updatedBets = bets.filter(b => b.id !== id);
    setBets(updatedBets);
    await saveBetsToCloud(updatedBets);
  };

  // Helper function to calculate dynamic prize pool total (ONLY counting paid participants)
  const calculateTotalPot = (amountStr: string, participants: any[]) => {
    const cleanNum = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    if (isNaN(cleanNum)) return amountStr;
    const paidCount = participants ? participants.filter((p: any) => p.paid).length : 0;
    return `$${(cleanNum * paidCount).toLocaleString()}`;
  };

  // Calculate Season Leaderboard Stats per User/Team (ONLY counting paid entries/winnings)
  const parseNum = (amt: string) => {
    const n = parseFloat(amt.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const leaderboardMap: Record<string, { team: string; betsEntered: number; totalWagered: number; totalWon: number; netProfit: number }> = {};
  
  const allUserNames = users && users.length > 0 ? users.map((u: any) => u.username) : [];
  allUserNames.forEach((u: string) => {
    leaderboardMap[u] = { team: u, betsEntered: 0, totalWagered: 0, totalWon: 0, netProfit: 0 };
  });

  bets.forEach(bet => {
    const stake = parseNum(bet.amount);
    const paidParticipants = bet.participants ? bet.participants.filter((p: any) => p.paid) : [];
    const potSize = stake * paidParticipants.length;

    if (bet.participants) {
      bet.participants.forEach((p: any) => {
        if (p.paid) {
          if (!leaderboardMap[p.name]) {
            leaderboardMap[p.name] = { team: p.name, betsEntered: 0, totalWagered: 0, totalWon: 0, netProfit: 0 };
          }
          leaderboardMap[p.name].betsEntered += 1;
          leaderboardMap[p.name].totalWagered += stake;
        }
      });
    }

    if (bet.status === 'SETTLED' && bet.winner) {
      if (!leaderboardMap[bet.winner]) {
        leaderboardMap[bet.winner] = { team: bet.winner, betsEntered: 0, totalWagered: 0, totalWon: 0, netProfit: 0 };
      }
      leaderboardMap[bet.winner].totalWon += potSize;
    }
  });

  const leaderboardList = Object.values(leaderboardMap).map(item => ({
    ...item,
    netProfit: item.totalWon - item.totalWagered
  })).sort((a, b) => b.netProfit - a.netProfit);

  const activeBets = bets.filter(b => b.status === 'ACTIVE');
  const weeklyActiveBets = activeBets.filter(b => b.betType === 'weekly');
  const seasonActiveBets = activeBets.filter(b => b.betType === 'season');

  const archivedBets = bets.filter(b => b.status === 'SETTLED');
  const isCommissioner = currentUser === COMMISSIONER_USER;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

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
                <label className="text-[10px] uppercase font-bold text-gray-400">Wager Title / Heading</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400">Details & Description</label>
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
                    <option value="">-- Add Manager --</option>
                    {users.filter((u: any) => !editModalBet.participants.some((p: any) => p.name === u.username)).map((u: any, idx: number) => (
                      <option key={idx} value={u.username}>{u.username} ({u.teamName})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => commissionerAddParticipant(editModalBet.id)}
                    className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-xs"
                  >
                    Add Manager
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
              Select the winner for: <span className="font-semibold text-gray-800 dark:text-gray-200">"{settleModalBet.title || settleModalBet.description}"</span>
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
                  {settleModalBet.participants.filter((p: any) => p.paid).map((p: any, idx: number) => (
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

      {/* DISCLAIMER BANNER */}
      <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl flex items-start gap-3">
        <span className="text-base shrink-0">⚠️</span>
        <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
          <span className="font-bold">Disclaimer:</span> The responsibility of organizing, tracking payments, and fulfilling each wager falls entirely on the manager who created the wager. The league platform serves strictly as a bulletin board and tracking tool.
        </p>
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
                Aggregated winnings, wager volumes, and net profit across all entered wagers (Paid entries only).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="pb-2.5 font-bold">Rank & Manager</th>
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

              {/* Wager Title / Heading (Mandatory) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-gray-400 block">Wager Title / Heading *</label>
                <input 
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Highest Season Points"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

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
                <label className="text-xs font-bold uppercase text-gray-400 block">Details & Description *</label>
                <textarea 
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add more detail about the rules and payout..."
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
          <div className="lg:col-span-2 space-y-6">
            
            {activeTab === 'active' ? (
              <>
                {/* WEEKLY WAGERS SECTION */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">📅 Weekly Matchup Wagers ({weeklyActiveBets.length})</h2>
                  </div>

                  {weeklyActiveBets.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 text-center text-gray-400 text-xs">
                      No active weekly matchup wagers right now.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {weeklyActiveBets.map(bet => renderBetCard(bet))}
                    </div>
                  )}
                </div>

                {/* SEASON LONG WAGERS SECTION */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">🏆 Season-Long Wagers ({seasonActiveBets.length})</h2>
                  </div>

                  {seasonActiveBets.length === 0 ? (
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 text-center text-gray-400 text-xs">
                      No active season-long wagers right now.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {seasonActiveBets.map(bet => renderBetCard(bet))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* ARCHIVED BETS */
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  📦 Archived Wagers
                </h2>
                {archivedBets.length === 0 ? (
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-10 border border-gray-200 dark:border-gray-800 text-center text-gray-400 text-sm">
                    No archived wagers yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {archivedBets.map(bet => renderBetCard(bet))}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );

  function renderBetCard(bet: any) {
    const isCreator = bet.creator === currentUser;
    const participantRecord = bet.participants.find((p: any) => p.name === currentUser);
    const hasJoined = !!participantRecord;
    const isPaid = participantRecord ? participantRecord.paid : false;
    const isSettled = bet.status === 'SETTLED';
    const isExpired = bet.deadline ? new Date().getTime() > new Date(bet.deadline).getTime() : false;
    
    // Prize pool only counts paid participants
    const paidParticipantsCount = bet.participants ? bet.participants.filter((p: any) => p.paid).length : 0;
    const totalPot = calculateTotalPot(bet.amount, bet.participants);

    return (
      <div 
        key={bet.id} 
        className={`bg-white dark:bg-gray-900 rounded-xl p-5 border shadow-sm transition-all flex flex-col justify-between gap-4 ${
          isSettled ? 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40' : 'border-indigo-200 dark:border-indigo-900/60'
        }`}
      >
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-3 w-full pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* CLEAR BET TYPE BADGE */}
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                bet.betType === 'weekly' 
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' 
                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
              }`}>
                {bet.betType === 'weekly' ? `📅 Weekly Matchup (${bet.week}${bet.dates ? ` - ${bet.dates}` : ''})` : '🏆 Season-Long Wager'}
              </span>

              <span className="font-bold text-xs text-gray-600 dark:text-gray-300">
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

            {/* WAGER TITLE / HEADING */}
            <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
              {bet.title || 'Side Bet Wager'}
            </h3>

            {/* BIGGER & PROMINENT STAKE & PRIZE POOL BANNER */}
            <div className="grid grid-cols-2 gap-3 bg-gradient-to-r from-gray-50 to-indigo-50/50 dark:from-gray-800/60 dark:to-indigo-950/40 border border-indigo-100 dark:border-indigo-900/80 p-3.5 rounded-xl">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-indigo-600 dark:text-indigo-400 block tracking-wider">Stake Amount</span>
                <span className="font-mono text-xl font-black text-gray-900 dark:text-white">{bet.amount}</span>
                <span className="text-[10px] text-gray-400 block">per entry</span>
              </div>
              <div className="border-l border-gray-200 dark:border-gray-700/80 pl-3">
                <span className="text-[10px] uppercase font-extrabold text-emerald-600 dark:text-emerald-400 block tracking-wider">Confirmed Pot</span>
                <span className="font-mono text-xl font-black text-emerald-700 dark:text-emerald-300">{totalPot}</span>
                <span className="text-[10px] text-gray-400 block">({paidParticipantsCount} paid {paidParticipantsCount === 1 ? 'entry' : 'entries'})</span>
              </div>
            </div>

            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 space-y-0.5">
              <div>
                Deadline: <span className="text-gray-900 dark:text-white font-bold">{new Date(bet.deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {(bet.venmoHandle || bet.cashAppHandle) && (
                <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold pt-0.5">
                  Send funds to: {bet.venmoHandle ? `Venmo (${bet.venmoHandle})` : ''} {bet.venmoHandle && bet.cashAppHandle ? '•' : ''} {bet.cashAppHandle ? `CashApp (${bet.cashAppHandle})` : ''}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              {!isSettled && (!isExpired || hasJoined || isCommissioner) && (
                <button
                  onClick={() => joinBet(bet.id, bet.deadline)}
                  disabled={hasJoined && isPaid && !isCommissioner}
                  className={`text-xs font-bold px-4 py-2 rounded-lg border transition-all shadow-xs ${
                    hasJoined && isPaid
                      ? 'bg-emerald-600 text-white border-emerald-600 cursor-default opacity-90' 
                      : hasJoined
                      ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600'
                      : isExpired && !isCommissioner
                      ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed border-transparent' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                  }`}
                >
                  {hasJoined && isPaid ? 'Locked In (Paid) ✓' : hasJoined ? 'Leave Bet 🚪' : isExpired && !isCommissioner ? 'Closed' : 'Join Bet 🤝'}
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

            {/* SHARE TO SLEEPER CHAT BUTTON */}
            <button
              onClick={() => copyBetShareText(bet)}
              className="text-[11px] font-bold px-3 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700 transition-all flex items-center gap-1.5"
              title="Copy formatted summary to paste into Sleeper league chat"
            >
              📋 Share to Sleeper Chat
            </button>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800 text-xs text-gray-700 dark:text-gray-300 space-y-3">
          <div>
            <span className="font-bold text-gray-400 block text-[10px] uppercase mb-0.5">Details</span>
            {bet.description}
          </div>

          {/* Participants & Payment Status Checkboxes */}
          <div className="pt-2 border-t border-gray-200/60 dark:border-gray-700/60 space-y-2">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Participants & Payment Tracker (Unpaid entries do not count towards pot)</span>
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
  }
}