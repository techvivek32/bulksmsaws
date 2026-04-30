'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Inbox, RefreshCw, Send, Search, MessageSquare, ArrowLeft, Pencil, Check, X } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

interface Contact {
  _id: string;
  patientName: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
}

interface ChatMessage {
  _id: string;
  direction: 'inbound' | 'outbound';
  text: string;
  timestamp: string;
}

function formatTime(ts: string) {
  const d = new Date(ts);
  if (isToday(d))     return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM dd');
}

function formatFullTime(ts: string) {
  return format(new Date(ts), 'MMM dd, yyyy HH:mm');
}

export default function InboxPage() {
  const router = useRouter();
  const [authorized, setAuthorized]           = useState(false);
  const [contacts, setContacts]               = useState<Contact[]>([]);
  const [filteredContacts, setFiltered]       = useState<Contact[]>([]);
  const [activePhone, setActivePhone]         = useState<string | null>(null);
  const [messages, setMessages]               = useState<ChatMessage[]>([]);
  const [reply, setReply]                     = useState('');
  const [sending, setSending]                 = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingChat, setLoadingChat]         = useState(false);
  const [searchQ, setSearchQ]                 = useState('');
  const [editingName, setEditingName]         = useState(false);
  const [editNameVal, setEditNameVal]         = useState('');
  const [savingName, setSavingName]           = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  /* ── Auth ── */
  useEffect(() => {
    axios.get('/api/auth/me')
      .then((r) => { if (!r.data.role) router.replace('/login'); else setAuthorized(true); })
      .catch(() => router.replace('/login'));
  }, [router]);

  /* ── Load contacts ── */
  const fetchContacts = async () => {
    try {
      const res = await axios.get('/api/chat?contacts=1');
      setContacts(res.data.contacts);
    } catch { /* silent */ }
    finally { setLoadingContacts(false); }
  };

  useEffect(() => {
    if (!authorized) return;
    fetchContacts();
    const iv = setInterval(fetchContacts, 15000);
    return () => clearInterval(iv);
  }, [authorized]);

  /* ── Filter contacts ── */
  useEffect(() => {
    if (!searchQ.trim()) { setFiltered(contacts); return; }
    const q = searchQ.toLowerCase();
    setFiltered(contacts.filter((c) =>
      c._id.includes(q) ||
      c.lastMessage.toLowerCase().includes(q) ||
      c.patientName.toLowerCase().includes(q)
    ));
  }, [contacts, searchQ]);

  /* ── Load conversation ── */
  const fetchConversation = async (phone: string) => {
    setLoadingChat(true);
    try {
      const res = await axios.get(`/api/chat?phone=${encodeURIComponent(phone)}`);
      setMessages(res.data.messages);
    } catch { toast.error('Failed to load conversation'); }
    finally { setLoadingChat(false); }
  };

  const openChat = (phone: string) => {
    setActivePhone(phone);
    setReply('');
    setContacts((prev) => prev.map((c) => c._id === phone ? { ...c, unread: 0 } : c));
    fetchConversation(phone);
  };

  const closeChat = () => setActivePhone(null);

  const startEditName = () => {
    setEditNameVal(activeContact?.patientName || '');
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const cancelEditName = () => {
    setEditingName(false);
    setEditNameVal('');
  };

  const saveEditName = async () => {
    if (!activePhone) return;
    setSavingName(true);
    try {
      await axios.post('/api/chat/rename', { phone: activePhone, name: editNameVal });
      // Update contacts list immediately
      setContacts((prev) => prev.map((c) =>
        c._id === activePhone ? { ...c, patientName: editNameVal.trim() } : c
      ));
      toast.success('Name updated');
      setEditingName(false);
    } catch {
      toast.error('Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  /* ── Poll active conversation ── */
  useEffect(() => {
    if (!activePhone) return;
    const iv = setInterval(() => fetchConversation(activePhone), 10000);
    return () => clearInterval(iv);
  }, [activePhone]);

  /* ── Scroll to bottom ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── Send reply ── */
  const handleSend = async () => {
    if (!reply.trim() || !activePhone || sending) return;
    setSending(true);
    try {
      await axios.post('/api/chat', { to: activePhone, message: reply.trim() });
      setReply('');
      await fetchConversation(activePhone);
      await fetchContacts();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const activeContact = contacts.find((c) => c._id === activePhone);

  /* ══════════════════════════════════════════
     CONTACT LIST PANEL
  ══════════════════════════════════════════ */
  const ContactList = (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800 text-lg">Inbox</h2>
          <button onClick={fetchContacts} className="text-gray-400 hover:text-gray-600 p-1 rounded">
            <RefreshCw size={16} />
          </button>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loadingContacts ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Inbox size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-400 text-sm">No messages yet</p>
          </div>
        ) : (
          filteredContacts.map((c) => (
            <button
              key={c._id}
              onClick={() => openChat(c._id)}
              className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 text-left ${
                activePhone === c._id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                {(c.patientName || c._id).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-800 text-sm truncate">{c.patientName || c._id}</p>
                  <p className="text-xs text-gray-400 flex-shrink-0 ml-1">{formatTime(c.lastTime)}</p>
                </div>
                {c.patientName && <p className="text-xs text-gray-400 truncate">{c._id}</p>}
                <p className="text-xs text-gray-500 truncate mt-0.5">{c.lastMessage}</p>
              </div>
              {c.unread > 0 && (
                <div className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center flex-shrink-0">
                  {c.unread > 9 ? '9+' : c.unread}
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );

  /* ══════════════════════════════════════════
     CHAT PANEL
  ══════════════════════════════════════════ */
  const ChatPanel = (
    <div className="flex flex-col h-full overflow-hidden bg-gray-100">
      {activePhone ? (
        <>
          {/* Chat header */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
            {/* Back button — mobile only */}
            <button
              onClick={closeChat}
              className="lg:hidden text-gray-500 hover:text-gray-700 p-1 mr-1"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              {(activeContact?.patientName || activePhone || '').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                /* ── Edit mode ── */
                <div className="flex items-center gap-2">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={editNameVal}
                    onChange={(e) => setEditNameVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditName();
                      if (e.key === 'Escape') cancelEditName();
                    }}
                    className="flex-1 px-2 py-1 border border-blue-400 rounded-lg text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter name..."
                  />
                  <button
                    onClick={saveEditName}
                    disabled={savingName}
                    className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={cancelEditName}
                    className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                /* ── Display mode ── */
                <div className="flex items-center gap-1.5 group">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">
                      {activeContact?.patientName || activePhone}
                    </p>
                    <p className="text-xs text-gray-400">
                      {activeContact?.patientName ? activePhone : 'SMS conversation'}
                    </p>
                  </div>
                  <button
                    onClick={startEditName}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-500 rounded transition-all"
                    title="Edit name"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-2">
            {loadingChat ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No messages yet</div>
            ) : (
              messages.map((msg) => (
                <div key={msg._id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] lg:max-w-md px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                    msg.direction === 'outbound'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                  }`}>
                    <p className="leading-relaxed">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-blue-200' : 'text-gray-400'} text-right`}>
                      {formatFullTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply input */}
          <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-end gap-3 flex-shrink-0">
            <textarea
              ref={inputRef}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 resize-none px-4 py-2.5 bg-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
              style={{ minHeight: '42px' }}
            />
            <button
              onClick={handleSend}
              disabled={!reply.trim() || sending}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
            >
              {sending
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Send size={16} />
              }
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <MessageSquare size={36} className="text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Select a conversation</h3>
          <p className="text-gray-400 text-sm">Click a contact on the left to open the chat</p>
        </div>
      )}
    </div>
  );

  /* ══════════════════════════════════════════
     LAYOUT — desktop: side by side | mobile: one at a time
  ══════════════════════════════════════════ */
  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-screen overflow-hidden">

      {/* ── DESKTOP: side by side ── */}
      <div className="hidden lg:flex h-full">
        <div className="w-80 flex-shrink-0 border-r border-gray-200 h-full">{ContactList}</div>
        <div className="flex-1 h-full">{ChatPanel}</div>
      </div>

      {/* ── MOBILE: show list OR chat, not both ── */}
      <div className="lg:hidden h-full">
        {activePhone ? (
          /* Chat view — full screen */
          <div className="h-full">{ChatPanel}</div>
        ) : (
          /* Contact list — full screen */
          <div className="h-full">{ContactList}</div>
        )}
      </div>
    </div>
  );
}
