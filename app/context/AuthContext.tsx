"use client";

import { createContext, useContext, useState, useEffect } from 'react';

const SLEEPER_LEAGUE_ID = "1312122584644476928";
const COMMISSIONER_USER = "dionvanboekel";
const DEFAULT_COMMISSIONER_PASS = "Allendale1997!";

const AuthContext = createContext<any>(null);

export interface UserProfile {
  username: string;
  displayName: string;
  teamName: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [passwords, setPasswords] = useState<Record<string, string>>({
    [COMMISSIONER_USER]: DEFAULT_COMMISSIONER_PASS
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      try {
        const [usersRes, rostersRes] = await Promise.all([
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/users`),
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/rosters`)
        ]);
        
        const usersData = await usersRes.json();
        const rostersData = await rostersRes.json();

        const ownerToTeamMap: Record<string, string> = {};
        if (Array.isArray(rostersData)) {
          rostersData.forEach((r: any) => {
            if (r.owner_id) {
              const tName = r.metadata?.team_name || r.settings?.team_name;
              if (tName) ownerToTeamMap[r.owner_id] = tName;
            }
          });
        }
        
        const resolvedUsers: UserProfile[] = [];
        const teamNames: string[] = [];

        if (Array.isArray(usersData)) {
          usersData.forEach((u: any) => {
            const username = u.username || u.display_name.toLowerCase();
            const displayName = u.display_name || username;
            const teamName = ownerToTeamMap[u.user_id] || u.metadata?.team_name || displayName;

            resolvedUsers.push({
              username,
              displayName,
              teamName
            });
            teamNames.push(teamName);
          });
        }

        setUsers(resolvedUsers);
        setTeams(teamNames);

        const savedPasses = localStorage.getItem('league_passwords');
        if (savedPasses) {
          setPasswords(JSON.parse(savedPasses));
        } else {
          const initialPasses: Record<string, string> = { [COMMISSIONER_USER]: DEFAULT_COMMISSIONER_PASS };
          resolvedUsers.forEach(u => {
            if (u.username !== COMMISSIONER_USER) initialPasses[u.username] = 'password123';
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

  const login = (username: string, pass: string) => {
    const validPass = passwords[username] || 'password123';
    if (pass === validPass) {
      setCurrentUser(username);
      localStorage.setItem('current_user', username);
      return { success: true };
    }
    return { success: false, error: "Incorrect password for this username." };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('current_user');
  };

  const commissionerResetPassword = (username: string, newPass: string) => {
    const updated = { ...passwords, [username]: newPass };
    setPasswords(updated);
    localStorage.setItem('league_passwords', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ users, teams, currentUser, login, logout, passwords, commissionerResetPassword, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}