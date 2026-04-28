'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { MessageSquare, Send, XCircle, Clock } from 'lucide-react';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { format } from 'date-fns';

interface DashboardData {
  total: number;
  sentToday: number;
  failed: number;
  pending: number;
  recent: any[];
  dailyStats: { date: string; count: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await axios.get('/api/dashboard');
      setData(res.data);
    } catch {
      // handled by middleware
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 30 seconds for real-time feel
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const maxCount = Math.max(...(data?.dailyStats.map((d) => d.count) || [1]), 1);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm">Overview of your SMS campaigns</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total SMS" value={data?.total || 0} icon={MessageSquare} color="blue" />
        <StatCard title="Sent Today" value={data?.sentToday || 0} icon={Send} color="green" />
        <StatCard title="Failed" value={data?.failed || 0} icon={XCircle} color="red" />
        <StatCard title="Pending" value={data?.pending || 0} icon={Clock} color="yellow" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Daily Stats Bar Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Daily SMS (Last 7 Days)</h2>
          <div className="flex items-end gap-2 h-40">
            {data?.dailyStats.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500">{d.count}</span>
                <div
                  className="w-full bg-blue-500 rounded-t-md transition-all duration-500"
                  style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count ? '4px' : '0' }}
                />
                <span className="text-xs text-gray-400 whitespace-nowrap">{d.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Recent Activity</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-medium">Phone</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.recent.map((msg) => (
                  <tr key={msg._id} className="hover:bg-gray-50">
                    <td className="py-2 text-gray-700">{msg.phone}</td>
                    <td className="py-2">
                      <StatusBadge status={msg.status} />
                    </td>
                    <td className="py-2 text-gray-400 text-xs">
                      {format(new Date(msg.createdAt), 'MMM dd, HH:mm')}
                    </td>
                  </tr>
                ))}
                {!data?.recent.length && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-gray-400">No messages yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
