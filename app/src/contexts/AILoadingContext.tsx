import React, {createContext, useContext} from 'react';

interface AILoadingContextType {
  setNodeLoading: (nodeId: string, loading: boolean) => void;
}

const AILoadingContext = createContext<AILoadingContextType | undefined>(undefined);

interface AILoadingProviderProps {
  children: React.ReactNode;
  setNodeLoading: (nodeId: string, loading: boolean) => void;
}

export const AILoadingProvider: React.FC<AILoadingProviderProps> = ({children, setNodeLoading}) => {
  return <AILoadingContext.Provider value={{setNodeLoading}}>{children}</AILoadingContext.Provider>;
};

export const useAILoadingContext = () => {
  const context = useContext(AILoadingContext);
  if (context === undefined) {
    throw new Error('useAILoadingContext must be used within an AILoadingProvider');
  }
  return context;
};
