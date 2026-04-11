import React, { createContext, useContext, useEffect } from 'react';
import { usePersistentUserMemory } from '@/hooks/usePersistentUserMemory';
import { useAuth } from '@/hooks/useAuth';

type MemoryContextType = ReturnType<typeof usePersistentUserMemory>;

const MemoryContext = createContext<MemoryContextType | null>(null);

export function useMemoryContext() {
  const ctx = useContext(MemoryContext);
  if (!ctx) {
    throw new Error('useMemoryContext must be used within PersistentUserMemoryProvider');
  }
  return ctx;
}

// Safe version that won't throw if used outside provider
export function useMemoryContextSafe(): MemoryContextType | null {
  return useContext(MemoryContext);
}

export function PersistentUserMemoryProvider({ children }: { children: React.ReactNode }) {
  const memory = usePersistentUserMemory();
  const { user } = useAuth();

  // Auto-migrate anonymous session to user on login
  useEffect(() => {
    if (user?.id) {
      memory.migrateSessionToUser(user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <MemoryContext.Provider value={memory}>
      {children}
    </MemoryContext.Provider>
  );
}
