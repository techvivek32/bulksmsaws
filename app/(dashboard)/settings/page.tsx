'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Save, Settings } from 'lucide-react';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [dailyLimit, setDailyLimit] = useState(2000);
  const [messageTemplate, setMessageTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get('/api/settings').then((res) => {
      setApiKey(res.data.apiKey || '');
      setSenderNumber(res.data.senderNumber || '');
      setDailyLimit(res.data.dailyLimit || 2000);
      setMessageTemplate(res.data.messageTemplate || '');
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/api/settings', { apiKey, senderNumber, dailyLimit, messageTemplate });
      toast.success('Settings saved successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-500 text-sm">Configure your Telnyx API and sending preferences</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <Settings size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-700">Telnyx Configuration</h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telnyx API Key
          </label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="KEY••••••••••••"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
          />
          <p className="text-xs text-gray-400 mt-1">Leave unchanged to keep existing key. Get yours from <a href="https://portal.telnyx.com" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">portal.telnyx.com</a></p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sender Phone Number
          </label>
          <input
            type="text"
            value={senderNumber}
            onChange={(e) => setSenderNumber(e.target.value)}
            placeholder="+12025551234"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">Must be a Telnyx number in E.164 format (e.g. +12025551234)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Daily SMS Limit
          </label>
          <input
            type="number"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(Number(e.target.value))}
            min={1}
            max={100000}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">Maximum SMS to send per day (default: 2000)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message Template
          </label>
          <textarea
            value={messageTemplate}
            onChange={(e) => setMessageTemplate(e.target.value)}
            rows={4}
            placeholder="e.g. Hi {name}, your appointment is confirmed. Reply STOP to opt out."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            Use <code className="bg-gray-100 px-1 rounded">{'{name}'}</code> to insert the patient&apos;s name. This template is used for all outgoing SMS — no message column needed in Excel.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Webhook Info */}
      <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
        <h3 className="font-semibold text-blue-800 text-sm mb-2">Inbound SMS Webhook</h3>
        <p className="text-blue-700 text-xs mb-2">Configure this URL in your Telnyx portal to receive inbound SMS:</p>
        <code className="block bg-white border border-blue-200 rounded px-3 py-2 text-xs text-blue-900 break-all">
          {typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/inbound-sms
        </code>
        <p className="text-blue-600 text-xs mt-2">Set webhook event type to <strong>message.received</strong></p>
      </div>
    </div>
  );
}
