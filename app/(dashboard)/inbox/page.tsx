'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Inbox, RefreshCw, Trash2, Search } from 'lucide-react';
import { format } from 'date-fns';

interface InboundMsg {
  _id: string;
  from: string;
  to: string;
  message: string;
  timestamp: string;
}

export default function InboxPage() {
  const router = useRouter();
  const [messages, setMessages]   = useState<InboundMsg[]>([]);
  const [filtered, setFiltered]   = useState<InboundMsg[]>([]);
  const [loading, setLoading]     = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [deleting, setDeleting]   = useState(false);

  // Filters (client-side since inbox is small)
  const [search, setSearch]       = useState('');
  const [from, setFrom]           = useState('');
  const [to, setTo]               = useState('');

  useEffect(() => {
    axios.get('/api/auth/me').then((res) => {
      if (!res.data.role) router.replace('/login');
      else setAuthorized(true);
    }).catch(() => router.replace('/login'));
  }, [router]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get('/api/inbound-sms');
      setMessages(res.data.messages);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authorized) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 15000);
    return () => clearInterval(interval);
  }, [authorized]);

  // Apply filters whenever messages or filter values change
  useEffect(() => {
    let result = [...messages];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((m) =>
        m.from.toLowerCase().includes(q) || m.message.toLowerCase().includes(q)
      );
    }
    if (from) result = result.filter((m) => new Date(m.timestamp) >= new Date(from));
    if (to)   result = result.filter((m) => new Date(m.timestamp) <= new Date(to + 'T23:59:59'));
    setFiltered(result);
    setSelected(new Set());
  }, [messages, search, from, to]);

  const handleReset = () => { setSearch(''); setFrom(''); setTo(''); };

  /* ── Select ── */
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () =>
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((m) => m._id)));

  /* ── Delete ── */
  const handleDelete = async (ids: string[]) => {
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} message(s)? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await axios.post('/api/inbound-sms/delete', { ids });
      toast.success(`${ids.length} message(s) deleted`);
      setSelected(new Set());
      await fetchMessages();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const selectedIds = Array.from(selected);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inbox</h1>
          <p className="text-gray-500 text-sm">
            {filtered.length} message{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== messages.length && ` (filtered from ${messages.length})`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selected.size > 0 && (
            <button onClick={() => handleDelete(selectedIds)} disabled={deleting}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Trash2 size={16} />
              Delete Selected ({selected.size})
            </button>
          )}
          <button onClick={() => handleDelete(filtered.map((m) => m._id))} disabled={deleting || !filtered.length}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Trash2 size={16} />
            Delete All
          </button>
          <button onClick={fetchMessages}
            className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm text-gray-600">
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Search (from / message)</label>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Phone or keyword..."
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
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
        <button onClick={handleReset}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          Reset
        </button>
      </div>

      {/* Content */}
      {(!authorized || loading) ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center shadow-sm border border-gray-100">
          <Inbox size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">{messages.length === 0 ? 'No inbound messages yet' : 'No messages match your filters'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <input type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll} className="rounded" />
                </th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium">From</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium">To</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium">Message</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium">Date & Time</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((msg) => (
                <tr key={msg._id} className={`hover:bg-gray-50 ${selected.has(msg._id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(msg._id)}
                      onChange={() => toggleSelect(msg._id)} className="rounded" />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{msg.from}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{msg.to || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-sm truncate">{msg.message}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {format(new Date(msg.timestamp), 'MMM dd yyyy, HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete([msg._id])}
                      className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
