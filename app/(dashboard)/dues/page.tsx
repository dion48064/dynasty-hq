"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface DueRecord {
  id: string;
  team: string;
  manager: string;
  amount: number;
  paid: boolean;
  datePaid: string;
  note?: string;
}

const ADMIN_TEAM = "Hampton Inn";
const STORAGE_VERSION = "v2_dues_2026"; // Bumped version to reset old localStorage data

export default function LeagueDuesPage() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser === ADMIN_TEAM;

  const [dueDate, setDueDate] = useState("2026-09-01");
  const [paymentInfo, setPaymentInfo] = useState({ venmo: "@Dion-VanBoekel", cashapp: "$DKVPhoto" });
  const [duesList, setDuesList] = useState<DueRecord[]>([
    { id: '1', team: 'X Gon Give It To Ya', manager: 'Eckler34', amount: 50, paid: false, datePaid: '' },
    { id: '2', team: 'BIGMEATYCLAWS', manager: 'AdAMMAiN', amount: 50, paid: false, datePaid: '' },
    { id: '3', team: 'Team Andeezy', manager: 'Andeezy', amount: 0, paid: true, datePaid: 'N/A', note: '3rd Place Prize (Buy-in Covered)' },
    { id: '4', team: 'You Slept On My Couch', manager: 'MacDaddy1997', amount: 50, paid: false, datePaid: '' },
    { id: '5', team: 'Team RickCity97', manager: 'RickCity97', amount: 50, paid: false, datePaid: '' },
    { id: '6', team: 'Hampton Inn', manager: 'Dionvanboekel', amount: 50, paid: true, datePaid: '2026-06-01' },
    { id: '7', team: 'Concussion KINGZ', manager: 'bcphotos', amount: 50, paid: false, datePaid: '' },
    { id: '8', team: 'Team splitereggs', manager: 'splitereggs', amount: 50, paid: false, datePaid: '' },
    { id: '9', team: 'I Chase Brown Kids', manager: 'Jshaner215', amount: 50, paid: false, datePaid: '' },
    { id: '10', team: 'Jeanty and Juice', manager: 'LTran21', amount: 50, paid: false, datePaid: '' },
    { id: '11', team: "Wa'Conner For Two Weeks", manager: 'JamalMcTiggles', amount: 50, paid: false, datePaid: '' },
    { id: '12', team: 'Team raiderranger', manager: 'raiderranger', amount: 100, paid: false, datePaid: '', note: 'Punishment (Pays 3rd Place Buy-in)' },
  ]);

  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [newDueDate, setNewDueDate] = useState(dueDate);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [venmoInput, setVenmoInput] = useState(paymentInfo.venmo);
  const [cashappInput, setCashappInput] = useState(paymentInfo.cashapp);

  useEffect(() => {
    const savedVersion = localStorage.getItem('league_dues_version');
    const savedDues = localStorage.getItem('league_dues_data');
    
    if (savedVersion === STORAGE_VERSION && savedDues) {
      try {
        const parsed = JSON.parse(savedDues);
        if (parsed.duesList) setDuesList(parsed.duesList);
        if (parsed.dueDate) setDueDate(parsed.dueDate);
        if (parsed.paymentInfo) setPaymentInfo(parsed.paymentInfo);
      } catch (e) {
        console.error("Failed to load dues state", e);
      }
    } else {
      // If version doesn't match, force save the updated default state
      localStorage.setItem('league_dues_version', STORAGE_VERSION);
      saveToStorage(duesList, dueDate, paymentInfo);
    }
  }, []);

  const saveToStorage = (updatedDues: DueRecord[], updatedDate: string, updatedPayment: any) => {
    setDuesList(updatedDues);
    setDueDate(updatedDate);
    setPaymentInfo(updatedPayment);
    localStorage.setItem('league_dues_version', STORAGE_VERSION);
    localStorage.setItem('league_dues_data', JSON.stringify({
      duesList: updatedDues,
      dueDate: updatedDate,
      paymentInfo: updatedPayment
    }));
  };

  const togglePaidStatus = (id: string) => {
    if (!isAdmin) return;
    const updated = duesList.map(item => {
      if (item.id === id) {
        const nextPaid = !item.paid;
        return {
          ...item,
          paid: nextPaid,
          datePaid: nextPaid ? new Date().toISOString().split('T')[0] : ''
        };
      }
      return item;
    });
    saveToStorage(updated, dueDate, paymentInfo);
  };

  const handleSaveDueDate = (e: React.FormEvent) => {
    e.preventDefault();
    saveToStorage(duesList, newDueDate, paymentInfo);
    setIsEditingDueDate(false);
  };

  const handleSavePaymentInfo = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPayment = { venmo: venmoInput, cashapp: cashappInput };
    saveToStorage(duesList, dueDate, updatedPayment);
    setIsEditingPayment(false);
  };

  const sortedDuesList = [...duesList].sort((a, b) => {
    if (a.paid === b.paid) return 0;
    return a.paid ? 1 : -1;
  });

  const totalCollected = duesList.filter(item => item.paid).reduce((acc, item) => acc + item.amount, 0);
  const totalOutstanding = duesList.filter(item => !item.paid).reduce((acc, item) => acc + item.amount, 0);

  return (
    <div className="space-y-8 pb-10">
      
      {/* HEADER & PAYMENT INFO CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">League Dues & Payments 💵</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs font-medium">
              Submit your entry fees prior to the deadline. Unpaid teams stay at the top until settled!
            </p>
          </div>

          <div className="flex flex-wrap gap-4 items-center pt-2">
            <div className="bg-gray-50 dark:bg-gray-800/60 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <span className="text-xs">📅</span>
              <div>
                <span className="text-[10px] font-extrabold uppercase text-gray-400 block">Due Date</span>
                <span className="text-xs font-bold text-gray-900 dark:text-white font-mono">{dueDate}</span>
              </div>
              {isAdmin && !isEditingDueDate && (
                <button
                  onClick={() => { setNewDueDate(dueDate); setIsEditingDueDate(true); }}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 ml-2 hover:underline"
                >
                  Edit
                </button>
              )}
            </div>

            {isAdmin && isEditingDueDate && (
              <form onSubmit={handleSaveDueDate} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700">
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-900 dark:text-white"
                />
                <button type="submit" className="px-3 py-1 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-xs">Save</button>
                <button type="button" onClick={() => setIsEditingDueDate(false)} className="text-xs text-gray-400 px-1">Cancel</button>
              </form>
            )}

            <div className="flex gap-3 ml-auto">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-3 py-2 rounded-xl text-right">
                <span className="text-[9px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 block">Collected</span>
                <span className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-300">${totalCollected}</span>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-3 py-2 rounded-xl text-right">
                <span className="text-[9px] font-extrabold uppercase text-amber-600 dark:text-amber-400 block">Remaining</span>
                <span className="font-mono text-sm font-black text-amber-700 dark:text-amber-300">${totalOutstanding}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PAYMENT HANDLES CARD */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-extrabold uppercase text-gray-400 tracking-wider">Payment Handles</h3>
            {isAdmin && !isEditingPayment && (
              <button
                onClick={() => { setVenmoInput(paymentInfo.venmo); setCashappInput(paymentInfo.cashapp); setIsEditingPayment(true); }}
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Edit Handles
              </button>
            )}
          </div>

          {!isEditingPayment ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-xl border border-gray-200/60 dark:border-gray-800">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Venmo:</span>
                <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">{paymentInfo.venmo || 'None'}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-xl border border-gray-200/60 dark:border-gray-800">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">CashApp:</span>
                <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">{paymentInfo.cashapp || 'None'}</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSavePaymentInfo} className="space-y-2">
              <input
                type="text"
                placeholder="Venmo (@handle)"
                value={venmoInput}
                onChange={(e) => setVenmoInput(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="CashApp ($tag)"
                value={cashappInput}
                onChange={(e) => setCashappInput(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
              />
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 py-1 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-xs">Save</button>
                <button type="button" onClick={() => setIsEditingPayment(false)} className="px-3 py-1 text-xs text-gray-400">Cancel</button>
              </div>
            </form>
          )}
        </div>

      </div>

      {/* DUES TABLE */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Team Dues Tracker</h2>
          </div>
          {isAdmin && (
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-full">
              🛡️ Admin Mode: Click any row to toggle payment status
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="pb-2.5 font-bold">Team / Manager</th>
                <th className="pb-2.5 font-bold text-center">Amount</th>
                <th className="pb-2.5 font-bold text-center">Status</th>
                <th className="pb-2.5 font-bold text-right">Date Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
              {sortedDuesList.map((item) => (
                <tr 
                  key={item.id} 
                  onClick={() => togglePaidStatus(item.id)}
                  className={`transition-colors ${isAdmin ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40' : ''} ${item.paid ? 'opacity-60 bg-gray-50/50 dark:bg-gray-900/30' : ''}`}
                >
                  <td className="py-3">
                    <span className="font-bold text-gray-900 dark:text-white block">{item.team}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400 font-normal">({item.manager})</span>
                      {item.note && (
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
                          {item.note}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-center font-mono font-bold text-gray-700 dark:text-gray-300">
                    ${item.amount}
                  </td>
                  <td className="py-3 text-center">
                    {item.paid ? (
                      <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold px-2.5 py-1 rounded-full text-[10px]">
                        PAID ✅
                      </span>
                    ) : (
                      <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold px-2.5 py-1 rounded-full text-[10px]">
                        UNPAID ⏳
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right font-mono text-gray-500 dark:text-gray-400">
                    {item.datePaid || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}