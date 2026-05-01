import React from 'react';
import { motion } from 'motion/react';
import { DesktopUI } from '../../components/DesktopUI';

interface DesktopPlatformProps {
  t: any;
  user: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogin: () => void;
  setUiMode: (mode: 'web' | 'desktop' | 'mobile') => void;
  renderTabContent: (tab: string) => React.ReactNode;
}

export function DesktopPlatform({ 
  t, 
  user, 
  activeTab, 
  setActiveTab, 
  onLogin, 
  setUiMode, 
  renderTabContent 
}: DesktopPlatformProps) {
  return (
    <motion.div
      key="desktop-mode"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="h-screen w-full"
    >
      <DesktopUI 
        t={t}
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogin={onLogin}
        onExit={() => setUiMode('web')}
        renderTabContent={renderTabContent}
      />
    </motion.div>
  );
}
