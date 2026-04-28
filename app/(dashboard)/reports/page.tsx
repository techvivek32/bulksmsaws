'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Download, Search } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { format } from 'date-fns';

interface SMSRecord {
  _id: string;
  phone: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
  createdAt: string;
  campaign?: string;
}

export default function ReportsPage() {
  const [messages, setMessages] = useState<SMSRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchReports = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50' });
      if (status !== 'all') params.set('status', status);
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const res = await axios.get(`/api/reports?${params}`);
      setMessages(res.data.messages);
      setTotal(res.data.total);
      setPage(res.data.page);
      setPages(res.data.pages);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(1); }, []);

  const handleSearch = () => fetchReports(1);

  // Export to CSV
  const exportCSV = () => {
    const headers = ['Phone', 'Message', 'Status', 'Error', 'Campaign', 'Date'];
    const rows = messages.map((m) => [
      m.phone,
      `"${m.message.replace(/"/g, '""')}"`,
      m.status,
      m.error || '',
      m.campaign || '',
      format(new Date(m.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sms-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-500 text-sm">{total} total records</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">From Date</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To Date</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleSearch}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Search size={16} />
          Search
        </button>
        <button
          onClick={() => { setStatus('all'); setFrom(''); setTo(''); fetchReports(1); }}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Phone</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Message</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Campaign</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Date</th>
                    <th className="px-4 py-3 text-left text-gray-500 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {messages.map((msg) => (
                    <tr key={msg._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700 font-medium">{msg.phone}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{msg.message}</td>
                      <td className="px-4 py-3"><StatusBadge status={msg.status} /></td>
                      <td className="px-4 py-3 text-gray-400">{msg.campaign || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {format(new Date(msg.createdAt), 'MMM dd yyyy, HH:mm')}
                      </td>
                      <td className="px-4 py-3 text-red-400 text-xs max-w-xs truncate">{msg.error || '—'}</td>
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">Page {page} of {pages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchReports(page - 1)}
                    disabled={page <= 1}
                    className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchReports(page + 1)}
                    disabled={page >= pages}
                    className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
