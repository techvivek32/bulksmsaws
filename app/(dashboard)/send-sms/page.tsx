'use client';

import { useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Upload, Send, Eye, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';

type Step = 'upload' | 'preview' | 'sending' | 'done';

interface ParsedRow {
  patientName: string;
  phone: string;
  email: string;
}

interface SendProgress {
  sent: number;
  failed: number;
  total: number;
}

const PAGE_SIZE = 50;

export default function SendSMSPage() {
  const [step, setStep] = useState<Step>('upload');
  const [campaign, setCampaign] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [allRows, setAllRows] = useState<ParsedRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [duplicates, setDuplicates] = useState(0);
  const [progress, setProgress] = useState<SendProgress>({ sent: 0, failed: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.ceil(allRows.length / PAGE_SIZE);
  const pageRows = allRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a file');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('campaign', campaign);
      const res = await axios.post('/api/sms/upload', form);
      setAllRows(res.data.rows);
      setTotalRows(res.data.total);
      setDuplicates(res.data.duplicatesRemoved);
      setCurrentPage(1);
      setStep('preview');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.post('/api/sms/save', { rows: allRows, campaign });
      toast.success(`${allRows.length} messages saved as pending`);
      setStep('sending');
      setProgress({ sent: 0, failed: 0, total: allRows.length });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/sms/send', { campaign });
      setProgress({ sent: res.data.sent, failed: res.data.failed, total: res.data.total });
      toast.success(`Done! ${res.data.sent} sent, ${res.data.failed} failed`);
      setStep('done');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Send failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setCampaign('');
    setAllRows([]);
    setCurrentPage(1);
    if (fileRef.current) fileRef.current.value = '';
  };

  // Build page number list with ellipsis
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Send SMS</h1>
        <p className="text-gray-500 text-sm">Upload a CSV/Excel file and send bulk SMS</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['upload', 'preview', 'sending', 'done'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step === s ? 'bg-blue-600 text-white' :
              (['upload', 'preview', 'sending', 'done'] as Step[]).indexOf(step) > i
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}>
              {i + 1}
            </div>
            <span className={step === s ? 'text-blue-600 font-medium' : 'text-gray-400 capitalize'}>{s}</span>
            {i < 3 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Upload Step */}
      {step === 'upload' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name (optional)</label>
            <input
              type="text"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder="e.g. Summer Promo 2025"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload File (CSV or Excel)</label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500 text-sm">
                {file ? file.name : 'Click to upload or drag & drop'}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Columns: <strong>Patient First Name</strong>, <strong>Patient Last Name</strong>, <strong>Patient Cell Phone</strong> / <strong>Patient Work Phone</strong>
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Eye size={16} />
            {loading ? 'Parsing...' : 'Parse & Preview'}
          </button>
        </div>
      )}

      {/* Preview Step */}
      {step === 'preview' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-700">{totalRows} patients ready</p>
              {duplicates > 0 && (
                <p className="text-xs text-yellow-600">{duplicates} duplicate numbers removed</p>
              )}
            </div>
            <button onClick={reset} className="text-sm text-gray-400 hover:text-gray-600">Start over</button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium w-12">#</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Patient Name</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Phone</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pageRows.map((row, i) => {
                  const globalIndex = (currentPage - 1) * PAGE_SIZE + i + 1;
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-400">{globalIndex}</td>
                      <td className="px-4 py-2 text-gray-700">{row.patientName || '—'}</td>
                      <td className="px-4 py-2 text-gray-700">{row.phone}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{row.email || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-gray-400">
                Page {currentPage} of {totalPages} · {totalRows} total
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>

                {pageNumbers.map((p, idx) =>
                  p === '...' ? (
                    <span key={`e-${idx}`} className="px-2 text-gray-400 text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium border transition-colors ${
                        currentPage === p
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <CheckCircle size={16} />
              {loading ? 'Saving...' : 'Confirm & Save'}
            </button>
            <button onClick={reset} className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sending Step */}
      {step === 'sending' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-6">
          <div>
            <p className="font-semibold text-gray-700 mb-1">{totalRows} messages saved as pending</p>
            <p className="text-sm text-gray-500">Click "Start Sending" to begin. Messages are sent with a 200–300ms delay.</p>
          </div>

          <ProgressBar sent={progress.sent} failed={progress.failed} total={progress.total} />

          <button
            onClick={handleSend}
            disabled={loading}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Send size={16} />
            {loading ? 'Sending... (this may take a while)' : 'Start Sending'}
          </button>
        </div>
      )}

      {/* Done Step */}
      {step === 'done' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center space-y-4">
          <CheckCircle size={48} className="mx-auto text-green-500" />
          <div>
            <p className="text-xl font-bold text-gray-800">Sending Complete!</p>
            <p className="text-gray-500 text-sm mt-1">
              {progress.sent} sent · {progress.failed} failed · {progress.total} total
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium">
              Send Another
            </button>
            <a href="/reports" className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              View Reports
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
