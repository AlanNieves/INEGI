import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface FoliosContextType {
  selectedFolios: string[];
  setSelectedFolios: (folios: string[]) => void;
  clearFolios: () => void;
}

const FoliosContext = createContext<FoliosContextType | undefined>(undefined);

export function FoliosProvider({ children }: { children: ReactNode }) {
  const [selectedFolios, setSelectedFolios] = useState<string[]>([]);

  const clearFolios = () => setSelectedFolios([]);

  return (
    <FoliosContext.Provider value={{ selectedFolios, setSelectedFolios, clearFolios }}>
      {children}
    </FoliosContext.Provider>
  );
}

export function useFolios() {
  const context = useContext(FoliosContext);
  if (!context) {
    throw new Error('useFolios debe usarse dentro de FoliosProvider');
  }
  return context;
}
