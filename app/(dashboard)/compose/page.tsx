'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Send, MessageSquare, Clock, CheckCircle, XCircle, History } from 'lucide-react';
import { format } from 'date-fns';

// Configure axios to send cookies
axios.defaults.withCredentials = true;

interface SentMessage {
  _id: string;
  to: string;
  message: string;
  status: 'sent' | 'failed';
  timestamp: string;
  patientName?: string;
}

export default function ComposePage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  // Auth check
  useEffect(() => {
    axios.get('/api/auth/me')
      .then((r) => { 
        if (!r.data.role) router.replace('/login'); 
        else setAuthorized(true); 
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  // Load sent messages history
  const fetchHistory = async () => {
    try {
      const res = await axios.get('/api/compose/history');
      setSentMessages(res.data.messages);
    } catch (err: any) {
      // Only log error if it's not an auth issue
      if (err?.response?.status !== 401) {
        console.error('Failed to load history:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authorized) return;
    fetchHistory();
  }, [authorized]);

  // Format phone number as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    setPhoneNumber(value);
  };

  // Send message
  const handleSend = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    // Basic phone validation
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setSending(true);
    try {
      const res = await axios.post('/api/compose/send', {
        to: cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`,
        message: message.trim()
      });

      toast.success('Message sent successfully!');
      setPhoneNumber('');
      setMessage('');
      
      // Refresh history
      await fetchHistory();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSend();
    }
  };

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const charCount = message.length;
  const smsCount = Math.ceil(charCount / 160) || 1;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Compose Message</h1>
        <p className="text-gray-500 text-sm">Send individual SMS messages manually</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Compose Form */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <MessageSquare size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">New Message</h2>
              <p className="text-xs text-gray-400">Send SMS to any phone number</p>
            </div>
          </div>

          {/* Phone Number Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="+1234567890 or 1234567890"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={sending}
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter with or without country code (e.g., +1 for US)
            </p>
          </div>

          {/* Message Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here..."
              rows={6}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              disabled={sending}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-400">
                {charCount} characters · {smsCount} SMS
              </p>
              <p className="text-xs text-gray-400">
                Ctrl + Enter to send
              </p>
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={sending || !phoneNumber.trim() || !message.trim()}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send size={16} />
                Send Message
              </>
            )}
          </button>
        </div>

        {/* History Panel */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History size={20} className="text-gray-600" />
              <h2 className="font-semibold text-gray-800">Recent Messages</h2>
            </div>
            <button
              onClick={fetchHistory}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Refresh
            </button>
          </div>

          {/* Messages List */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : sentMessages.length === 0 ? (
              <div className="text-center py-12">
                <Clock size={36} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-400 text-sm">No messages sent yet</p>
              </div>
            ) : (
              sentMessages.map((msg) => (
                <div
                  key={msg._id}
                  className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">
                        {msg.patientName || msg.to}
                      </p>
                      {msg.patientName && (
                        <p className="text-xs text-gray-400">{msg.to}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {msg.status === 'sent' ? (
                        <CheckCircle size={14} className="text-green-500" />
                      ) : (
                        <XCircle size={14} className="text-red-500" />
                      )}
                      <span className={`text-xs font-medium ${
                        msg.status === 'sent' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {msg.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {msg.message}
                  </p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(msg.timestamp), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
