'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type ChatbotContextType = {
  chatContext: string;
  setChatContext: (context: string) => void;
  pageTitle: string;
  setPageTitle: (title: string) => void;
};

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

export function ChatbotProvider({ children }: { children: ReactNode }) {
  const [chatContext, setChatContext] = useState<string>('');
  const [pageTitle, setPageTitle] = useState<string>('');

  return (
    <ChatbotContext.Provider value={{ chatContext, setChatContext, pageTitle, setPageTitle }}>
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbotContext() {
  const context = useContext(ChatbotContext);
  if (context === undefined) {
    throw new Error('useChatbotContext must be used within a ChatbotProvider');
  }
  return context;
}
