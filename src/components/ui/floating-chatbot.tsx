'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, X, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { askAiChat } from '@/ai/flows/chat-flow';
import { useChatbotContext } from '@/contexts/chatbot-context';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export function FloatingChatbot() {
  const pathname = usePathname();
  const { chatContext, pageTitle } = useChatbotContext();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const [isOpen, setIsOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const isVisible = pathname.startsWith('/abc-analysis') || pathname.startsWith('/cross-analysis');

  const [hasNewMessages, setHasNewMessages] = useState(false);

  useEffect(() => {
    if (!isVisible && isOpen) setIsOpen(false);
  }, [isVisible, isOpen]);

  // Save chat history when the chatbot is closed
  useEffect(() => {
    if (!isOpen && hasNewMessages && chatMessages.length > 0 && firestore && user) {
      const saveHistory = async () => {
        try {
          await addDoc(collection(firestore, 'ai_analyses'), {
            userId: user.uid,
            createdAt: serverTimestamp(),
            period: 'チャット履歴',
            storeIds: [],
            storeNames: pageTitle || 'データ打合せ',
            insights: [],
            summary: 'チャット履歴',
            type: 'chat',
            chatHistory: chatMessages,
          });
          setHasNewMessages(false);
        } catch (saveError) {
          console.error("Error saving chat to history:", saveError);
        }
      };
      saveHistory();
    }
  }, [isOpen, hasNewMessages, chatMessages, firestore, user, pageTitle]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  const handleSendChat = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    
    const userMsg = chatInput.trim();
    setChatInput('');
    const newMessages = [...chatMessages, { role: 'user' as const, text: userMsg }];
    setChatMessages(newMessages);
    setIsChatLoading(true);

    try {
      const res = await askAiChat({
        message: userMsg,
        context: chatContext || '現在画面にデータが表示されていません。',
      });
      
      if (res.success) {
        const finalMessages = [...newMessages, { role: 'ai' as const, text: res.text }];
        setChatMessages(finalMessages);
        setHasNewMessages(true);
      } else {
        toast({ variant: "destructive", title: "エラー", description: "AIからの応答に失敗しました。" });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "エラー", description: "AIからの応答に失敗しました。" });
    } finally {
      setIsChatLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <Button
            onClick={() => setIsOpen(true)}
            size="icon"
            className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 hover:scale-105 transition-all duration-300"
          >
            <MessageCircle className="h-6 w-6 text-primary-foreground" />
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[350px] md:w-[400px] h-[550px] max-h-[80vh] flex flex-col bg-background border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5">
          <div className="bg-primary p-4 flex items-center justify-between text-primary-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div>
                <span className="font-bold text-sm block">データ打合せ</span>
                <span className="text-xs opacity-80">{pageTitle || 'AIアシスタント'}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary/80 rounded-full" onClick={() => setIsOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-muted/20">
            <div className="flex flex-col gap-1 max-w-[85%]">
              <span className="text-xs font-bold text-muted-foreground ml-1">AIアシスタント</span>
              <div className="bg-muted p-3 rounded-2xl rounded-tl-sm text-sm whitespace-pre-wrap shadow-sm">
                現在の画面データについて、ご相談や気になる点はありますか？<br/>
                （チャットのやり取りは自動的にAI分析の履歴に保存されます）
              </div>
            </div>
            {chatMessages.map((msg, i) => (
              <div key={i} className={cn("flex flex-col gap-1 max-w-[85%]", msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start")}>
                <span className="text-xs font-bold text-muted-foreground mx-1">
                  {msg.role === 'user' ? 'あなた' : 'AIアシスタント'}
                </span>
                <div className={cn("p-3 rounded-2xl text-sm whitespace-pre-wrap shadow-sm", 
                  msg.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"
                )}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex flex-col gap-1 max-w-[85%] mr-auto items-start">
                <div className="bg-muted p-3 rounded-2xl rounded-tl-sm text-sm shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="p-3 bg-background border-t flex gap-2">
            <input 
              type="text" 
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendChat()}
              placeholder="質問を入力..."
              className="flex-1 text-sm bg-muted/50 border rounded-full px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <Button onClick={handleSendChat} disabled={isChatLoading || !chatInput.trim()} size="icon" className="rounded-full shrink-0 shadow-sm">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
