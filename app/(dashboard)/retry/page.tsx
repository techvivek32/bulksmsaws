'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { RefreshCw, CheckSquare } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { format } from 'date-fns';

interface FailedMsg {
  _id: string;
  phone: string;
  message: string;
  status: 'failed';
  error?: string;
  createdAt: string;
  campaign?: string;
}

export default function RetryPage() {
  const [messages, setMessages] = useState<FailedMsg[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const fetchFailed = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/sms/failed');
      setMessages(res.data.messages);
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFailed(); }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === messages.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(messages.map((m) => m._id)));
    }
  };

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Retry Failed</h1>
          <p className="text-gray-500 text-sm">{messages.length} failed messages</p>
        </div>
        <div className="flex gap-3">
          {selected.size > 0 && (
            <button
              onClick={() => handleRetry(Array.from(selected))}
              disabled={retrying}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <CheckSquare size={16} />
              Retry Selected ({selected.size})
            </button>
          )}
          <button
            onClick={() => handleRetry()}
            disabled={retrying || !messages.length}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <RefreshCw size={16} className={retrying ? 'animate-spin' : ''} />
            {retrying ? 'Retrying...' : 'Retry All'}
          </button>
        </div>
      </div>

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
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === messages.length}
                      onChange={toggleAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Phone</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Message</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Error</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Campaign</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {messages.map((msg) => (
                  <tr key={msg._id} className={`hover:bg-gray-50 ${selected.has(msg._id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(msg._id)}
                        onChange={() => toggleSelect(msg._id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{msg.phone}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{msg.message}</td>
                    <td className="px-4 py-3 text-red-500 text-xs max-w-xs truncate">{msg.error || '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{msg.campaign || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {format(new Date(msg.createdAt), 'MMM dd, HH:mm')}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={msg.status} />
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
