"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/app/context/AuthContext';

const COMMISSIONER_USER = "dionvanboekel";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { users, currentUser, login, logout } = useAuth();

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedUsername, setSelectedUsername] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [isRostersDropdownOpen, setIsRostersDropdownOpen] = useState(false);
  const [isFinancesDropdownOpen, setIsFinancesDropdownOpen] = useState(false);
  const [isInfoDropdownOpen, setIsInfoDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

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
    if (users.length > 0 && !selectedUsername) {
      setSelectedUsername(users[0].username);
    }
  }, [users]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRostersDropdownOpen(false);
        setIsFinancesDropdownOpen(false);
        setIsInfoDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    const targetUser = selectedUsername || (users[0] && users[0].username);
    const res = login(targetUser, passwordInput);
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
  const isInfoActive = pathname === '/history' || pathname === '/analytics' || pathname === '/punishments' || pathname === '/schedule';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      
      {/* LOGIN MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Manager Sign In 🔐</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Select your manager username and enter your password to sign in.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400">Select Manager Profile</label>
                <select
                  value={selectedUsername}
                  onChange={(e) => setSelectedUsername(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {users.map((u: any, idx: number) => (
                    <option key={idx} value={u.username}>
                      {u.username} ({u.teamName}){u.username === COMMISSIONER_USER ? ' (Commissioner 🛡️)' : ''}
                    </option>
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
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 shadow-sm" ref={dropdownRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-6">
            <span className="font-black text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent shrink-0">
              DYNASTY HQ
            </span>

            {/* DESKTOP NAV (Hidden on mobile) */}
            <nav className="hidden lg:flex items-center gap-1.5">
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
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => {
                    setIsRostersDropdownOpen(!isRostersDropdownOpen);
                    setIsFinancesDropdownOpen(false);
                    setIsInfoDropdownOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer select-none ${
                    isRostersActive
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  Rosters ▾
                </button>

                {isRostersDropdownOpen && (
                  <div className="absolute top-full left-0 pt-1 w-48 z-50">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl py-1.5 space-y-0.5">
                      <Link
                        href="/rosters"
                        onClick={() => setIsRostersDropdownOpen(false)}
                        className={`block px-3.5 py-2 text-xs font-bold transition-colors ${pathname === '/rosters' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                      >
                        Team Rosters
                      </Link>
                      <Link
                        href="/calculator"
                        onClick={() => setIsRostersDropdownOpen(false)}
                        className={`block px-3.5 py-2 text-xs font-bold transition-colors ${pathname === '/calculator' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                      >
                        Trade Calculator
                      </Link>
                      <Link
                        href="/finder"
                        onClick={() => setIsRostersDropdownOpen(false)}
                        className={`block px-3.5 py-2 text-xs font-bold transition-colors ${pathname === '/finder' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                      >
                        Trade Finder
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* FINANCES DROPDOWN */}
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => {
                    setIsFinancesDropdownOpen(!isFinancesDropdownOpen);
                    setIsRostersDropdownOpen(false);
                    setIsInfoDropdownOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer select-none ${
                    isFinancesActive ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  Finances ▾
                </button>

                {isFinancesDropdownOpen && (
                  <div className="absolute top-full left-0 pt-1 w-48 z-50">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl py-1.5 space-y-0.5">
                      <Link
                        href="/dues"
                        onClick={() => setIsFinancesDropdownOpen(false)}
                        className={`block px-3.5 py-2 text-xs font-bold transition-colors ${pathname === '/dues' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                      >
                        League Dues 💵
                      </Link>
                      <Link
                        href="/bets"
                        onClick={() => setIsFinancesDropdownOpen(false)}
                        className={`block px-3.5 py-2 text-xs font-bold transition-colors ${pathname === '/bets' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                      >
                        Side Bets 🎲
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* LEAGUE INFO DROPDOWN */}
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => {
                    setIsInfoDropdownOpen(!isInfoDropdownOpen);
                    setIsRostersDropdownOpen(false);
                    setIsFinancesDropdownOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer select-none ${
                    isInfoActive ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  League Information ▾
                </button>

                {isInfoDropdownOpen && (
                  <div className="absolute top-full left-0 pt-1 w-52 z-50">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl py-1.5 space-y-0.5">
                      <Link
                        href="/schedule"
                        onClick={() => setIsInfoDropdownOpen(false)}
                        className={`block px-3.5 py-2 text-xs font-bold transition-colors ${pathname === '/schedule' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                      >
                        📅 League Schedule
                      </Link>
                      <Link
                        href="/history"
                        onClick={() => setIsInfoDropdownOpen(false)}
                        className={`block px-3.5 py-2 text-xs font-bold transition-colors ${pathname === '/history' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                      >
                        📜 League History
                      </Link>
                      <Link
                        href="/analytics"
                        onClick={() => setIsInfoDropdownOpen(false)}
                        className={`block px-3.5 py-2 text-xs font-bold transition-colors ${pathname === '/analytics' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                      >
                        📊 League Analytics
                      </Link>
                      <Link
                        href="/punishments"
                        onClick={() => setIsInfoDropdownOpen(false)}
                        className={`block px-3.5 py-2 text-xs font-bold transition-colors ${pathname === '/punishments' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                      >
                        🚷 2026 Punishments
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {currentUser === COMMISSIONER_USER && (
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                    pathname === '/admin' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60' : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                  }`}
                >
                  Admin Hub 🛡️
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              {isDarkMode ? <><span>☀️</span></> : <><span>🌙</span></>}
            </button>

            <div className="hidden sm:block">
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
                    setSelectedUsername(users[0]?.username || '');
                    setShowModal(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
                >
                  Sign In 🔑
                </button>
              )}
            </div>

            {/* MOBILE HAMBURGER BUTTON */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              aria-label="Toggle Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

        </div>

        {/* MOBILE DROPDOWN MENU */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4 space-y-4 shadow-xl">
            
            {/* User Profile Info on Mobile */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 sm:hidden">
              {currentUser ? (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white">{currentUser}</span>
                  <button
                    onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                    className="text-[10px] font-bold text-red-500 underline ml-2"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setSelectedUsername(users[0]?.username || '');
                    setShowModal(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-sm"
                >
                  Sign In 🔑
                </button>
              )}
            </div>

            <nav className="space-y-1">
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  pathname === '/' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                League Home
              </Link>

              <div className="pt-2 pb-1 px-3 text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Rosters & Trades</div>
              <Link
                href="/rosters"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  pathname === '/rosters' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                Team Rosters
              </Link>
              <Link
                href="/calculator"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  pathname === '/calculator' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                Trade Calculator
              </Link>
              <Link
                href="/finder"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  pathname === '/finder' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                Trade Finder
              </Link>

              <div className="pt-2 pb-1 px-3 text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Finances</div>
              <Link
                href="/dues"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  pathname === '/dues' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                League Dues 💵
              </Link>
              <Link
                href="/bets"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  pathname === '/bets' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                Side Bets 🎲
              </Link>

              <div className="pt-2 pb-1 px-3 text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">League Information</div>
              <Link
                href="/schedule"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  pathname === '/schedule' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                📅 League Schedule
              </Link>
              <Link
                href="/history"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  pathname === '/history' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                📜 League History
              </Link>
              <Link
                href="/analytics"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  pathname === '/analytics' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                📊 League Analytics
              </Link>
              <Link
                href="/punishments"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  pathname === '/punishments' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                🚷 2026 Punishments
              </Link>

              {currentUser === COMMISSIONER_USER && (
                <>
                  <div className="pt-2 pb-1 px-3 text-[10px] uppercase font-extrabold text-amber-500 tracking-wider">Commissioner</div>
                  <Link
                    href="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                      pathname === '/admin' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    Admin Hub 🛡️
                  </Link>
                </>
              )}
            </nav>

          </div>
        )}
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