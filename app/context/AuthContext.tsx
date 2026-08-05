"use client";

import { createContext, useContext, useState, useEffect } from 'react';

const SLEEPER_LEAGUE_ID = "1312122584644476928";
const COMMISSIONER_TEAM = "Hampton Inn";
const DEFAULT_COMMISSIONER_PASS = "Allendale1997!";

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [passwords, setPasswords] = useState<Record<string, string>>({
    [COMMISSIONER_TEAM]: DEFAULT_COMMISSIONER_PASS
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      try {
        // Load team names from Sleeper
        const usersRes = await fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/users`);
        const usersData = await usersRes.json();
        
        const teamNames: string[] = [];
        if (Array.isArray(usersData)) {
          usersData.forEach((u: any) => {
            teamNames.push(u.metadata?.team_name || u.display_name || `Team ${u.user_id.slice(-4)}`);
          });
        }
        setTeams(teamNames);

        // Load saved passwords & session from localStorage if available
        const savedPasses = localStorage.getItem('league_passwords');
        if (savedPasses) {
          setPasswords(JSON.parse(savedPasses));
        } else {
          // Initialize default passwords for all teams (default to team name lowercase or blank)
          const initialPasses: Record<string, string> = { [COMMISSIONER_TEAM]: DEFAULT_COMMISSIONER_PASS };
          teamNames.forEach(t => {
            if (t !== COMMISSIONER_TEAM) initialPasses[t] = 'password123'; // Default starter password
          });
          setPasswords(initialPasses);
          localStorage.setItem('league_passwords', JSON.stringify(initialPasses));
        }

        const savedUser = localStorage.getItem('current_user');
        if (savedUser) setCurrentUser(savedUser);

        setIsLoading(false);
      } catch (err) {
        console.error("Failed to initialize auth context:", err);
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = (teamName: string, pass: string) => {
    const validPass = passwords[teamName] || 'password123';
    if (pass === validPass) {
      setCurrentUser(teamName);
      localStorage.setItem('current_user', teamName);
      return { success: true };
    }
    return { success: false, error: "Incorrect password for this team." };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('current_user');
  };

  // Commissioner function to reset a team's password
  const commissionerResetPassword = (teamName: string, newPass: string) => {
    const updated = { ...passwords, [teamName]: newPass };
    setPasswords(updated);
    localStorage.setItem('league_passwords', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ teams, currentUser, login, logout, passwords, commissionerResetPassword, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}