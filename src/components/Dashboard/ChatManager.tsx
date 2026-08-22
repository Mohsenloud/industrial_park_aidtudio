import React, { useState, useEffect } from "react";
import { MessageSquare, User, Clock, ChevronLeft } from "lucide-react";
import ChatSystem from "../ChatSystem";

interface Conversation {
  id: string;
  unitId: string;
  guestId: string;
  guestName: string;
  guestPhone: string;
  lastMessageAt: string;
}

interface ChatManagerProps {
  unitId: string;
  unitName: string;
}

export default function ChatManager({ unitId, unitName }: ChatManagerProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (unitId) {
      fetchConversations();
      // Poll every 10 seconds for new conversations
      const interval = setInterval(fetchConversations, 10000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
      setConversations([]);
    }
  }, [unitId]);

  const fetchConversations = async () => {
    if (!unitId) return;
    try {
      const res = await fetch(`/api/chat/conversations/unit/${unitId}`);
      if (res.ok) {
        const data = await res.json().catch(() => []);
        setConversations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col md:flex-row h-[500px]">
      {/* Conversations List */}
      <div className="w-full md:w-1/3 border-l border-slate-100 flex flex-col bg-slate-50 shrink-0">
        <div className="p-4 border-b border-slate-100 bg-white">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-500" />
            <span>پیام‌های مشتریان</span>
            {conversations.length > 0 && (
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {conversations.length}
              </span>
            )}
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {loading ? (
             <div className="text-center text-xs text-slate-400 p-4">در حال دریافت...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-xs text-slate-400 p-4">هنوز گفتگویی ایجاد نشده است.</div>
          ) : (
            conversations.map((conv, idx) => (
              <button
                key={`${conv.id}-${idx}`}
                onClick={() => setSelectedConv(conv)}
                className={`w-full text-right p-3 rounded-xl transition-colors cursor-pointer border ${
                  selectedConv?.id === conv.id 
                    ? 'bg-white border-indigo-200 shadow-sm' 
                    : 'bg-transparent border-transparent hover:bg-slate-100'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="font-bold text-sm text-slate-800">{conv.guestName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(conv.lastMessageAt).toLocaleTimeString("fa-IR", {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono" style={{ direction: 'rtl' }}>
                  {conv.guestPhone}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="w-full md:w-2/3 flex-1 bg-white relative">
        {selectedConv ? (
          <div className="h-full relative overflow-hidden">
            {/* Using the ChatSystem component in owner mode but customized for embed */}
            <ChatSystem 
              unitId={unitId}
              unitName={unitName}
              isOpen={true}
              onClose={() => setSelectedConv(null)}
              isOwner={true}
            />
          </div>
        ) : (
          <div className="h-full flex flex-col justify-center items-center text-slate-400">
            <MessageSquare className="h-12 w-12 text-slate-200 mb-3" />
            <p className="text-sm">برای شروع، یک گفتگو را انتخاب کنید.</p>
          </div>
        )}
      </div>
    </div>
  );
}
