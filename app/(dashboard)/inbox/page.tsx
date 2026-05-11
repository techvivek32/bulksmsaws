'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Inbox, RefreshCw, Send, Search, MessageSquare, ArrowLeft, Edit3, Users, Tag, Plus, X, Check, Trash2 } from 'lucide-react';
import TemplatePicker from '@/components/TemplatePicker';
import { useTemplateNav } from '@/lib/useTemplateNav';
import { format, isToday, isYesterday } from 'date-fns';

interface Contact {
  _id: string;
  patientName: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  campaign: string;
}

interface ChatMessage {
  _id: string;
  direction: 'inbound' | 'outbound';
  text: string;
  timestamp: string;
}

interface ChatFilter {
  _id: string;
  name: string;
  color: string;
  phones: string[];
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
  const [sourceFilter, setSourceFilter]       = useState<'all' | 'direct' | 'bulk'>('all');
  const [chatFilters, setChatFilters]         = useState<ChatFilter[]>([]);
  const [activeFilterId, setActiveFilterId]   = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu]   = useState(false);   // tag dropdown in chat header
  const [showNewFilter, setShowNewFilter]     = useState(false);   // create new filter form
  const [newFilterName, setNewFilterName]     = useState('');
  const [newFilterColor, setNewFilterColor]   = useState('blue');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  /* ── Auth ── */
  useEffect(() => {
    axios.get('/api/auth/me')
      .then((r) => { if (!r.data.role) router.replace('/login'); else setAuthorized(true); })
      .catch(() => router.replace('/login'));
  }, [router]);

  /* ── Check URL for phone parameter ── */
  useEffect(() => {
    if (!authorized) return;
    const params = new URLSearchParams(window.location.search);
    const phoneParam = params.get('phone');
    if (phoneParam) {
      // Wait for contacts to load, then open the conversation
      const checkAndOpen = setInterval(() => {
        if (contacts.length > 0) {
          clearInterval(checkAndOpen);
          openChat(phoneParam);
        }
      }, 100);
      
      // Cleanup after 5 seconds
      setTimeout(() => clearInterval(checkAndOpen), 5000);
    }
  }, [authorized, contacts]);

  /* ── Load chat filters ── */
  const fetchFilters = async () => {
    try {
      const res = await axios.get('/api/chat-filters');
      setChatFilters(res.data.filters);
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!authorized) return;
    fetchFilters();
  }, [authorized]);

  /* ── Close filter menu on outside click ── */

  /* ── Add/remove phone from filter ── */
  const togglePhoneInFilter = async (filterId: string, phone: string) => {
    const filter = chatFilters.find(f => f._id === filterId);
    if (!filter) return;
    const isAlreadyIn = filter.phones.includes(phone);
    const action = isAlreadyIn ? 'remove' : 'add';
    try {
      const res = await axios.put('/api/chat-filters', { _id: filterId, action, phone });
      // If add: server returns allFilters (with other filters cleaned up)
      if (action === 'add' && res.data.allFilters) {
        setChatFilters(res.data.allFilters);
      } else {
        setChatFilters(prev => prev.map(f => f._id === filterId ? res.data.filter : f));
      }
      toast.success(action === 'add' ? `Added to "${filter.name}"` : `Removed from "${filter.name}"`);
    } catch {
      toast.error('Failed to update filter');
    }
  };

  /* ── Create new filter ── */
  const createFilter = async () => {
    if (!newFilterName.trim()) return;
    try {
      const res = await axios.post('/api/chat-filters', { name: newFilterName.trim(), color: newFilterColor });
      setChatFilters(prev => [...prev, res.data.filter]);
      setNewFilterName('');
      setShowNewFilter(false);
      toast.success('Filter created');
    } catch {
      toast.error('Failed to create filter');
    }
  };

  /* ── Delete filter ── */
  const deleteFilter = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this filter?')) return;
    try {
      await axios.delete(`/api/chat-filters?id=${id}`);
      setChatFilters(prev => prev.filter(f => f._id !== id));
      if (activeFilterId === id) setActiveFilterId(null);
      toast.success('Filter deleted');
    } catch {
      toast.error('Failed to delete filter');
    }
  };

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
    let result = contacts;

    // Custom filter (label)
    if (activeFilterId) {
      const cf = chatFilters.find(f => f._id === activeFilterId);
      if (cf) result = result.filter(c => cf.phones.includes(c._id));
    } else if (sourceFilter === 'direct') {
      result = result.filter((c) => c.campaign === 'manual-compose' || c.campaign === '');
    } else if (sourceFilter === 'bulk') {
      result = result.filter((c) => c.campaign && c.campaign !== 'manual-compose');
    }

    // Search filter
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      result = result.filter((c) =>
        c._id.includes(q) ||
        c.lastMessage.toLowerCase().includes(q) ||
        c.patientName.toLowerCase().includes(q) ||
        c.campaign.toLowerCase().includes(q)
      );
    }

    setFiltered(result);
  }, [contacts, searchQ, sourceFilter, activeFilterId, chatFilters]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const { handleKeyNav, handleChange: templateHandleChange, previewIndex, total } = useTemplateNav({ value: reply, setValue: setReply });

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const activeContact = contacts.find((c) => c._id === activePhone);

  const COLOR_MAP: Record<string, { bg: string; text: string; activeBg: string }> = {
    blue:   { bg: 'bg-blue-100',   text: 'text-blue-700',   activeBg: 'bg-blue-600'   },
    green:  { bg: 'bg-green-100',  text: 'text-green-700',  activeBg: 'bg-green-600'  },
    red:    { bg: 'bg-red-100',    text: 'text-red-700',    activeBg: 'bg-red-600'    },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', activeBg: 'bg-yellow-500' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700', activeBg: 'bg-purple-600' },
    pink:   { bg: 'bg-pink-100',   text: 'text-pink-700',   activeBg: 'bg-pink-600'   },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', activeBg: 'bg-orange-500' },
  };

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

        {/* Search */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Tabs — All / Direct / Bulk + custom filters */}
        <div className="space-y-1.5">
          {/* Row 1: Built-in + custom filter tags all together */}
          <div className="flex flex-wrap gap-1">
            {/* All */}
            <button
              onClick={() => { setSourceFilter('all'); setActiveFilterId(null); }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                !activeFilterId && sourceFilter === 'all'
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              All
              <span className="opacity-70">{contacts.length}</span>
            </button>

            {/* Direct */}
            <button
              onClick={() => { setSourceFilter('direct'); setActiveFilterId(null); }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                !activeFilterId && sourceFilter === 'direct'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-purple-600 border-purple-200 hover:border-purple-400'
              }`}
            >
              <Edit3 size={10} />
              Direct
              <span className="opacity-70">{contacts.filter(c => c.campaign === 'manual-compose' || c.campaign === '').length}</span>
            </button>

            {/* Bulk */}
            <button
              onClick={() => { setSourceFilter('bulk'); setActiveFilterId(null); }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                !activeFilterId && sourceFilter === 'bulk'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-green-700 border-green-200 hover:border-green-400'
              }`}
            >
              <Users size={10} />
              Bulk
              <span className="opacity-70">{contacts.filter(c => c.campaign && c.campaign !== 'manual-compose').length}</span>
            </button>

            {/* Custom filter tags */}
            {chatFilters.map(f => {
              const c = COLOR_MAP[f.color] || COLOR_MAP.blue;
              const isActive = activeFilterId === f._id;
              return (
                <button
                  key={f._id}
                  onClick={() => { setActiveFilterId(isActive ? null : f._id); setSourceFilter('all'); }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    isActive
                      ? `${c.activeBg} text-white border-transparent`
                      : `bg-white ${c.text} border-gray-200 hover:border-gray-400`
                  }`}
                >
                  <Tag size={10} />
                  {f.name}
                  <span className="opacity-70">{f.phones.length}</span>
                </button>
              );
            })}

            {/* + New filter button */}
            <button
              onClick={() => setShowNewFilter(v => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
            >
              <Plus size={10} />
              New
            </button>
          </div>

          {/* Inline new filter form */}
          {showNewFilter && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
              <input
                type="text"
                value={newFilterName}
                onChange={e => setNewFilterName(e.target.value)}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') createFilter(); if (e.key === 'Escape') { setShowNewFilter(false); setNewFilterName(''); } }}
                placeholder="Filter name (e.g. Follow Up)"
                autoFocus
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              {/* Color picker */}
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(COLOR_MAP).map(([color, cls]) => (
                  <button
                    key={color}
                    onMouseDown={(e) => { e.preventDefault(); setNewFilterColor(color); }}
                    className={`w-5 h-5 rounded-full ${cls.activeBg} transition-transform ${newFilterColor === color ? 'ring-2 ring-offset-1 ring-gray-500 scale-110' : 'hover:scale-105'}`}
                    title={color}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onMouseDown={(e) => { e.preventDefault(); createFilter(); }}
                  disabled={!newFilterName.trim()}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                >
                  <Check size={11} /> Create
                </button>
                <button
                  onClick={() => { setShowNewFilter(false); setNewFilterName(''); }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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
          filteredContacts.map((c) => {
            const isDirect = c.campaign === 'manual-compose' || c.campaign === '';
            const campaignLabel = isDirect ? 'Direct' : c.campaign;
            return (
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
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-500 truncate flex-1">{c.lastMessage}</p>
                    {/* Source badge */}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium ${
                      isDirect
                        ? 'bg-purple-100 text-purple-600'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {isDirect ? '✏️ Direct' : `📢 ${campaignLabel.length > 12 ? campaignLabel.slice(0, 12) + '…' : campaignLabel}`}
                    </span>
                  </div>
                </div>
                {c.unread > 0 && (
                  <div className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center flex-shrink-0">
                    {c.unread > 9 ? '9+' : c.unread}
                  </div>
                )}
              </button>
            );
          })
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
            <button onClick={closeChat} className="lg:hidden text-gray-500 hover:text-gray-700 p-1 mr-1">
              <ArrowLeft size={20} />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              {(activeContact?.patientName || activePhone || '').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm truncate">
                {activeContact?.patientName || activePhone}
              </p>
              <p className="text-xs text-gray-400">
                {activeContact?.patientName ? activePhone : 'SMS conversation'}
              </p>
            </div>

            {/* Tag / Filter button */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => { setShowFilterMenu(v => !v); setShowNewFilter(false); setNewFilterName(''); }}
                title="Add to filter"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  showFilterMenu ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-500 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                <Tag size={13} />
                Label
              </button>

              {/* Dropdown */}
              {showFilterMenu && activePhone && (
                <div className="absolute right-0 top-10 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                  
                  {/* Header */}
                  <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <p className="text-xs font-semibold text-gray-700">Add to filter</p>
                    <div className="flex items-center gap-2">
                      <button
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowNewFilter(v => !v); setNewFilterName(''); }}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {showNewFilter ? <X size={12} /> : <Plus size={12} />}
                        {showNewFilter ? 'Cancel' : 'New filter'}
                      </button>
                      <button
                        onMouseDown={(e) => { e.preventDefault(); setShowFilterMenu(false); setShowNewFilter(false); }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Create new filter form */}
                  {showNewFilter && (
                    <div className="px-3 py-3 border-b border-gray-100 bg-blue-50 space-y-2.5">
                      <input
                        type="text"
                        value={newFilterName}
                        onChange={e => setNewFilterName(e.target.value)}
                        onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') createFilter(); }}
                        placeholder="Filter name (e.g. Follow Up)"
                        autoFocus
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                      {/* Color picker */}
                      <div className="flex gap-1.5 flex-wrap">
                        {Object.entries(COLOR_MAP).map(([color, cls]) => (
                          <button
                            key={color}
                            onMouseDown={(e) => { e.preventDefault(); setNewFilterColor(color); }}
                            className={`w-6 h-6 rounded-full ${cls.activeBg} transition-transform ${newFilterColor === color ? 'ring-2 ring-offset-1 ring-gray-500 scale-110' : 'hover:scale-105'}`}
                            title={color}
                          />
                        ))}
                      </div>
                      <button
                        onMouseDown={(e) => { e.preventDefault(); createFilter(); }}
                        disabled={!newFilterName.trim()}
                        className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                      >
                        <Check size={11} /> Create Filter
                      </button>
                    </div>
                  )}

                  {/* Filter list */}
                  <div className="max-h-52 overflow-y-auto">
                    {chatFilters.length === 0 && !showNewFilter ? (
                      <div className="text-center py-6 px-3">
                        <Tag size={20} className="mx-auto text-gray-300 mb-1.5" />
                        <p className="text-xs text-gray-400">No filters yet</p>
                        <p className="text-xs text-gray-300">Click "+ New filter" above</p>
                      </div>
                    ) : (
                      chatFilters.map(f => {
                        const c = COLOR_MAP[f.color] || COLOR_MAP.blue;
                        const isIn = f.phones.includes(activePhone!);
                        return (
                          <div key={f._id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                            <button
                              onMouseDown={(e) => { e.preventDefault(); togglePhoneInFilter(f._id, activePhone!); }}
                              className="flex items-center gap-2.5 flex-1 text-left"
                            >
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isIn ? `${c.activeBg} border-transparent` : 'border-gray-300 hover:border-gray-400'}`}>
                                {isIn && <Check size={10} className="text-white" />}
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}>
                                {f.name}
                              </span>
                              <span className="text-xs text-gray-400 ml-auto">{f.phones.length}</span>
                            </button>
                            <button
                              onMouseDown={(e) => { e.preventDefault(); deleteFilter(f._id, e); }}
                              className="text-gray-300 hover:text-red-500 p-0.5 flex-shrink-0"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
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
          <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0 space-y-2">
            {/* Template picker — inline above input */}
            <TemplatePicker onSelect={(body) => { setReply(body); inputRef.current?.focus(); }} />

            {/* Input row */}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={reply}
                onChange={(e) => templateHandleChange(e.target.value)}
                onKeyDown={(e) => { handleKeyNav(e); handleKeyDown(e); }}
                placeholder="Type a message... (↑↓ for templates)"
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
            {/* Template cycle hint */}
            {previewIndex !== null && total > 0 && (
              <p className="text-xs text-blue-500 text-right">
                Template {previewIndex + 1} of {total} · ↑↓ to cycle · Enter to send
              </p>
            )}
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
