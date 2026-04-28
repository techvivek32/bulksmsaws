'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Inbox, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface InboundMsg {
  _id: string;
  from: string;
  to: string;
  message: string;
  timestamp: string;
}

export default function InboxPage() {
  const [messages, setMessages] = useState<InboundMsg[]>([]);
  const [loading, setLoading] = useState(true);

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
    fetchMessages();
    // Poll every 15 seconds for new replies
    const interval = setInterval(fetchMessages, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inbox</h1>
          <p className="text-gray-500 text-sm">Inbound SMS replies from recipients</p>
        </div>
        <button
          onClick={fetchMessages}
          className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm text-gray-600"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : messages.length === 0 ? (
        <div className="bg-white rounded-xl p-16 text-center shadow-sm border border-gray-100">
          <Inbox size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400">No inbound messages yet</p>
          <p className="text-gray-300 text-sm mt-1">Configure your Telnyx webhook to <code className="bg-gray-100 px-1 rounded">/api/inbound-sms</code></p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-4">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {msg.from.slice(-2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-gray-800 text-sm">{msg.from}</p>
                  <p className="text-xs text-gray-400 whitespace-nowrap">
                    {format(new Date(msg.timestamp), 'MMM dd, HH:mm')}
                  </p>
                </div>
                {msg.to && (
                  <p className="text-xs text-gray-400 mb-1">To: {msg.to}</p>
                )}
                <p className="text-gray-600 text-sm mt-1">{msg.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
