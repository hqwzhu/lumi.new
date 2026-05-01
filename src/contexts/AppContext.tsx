import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import * as authService from '../services/authService';

interface UserProfile {
  uid: string;
  username: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  balance: number;
  role: string;
  phone?: string;
  provider: 'custom' | 'google';
}

interface Agent {
  id: string;
  ownerUid: string;
  name: string;
  category: string;
  data: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

interface AIConfig {
  provider: string;
  model: string;
  apiKey: string;
}

interface AppContextType {
  user: UserProfile | null;
  loading: boolean;
  agents: Agent[];
  aiConfig: AIConfig;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  createAgent: (name: string, category: string, data: any) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
  updateBalance: (amount: number) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateAIConfig: (config: Partial<AIConfig>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
    const saved = localStorage.getItem('lumi_ai_config');
    return saved ? JSON.parse(saved) : { provider: 'gemini', model: 'gemini-1.5-flash', apiKey: '' };
  });

  const updateAIConfig = (newConfig: Partial<AIConfig>) => {
    setAiConfig(prev => {
      const updated = { ...prev, ...newConfig };
      localStorage.setItem('lumi_ai_config', JSON.stringify(updated));
      return updated;
    });
    toast.success('Neural core configuration synchronized');
  };

  const refreshUser = async () => {
    setLoading(true);
    try {
      const customAuth = await authService.getMe();
      if (customAuth) {
        setUser({ ...customAuth.user, provider: 'custom' } as any);
        // Fetch agents
        const agentsRes = await fetch('/api/agents');
        if (agentsRes.ok) {
          const agentsData = await agentsRes.json();
          setAgents(agentsData);
        }
      } else {
        setUser(null);
        setAgents([]);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async () => {
    // This could be a trigger for a login modal if needed, 
    // but for now we'll just keep it as a placeholder for the custom auth flow
    toast.info('Please use the login form to authenticate.');
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setAgents([]);
      toast.info('Returned to the mortal realm');
    } catch (error: any) {
      toast.error('Logout failed: ' + error.message);
    }
  };

  const createAgent = async (name: string, category: string, data: any) => {
    if (!user) {
      toast.error('You must be authenticated to synthesize agents');
      return;
    }

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, data: JSON.stringify(data) })
      });

      if (!response.ok) throw new Error('Failed to create agent');
      
      const newAgent = await response.json();
      setAgents(prev => [...prev, newAgent]);
      toast.success(`${name} has been synthesized`);
    } catch (error: any) {
      console.error('Synthesis error:', error);
      toast.error('Synthesis failed: ' + error.message);
    }
  };

  const deleteAgent = async (id: string) => {
    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete agent');
      
      setAgents(prev => prev.filter(a => a.id !== id));
      toast.success('Agent essence has been released');
    } catch (error: any) {
      console.error('Deletion error:', error);
      toast.error('Deletion failed: ' + error.message);
    }
  };

  const updateBalance = async (amount: number) => {
    // Local balance update logic could be added here
    toast.info('Balance updates are handled by the core system.');
  };

  return (
    <AppContext.Provider value={{ 
      user, 
      loading, 
      agents, 
      aiConfig,
      login, 
      logout, 
      createAgent, 
      deleteAgent, 
      updateBalance, 
      refreshUser,
      updateAIConfig
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
