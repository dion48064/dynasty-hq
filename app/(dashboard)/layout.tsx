"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '../context/AuthContext';

const COMMISSIONER_TEAM = "Hampton Inn";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { teams, currentUser, login, logout } = useAuth();

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isRostersOpen, setIsRostersOpen] = useState(false);
  const [isFinancesOpen, setIsFinancesOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if (teams.length > 0 && !selectedTeam) {
      setSelectedTeam(teams[0]);
    }
  }, [teams]);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = login(selectedTeam || teams[0], passwordInput);
    if (res.success) {
      setShowModal(false);
      setPasswordInput('');
      setErrorMsg('');
    } else {
      setErrorMsg(res.error);
    }
  };

  const isRostersActive = pathname === '/rosters' || pathname === '/calculator' || pathname === '/finder';
  const isFinancesActive = pathname === '/dues' || pathname === '/bets';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      
      {/* LOGIN MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Manager Sign In 🔐</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Select your team profile and enter your password to sign in.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400">Select Team</label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {teams.map((t: string, idx: number) => (
                    <option key={idx} value={t}>{t}{t === COMMISSIONER_TEAM ? ' (Commissioner 🛡️)' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400">Password</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter password"
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {errorMsg && <p className="text-xs font-bold text-red-500 text-center">{errorMsg}</p>}

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                Sign In 🚀
              </button>
              
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full py-2 text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row justify-between items-center gap-3">
          
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto justify-between">
            <span className="font-black text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              DYNASTY HQ
            </span>

            {/* NAV CONTAINER */}
            <nav className="flex items-center gap-1.5 overflow-visible w-full md:w-auto py-1">
              
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  pathname === '/' 
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                League Home
              </Link>

              {/* ROSTERS DROPDOWN */}
              <div 
                className="relative group inline-block"
                onMouseEnter={() => setIsRostersOpen(true)}
                onMouseLeave={() => setIsRostersOpen(false)}
              >
                <div
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer select-none ${
                    isRostersActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  Rosters ▾
                </div>

                <div className="absolute top-full left-0 pt-1 w-48 hidden group-hover:block z-50">
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl py-1.5 space-y-0.5">
                    <Link
                      href="/rosters"
                      className={`block px-3.5 py-2 text-xs font-bold transition-colors ${
                        pathname === '/rosters'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      Team Rosters
                    </Link>
                    <Link
                      href="/calculator"
                      className={`block px-3.5 py-2 text-xs font-bold transition-colors ${
                        pathname === '/calculator'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      Trade Calculator
                    </Link>
                    <Link
                      href="/finder"
                      className={`block px-3.5 py-2 text-xs font-bold transition-colors ${
                        pathname === '/finder'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      Trade Finder
                    </Link>
                  </div>
                </div>
              </div>

              {/* FINANCES DROPDOWN (DUES, SIDE BETS) */}
              <div 
                className="relative group inline-block"
                onMouseEnter={() => setIsFinancesOpen(true)}
                onMouseLeave={() => setIsFinancesOpen(false)}
              >
                <div
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer select-none ${
                    isFinancesActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  Finances ▾
                </div>

                <div className="absolute top-full left-0 pt-1 w-48 hidden group-hover:block z-50">
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl py-1.5 space-y-0.5">
                    <Link
                      href="/dues"
                      className={`block px-3.5 py-2 text-xs font-bold transition-colors ${
                        pathname === '/dues'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      League Dues 💵
                    </Link>
                    <Link
                      href="/bets"
                      className={`block px-3.5 py-2 text-xs font-bold transition-colors ${
                        pathname === '/bets'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      Side Bets 🎲
                    </Link>
                  </div>
                </div>
              </div>

              {/* PUNISHMENTS TAB */}
              <Link
                href="/punishments"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  pathname === '/punishments' 
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                Punishments 💩
              </Link>

              <Link
                href="/history"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  pathname === '/history' 
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                League History
              </Link>

              {currentUser === COMMISSIONER_TEAM && (
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                    pathname === '/admin' 
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  Admin Hub 🛡️
                </Link>
              )}

            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* DARK MODE TOGGLE */}
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              {isDarkMode ? (
                <>
                  <span>☀️</span> Light
                </>
              ) : (
                <>
                  <span>🌙</span> Dark
                </>
              )}
            </button>

            {/* AUTH STATUS / SIGN IN */}
            <div>
              {currentUser ? (
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">{currentUser}</span>
                  <button
                    onClick={logout}
                    className="text-[10px] font-bold text-gray-400 hover:text-red-500 underline ml-1"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setSelectedTeam(teams[0] || '');
                    setShowModal(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
                >
                  Sign In 🔑
                </button>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </AuthProvider>
  );
}