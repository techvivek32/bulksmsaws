'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { RefreshCw, CheckSquare, Trash2, Search } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { format } from 'date-fns';

interface FailedMsg {
  _id: string;
  phone: string;
  patientName?: string;
  status: 'failed';
  error?: string;
  createdAt: string;
  campaign?: string;
}

export default function RetryPage() {
  const [messages, setMessages]   = useState<FailedMsg[]>([]);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [loading, setLoading]     = useState(true);
  const [retrying, setRetrying]   = useState(false);
  const [deleting, setDeleting]   = useState(false);

  // Filters
  const [campaign, setCampaign]   = useState('');
  const [from, setFrom]           = useState('');
  const [to, setTo]               = useState('');

  const fetchFailed = async (camp = campaign, f = from, t = to) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (camp) params.set('campaign', camp);
      if (f)    params.set('from', f);
      if (t)    params.set('to', t);
      const res = await axios.get(`/api/sms/failed?${params}`);
      setMessages(res.data.messages);
      setSelected(new Set());
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFailed(); }, []);

  const handleReset = () => {
    setCampaign(''); setFrom(''); setTo('');
    fetchFailed('', '', '');
  };

  /* ── Select ── */
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () =>
    setSelected(selected.size === messages.length ? new Set() : new Set(messages.map((m) => m._id)));

  /* ── Retry ── */
  const handleRetry = async (ids?: string[]) => {
    setRetrying(true);
    try {
      const res = await axios.post('/api/sms/retry', { ids: ids || [] });
      toast.success(`${res.data.sent} sent, ${res.data.failed} failed`);
      setSelected(new Set());
      await fetchFailed();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Retry failed');
    } finally {
      setRetrying(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async (ids: string[]) => {
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} message(s)? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await axios.post('/api/sms/delete', { ids });
      toast.success(`${ids.length} message(s) deleted`);
      setSelected(new Set());
      await fetchFailed();
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
          <h1 className="text-2xl font-bold text-gray-800">Retry Failed</h1>
          <p className="text-gray-500 text-sm">{messages.length} failed messages</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selected.size > 0 && (
            <>
              <button onClick={() => handleRetry(selectedIds)} disabled={retrying}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <CheckSquare size={16} />
                Retry Selected ({selected.size})
              </button>
              <button onClick={() => handleDelete(selectedIds)} disabled={deleting}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <Trash2 size={16} />
                Delete Selected ({selected.size})
              </button>
            </>
          )}
          <button onClick={() => handleRetry()} disabled={retrying || !messages.length}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <RefreshCw size={16} className={retrying ? 'animate-spin' : ''} />
            {retrying ? 'Retrying...' : 'Retry All'}
          </button>
          <button onClick={() => handleDelete(messages.map((m) => m._id))} disabled={deleting || !messages.length}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Trash2 size={16} />
            Delete All
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Campaign</label>
          <input type="text" value={campaign} onChange={(e) => setCampaign(e.target.value)}
            placeholder="Campaign name"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44" />
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
        <button onClick={() => fetchFailed()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Search size={16} /> Search
        </button>
        <button onClick={handleReset}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <RefreshCw size={40} className="mx-auto mb-3 opacity-30" />
            <p>No failed messages</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left w-10">
                    <input type="checkbox"
                      checked={selected.size === messages.length && messages.length > 0}
                      onChange={toggleAll} className="rounded" />
                  </th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Patient Name</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Phone</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Error</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Campaign</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {messages.map((msg) => (
                  <tr key={msg._id} className={`hover:bg-gray-50 ${selected.has(msg._id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(msg._id)}
                        onChange={() => toggleSelect(msg._id)} className="rounded" />
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{msg.patientName || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{msg.phone}</td>
                    <td className="px-4 py-3 text-red-500 text-xs max-w-xs truncate">{msg.error || '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{msg.campaign || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {format(new Date(msg.createdAt), 'MMM dd, HH:mm')}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={msg.status} /></td>
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
    </div>
  );
}
