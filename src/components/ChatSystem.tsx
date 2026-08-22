import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Send, X, User, MessageCircle } from "lucide-react";

interface Message {
  id: string;
  conversationId: string;
  sender: "guest" | "owner";
  content: string;
  createdAt: string;
  isRead: string;
}

interface Conversation {
  id: string;
  unitId: string;
  guestId: string;
  guestName: string;
  guestPhone: string;
  lastMessageAt: string;
}

interface ChatSystemProps {
  unitId: string;
  unitName: string;
  isOpen: boolean;
  onClose: () => void;
  isOwner?: boolean;
  isEmbedded?: boolean;
  selectedConversationId?: string; // used for owner to load specific conv
}

export default function ChatSystem({ unitId, unitName, isOpen, onClose, isOwner = false, isEmbedded = false, selectedConversationId }: ChatSystemProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [guestInfo, setGuestInfo] = useState({ name: "", phone: "" });
  const [hasJoined, setHasJoined] = useState(false);

  // Generate or retrieve guestId
  const getGuestId = () => {
    let id = localStorage.getItem("chat_guest_id");
    if (!id) {
      id = `guest_${Date.now()}`;
      localStorage.setItem("chat_guest_id", id);
    }
    return id;
  };

  useEffect(() => {
    if (!isOpen) return;

    let newSocket: Socket | null = null;
    try {
      newSocket = io({
        transports: ["polling", "websocket"],
        autoConnect: true,
        reconnectionAttempts: 3
      });
      setSocket(newSocket);
    } catch (e) {
      console.warn("Socket initialization error:", e);
    }

    // If owner and a conversation is selected
    if (isOwner && selectedConversationId) {
      setConversation({ id: selectedConversationId, unitId, guestId: "", guestName: "", guestPhone: "", lastMessageAt: "" });
      setHasJoined(true);
      fetch(`/api/chat/messages/${selectedConversationId}`)
        .then(res => res.ok ? res.json() : [])
        .then(msgs => {
          if (Array.isArray(msgs)) setMessages(msgs);
        })
        .catch(err => console.warn("Failed to load chat messages:", err));

      if (newSocket) {
        newSocket.emit("join_conversation", selectedConversationId);
      }
    }
    
    // If guest, try to load existing conversation
    if (!isOwner) {
      const guestId = getGuestId();
      fetch(`/api/chat/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId,
          guestId,
          guestName: localStorage.getItem("chat_guest_name") || "مهمان",
          guestPhone: localStorage.getItem("chat_guest_phone") || ""
        })
      })
      .then(res => res.ok ? res.json() : null)
      .then(conv => {
        if (!conv) return;
        setConversation(conv);
        setHasJoined(!!localStorage.getItem("chat_guest_name"));
        
        // Fetch messages
        fetch(`/api/chat/messages/${conv.id}`)
          .then(res => res.ok ? res.json() : [])
          .then(msgs => {
            if (Array.isArray(msgs)) setMessages(msgs);
          })
          .catch(err => console.warn("Failed to load chat messages:", err));

        // Join room
        if (newSocket) {
          newSocket.emit("join_conversation", conv.id);
        }
      })
      .catch(err => console.warn("Failed to start chat session:", err));
    }

    if (newSocket) {
      newSocket.on("receive_message", (msg: Message) => {
        setMessages(prev => [...prev, msg]);
        newSocket?.emit("mark_read", { conversationId: msg.conversationId, sender: isOwner ? 'owner' : 'guest' });
      });
      newSocket.on("connect_error", (err) => {
        console.warn("Chat socket connection notice:", err.message);
      });
    }

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [isOpen, unitId, isOwner, selectedConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestInfo.name || !guestInfo.phone) return;
    
    localStorage.setItem("chat_guest_name", guestInfo.name);
    localStorage.setItem("chat_guest_phone", guestInfo.phone);
    
    const guestId = getGuestId();
    try {
      const res = await fetch(`/api/chat/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId, guestId, guestName: guestInfo.name, guestPhone: guestInfo.phone })
      });
      if (res.ok) {
        const conv = await res.json().catch(() => null);
        if (conv) {
          setConversation(conv);
          setHasJoined(true);
          
          if (socket) {
             socket.emit("join_conversation", conv.id);
          }
        }
      }
    } catch (err) {
      console.warn("Error starting chat in handleJoin:", err);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket || !conversation) return;

    socket.emit("send_message", {
      conversationId: conversation.id,
      sender: isOwner ? "owner" : "guest",
      content: input.trim()
    });
    setInput("");
  };

  if (!isOpen) return null;

  return (
    <div className={
      isEmbedded 
        ? "w-full h-full bg-white flex flex-col overflow-hidden" 
        : "fixed bottom-4 left-4 w-96 max-w-[calc(100vw-2rem)] h-[500px] max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col z-[100] border border-gray-100 overflow-hidden"
    }>
      {/* Header */}
      <div className="bg-indigo-600 p-4 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">{isOwner ? "پشتیبانی خریداران" : `گفتگو با ${unitName}`}</h3>
            <p className="text-xs text-indigo-100">پاسخگویی سریع</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
          <X className="h-5 w-5" />
        </button>
      </div>

      {!hasJoined && !isOwner ? (
        <div className="flex-1 p-6 flex flex-col justify-center items-center text-center bg-gray-50">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4 text-indigo-600">
            <User className="h-8 w-8" />
          </div>
          <h4 className="font-bold text-gray-800 mb-2">شروع گفتگو</h4>
          <p className="text-sm text-gray-600 mb-6">برای شروع گفتگو با مدیریت کارگاه، اطلاعات خود را وارد کنید.</p>
          <form onSubmit={handleJoin} className="w-full space-y-3">
            <input
              type="text"
              placeholder="نام و نام خانوادگی"
              required
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={guestInfo.name}
              onChange={e => setGuestInfo({ ...guestInfo, name: e.target.value })}
            />
            <input
              type="tel"
              placeholder="شماره موبایل"
              required
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={guestInfo.phone}
              onChange={e => setGuestInfo({ ...guestInfo, phone: e.target.value })}
            />
            <button type="submit" className="w-full bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-indigo-700 transition-colors cursor-pointer">
              شروع چت
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                هنوز پیامی ارسال نشده است. اولین پیام را بفرستید!
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = (isOwner && msg.sender === 'owner') || (!isOwner && msg.sender === 'guest');
                return (
                  <div key={`${msg.id}-${idx}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-3 text-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none shadow-sm'}`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-100">
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                type="text"
                placeholder="پیام خود را بنویسید..."
                className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                value={input}
                onChange={e => setInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shrink-0 disabled:opacity-50 hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
