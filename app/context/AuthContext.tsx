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
        const [usersRes, rostersRes, dbRes] = await Promise.all([
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/users`),
          fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/rosters`),
          fetch('/api/league-data').catch(() => null)
        ]);
        
        const usersData = await usersRes.json();
        const rostersData = await rostersRes.json();
        const dbData = dbRes && dbRes.ok ? await dbRes.json() : {};

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

        // Load passwords from cloud database or initialize defaults
        let cloudPasswords = dbData.passwords || {};
        if (!cloudPasswords[COMMISSIONER_USER]) {
          cloudPasswords[COMMISSIONER_USER] = DEFAULT_COMMISSIONER_PASS;
        }
        resolvedUsers.forEach(u => {
          if (!cloudPasswords[u.username] && u.username !== COMMISSIONER_USER) {
            cloudPasswords[u.username] = 'password123';
          }
        });

        setPasswords(cloudPasswords);

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

  const commissionerResetPassword = async (username: string, newPass: string) => {
    const updated = { ...passwords, [username]: newPass };
    setPasswords(updated);

    try {
      const getRes = await fetch('/api/league-data');
      const currentDb = getRes.ok ? await getRes.json() : {};

      const payload = {
        ...currentDb,
        passwords: updated
      };

      await fetch('/api/league-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error("Failed to save password to cloud database", err);
    }
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