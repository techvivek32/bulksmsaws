'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Download, Search, ChevronRight, ArrowLeft, Send, Trash2, MessageSquare, X, RefreshCw } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { format } from 'date-fns';

/* ── Types ── */
interface Campaign {
  _id: string;
  total: number;
  sent: number;
  failed: number;
  pending: number;
  lastSent: string;
  firstSent: string;
  sampleMessage?: string;
}

interface SMSRecord {
  _id: string;
  phone: string;
  patientName?: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
  createdAt: string;
}

interface ChatMessage {
  _id: string;
  direction: 'inbound' | 'outbound';
  text: string;
  timestamp: string;
}

const PAGE_SIZE = 50;

/* ══════════════════════════════════════════════
   CHAT SIDE PANEL
══════════════════════════════════════════════ */
function ChatPanel({
  phone,
  patientName,
  onClose,
}: {
  phone: string;
  patientName: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [reply, setReply]       = useState('');
  const [sending, setSending]   = useState(false);

  const fetchConversation = async () => {
    try {
      const res = await axios.get(`/api/chat?phone=${encodeURIComponent(phone)}`);
      setMessages(res.data.messages);
    } catch {
      toast.error('Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversation();
    const iv = setInterval(fetchConversation, 10000);
    return () => clearInterval(iv);
  }, [phone]);

  const handleSend = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      await axios.post('/api/chat', { to: phone, message: reply.trim() });
      setReply('');
      await fetchConversation();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
          {(patientName || phone).slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm truncate">{patientName || phone}</p>
          <p className="text-xs text-gray-400">{patientName ? phone : 'SMS conversation'}</p>
        </div>
        <button onClick={fetchConversation} className="text-gray-400 hover:text-gray-600 p-1">
          <RefreshCw size={15} />
        </button>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <MessageSquare size={32} className="text-gray-300 mb-2" />
            <p className="text-gray-400 text-sm">No replies yet</p>
            <p className="text-gray-300 text-xs mt-1">Messages you send will appear here</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg._id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                msg.direction === 'outbound'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
              }`}>
                <p className="leading-relaxed">{msg.text}</p>
                <p className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-blue-200' : 'text-gray-400'} text-right`}>
                  {format(new Date(msg.timestamp), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reply input */}
      <div className="bg-white border-t border-gray-200 px-3 py-3 flex items-end gap-2 flex-shrink-0">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send)"
          rows={1}
          className="flex-1 resize-none px-3 py-2 bg-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-28 overflow-y-auto"
          style={{ minHeight: '38px' }}
        />
        <button
          onClick={handleSend}
          disabled={!reply.trim() || sending}
          className="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
        >
          {sending
            ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Send size={14} />
          }
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   CAMPAIGN LIST VIEW
══════════════════════════════════════════════ */
function CampaignList({ onSelect }: { onSelect: (name: string) => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [status, setStatus]       = useState('all');
  const [from, setFrom]           = useState('');
  const [to, setTo]               = useState('');
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [deleting, setDeleting]   = useState(false);

  const fetchCampaigns = async (s = status, f = from, t = to) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (s !== 'all') params.set('status', s);
      if (f) params.set('from', f);
      if (t) params.set('to', t);
      const res = await axios.get(`/api/reports/campaigns?${params}`);
      setCampaigns(res.data.campaigns);
      setSelected(new Set());
    } catch {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const handleReset = () => {
    setStatus('all'); setFrom(''); setTo('');
    fetchCampaigns('all', '', '');
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () =>
    setSelected(selected.size === campaigns.length ? new Set() : new Set(campaigns.map((c) => c._id)));

  const handleDelete = async (campaignNames: string[]) => {
    if (!campaignNames.length) return;
    if (!confirm(`Delete all SMS records for ${campaignNames.length} campaign(s)? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await axios.post('/api/reports/campaigns/delete', { campaigns: campaignNames });
      toast.success('Campaigns deleted');
      setSelected(new Set());
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const selectedIds = Array.from(selected);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-500 text-sm">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selected.size > 0 && (
            <button onClick={() => handleDelete(selectedIds)} disabled={deleting}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Trash2 size={16} /> Delete Selected ({selected.size})
            </button>
          )}
          {campaigns.length > 0 && (
            <button onClick={() => handleDelete(campaigns.map((c) => c._id))} disabled={deleting}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Trash2 size={16} /> Delete All
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">From Date</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To Date</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={() => fetchCampaigns()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Search size={16} /> Search
        </button>
        <button onClick={handleReset}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          Reset
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center shadow-sm border border-gray-100">
          <p className="text-gray-400">No campaigns found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 px-2">
            <input type="checkbox"
              checked={selected.size === campaigns.length && campaigns.length > 0}
              onChange={toggleAll} className="rounded" />
            <span className="text-sm text-gray-500">Select all ({campaigns.length})</span>
          </div>
          {campaigns.map((c) => (
            <div key={c._id} className={`bg-white rounded-xl p-5 shadow-sm border transition-all flex items-center gap-4 ${selected.has(c._id) ? 'border-blue-300 bg-blue-50' : 'border-gray-100 hover:border-blue-200'}`}>
              <input type="checkbox" checked={selected.has(c._id)}
                onChange={() => toggleSelect(c._id)}
                onClick={(e) => e.stopPropagation()}
                className="rounded flex-shrink-0" />
              <button onClick={() => onSelect(c._id)} className="flex items-center gap-4 flex-1 min-w-0 text-left">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Send size={20} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{c._id}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(c.firstSent), 'MMM dd, yyyy HH:mm')}
                    {c.firstSent !== c.lastSent && ` – ${format(new Date(c.lastSent), 'MMM dd, yyyy HH:mm')}`}
                  </p>
                  {c.sampleMessage && (
                    <div className="mt-1.5 flex items-start gap-1.5">
                      <MessageSquare size={11} className="text-gray-300 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-400 italic truncate max-w-xs">
                        "{c.sampleMessage}"
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-center"><p className="text-sm font-bold text-gray-700">{c.total}</p><p className="text-xs text-gray-400">Total</p></div>
                  <div className="text-center"><p className="text-sm font-bold text-green-600">{c.sent}</p><p className="text-xs text-gray-400">Sent</p></div>
                  <div className="text-center"><p className="text-sm font-bold text-red-500">{c.failed}</p><p className="text-xs text-gray-400">Failed</p></div>
                  <div className="text-center"><p className="text-sm font-bold text-yellow-500">{c.pending}</p><p className="text-xs text-gray-400">Pending</p></div>
                </div>
                <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
              </button>
              <button onClick={() => handleDelete([c._id])} disabled={deleting}
                className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors flex-shrink-0">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   CAMPAIGN DETAIL VIEW — with inline chat
══════════════════════════════════════════════ */
function CampaignDetail({ campaignName, onBack }: { campaignName: string; onBack: () => void }) {
  const [messages, setMessages]     = useState<SMSRecord[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const [loading, setLoading]       = useState(false);
  const [activeChat, setActiveChat] = useState<{ phone: string; name: string } | null>(null);

  const fetchMessages = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        campaign: campaignName,
        page: String(p),
        limit: String(PAGE_SIZE),
      });
      const res = await axios.get(`/api/reports?${params}`);
      setMessages(res.data.messages);
      setTotal(res.data.total);
      setPage(res.data.page);
      setPages(res.data.pages);
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMessages(1); }, []);

  const exportCSV = () => {
    const headers = ['Patient Name', 'Phone', 'Status', 'Error', 'Date'];
    const rows = messages.map((m) => [
      `"${(m.patientName || '').replace(/"/g, '""')}"`,
      m.phone, m.status,
      `"${(m.error || '').replace(/"/g, '""')}"`,
      format(new Date(m.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    ]);
    const csv  = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${campaignName}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pageNumbers = Array.from({ length: pages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 2)
    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-4 overflow-hidden">

      {/* ── Left: patient table ── */}
      <div className={`flex flex-col min-w-0 transition-all duration-300 ${activeChat ? 'w-[55%]' : 'w-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onBack}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{campaignName}</h1>
              <p className="text-gray-500 text-sm">{total} messages</p>
            </div>
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Download size={16} /> Export CSV
          </button>
        </div>

        {/* Hint */}
        <p className="text-xs text-blue-500 mb-2 flex-shrink-0">
          💬 Click any row to chat with that patient
        </p>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <>
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-500 font-medium w-10">#</th>
                      <th className="px-4 py-3 text-left text-gray-500 font-medium">Patient Name</th>
                      <th className="px-4 py-3 text-left text-gray-500 font-medium">Phone</th>
                      <th className="px-4 py-3 text-left text-gray-500 font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-gray-500 font-medium">Date & Time</th>
                      {!activeChat && <th className="px-4 py-3 text-left text-gray-500 font-medium">Error</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {messages.map((msg, i) => (
                      <tr
                        key={msg._id}
                        onClick={() => setActiveChat({ phone: msg.phone, name: msg.patientName || msg.phone })}
                        className={`cursor-pointer transition-colors ${
                          activeChat?.phone === msg.phone
                            ? 'bg-blue-50 border-l-4 border-l-blue-500'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-4 py-3 text-gray-800 font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {(msg.patientName || msg.phone).slice(0, 2).toUpperCase()}
                            </div>
                            {msg.patientName || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{msg.phone}</td>
                        <td className="px-4 py-3"><StatusBadge status={msg.status} /></td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                          {format(new Date(msg.createdAt), 'MMM dd yyyy, HH:mm')}
                        </td>
                        {!activeChat && (
                          <td className="px-4 py-3 text-red-400 text-xs max-w-xs truncate">{msg.error || '—'}</td>
                        )}
                      </tr>
                    ))}
                    {!messages.length && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400">No records found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-shrink-0">
                  <p className="text-xs text-gray-400">Page {page} of {pages} · {total} total</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => fetchMessages(page - 1)} disabled={page <= 1}
                      className="px-3 py-1.5 border border-gray-200 rounded text-sm disabled:opacity-40 hover:bg-gray-50">
                      Previous
                    </button>
                    {pageNumbers.map((p, idx) =>
                      p === '...' ? (
                        <span key={`e-${idx}`} className="px-2 text-gray-400">…</span>
                      ) : (
                        <button key={p} onClick={() => fetchMessages(p as number)}
                          className={`min-w-[32px] h-8 px-2 rounded text-sm border transition-colors ${
                            page === p ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}>
                          {p}
                        </button>
                      )
                    )}
                    <button onClick={() => fetchMessages(page + 1)} disabled={page >= pages}
                      className="px-3 py-1.5 border border-gray-200 rounded text-sm disabled:opacity-40 hover:bg-gray-50">
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Right: chat panel ── */}
      {activeChat && (
        <div className="w-[45%] flex-shrink-0 rounded-xl overflow-hidden shadow-sm border border-gray-200">
          <ChatPanel
            phone={activeChat.phone}
            patientName={activeChat.name}
            onClose={() => setActiveChat(null)}
          />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function ReportsPage() {
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  if (selectedCampaign !== null) {
    return (
      <div className="p-6 h-screen overflow-hidden">
        <CampaignDetail campaignName={selectedCampaign} onBack={() => setSelectedCampaign(null)} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <CampaignList onSelect={setSelectedCampaign} />
    </div>
  );
}
