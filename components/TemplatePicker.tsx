'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Plus, X, GripVertical, Pencil, Trash2, Check, ChevronDown } from 'lucide-react';

interface Template {
  _id: string;
  title: string;
  body: string;
  order: number;
}

interface Props {
  onSelect: (body: string) => void;
}

export default function TemplatePicker({ onSelect }: Props) {
  const [open, setOpen]               = useState(false);
  const [templates, setTemplates]     = useState<Template[]>([]);
  const [loading, setLoading]         = useState(false);
  const [showForm, setShowForm]       = useState(false);
  const [editId, setEditId]           = useState<string | null>(null);
  const [formTitle, setFormTitle]     = useState('');
  const [formBody, setFormBody]       = useState('');
  const [saving, setSaving]           = useState(false);
  const [dragIdx, setDragIdx]         = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [selectedId, setSelectedId]   = useState<string | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/templates');
      setTemplates(res.data.templates);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchTemplates();
    else { resetForm(); setSelectedId(null); }
  };

  const handleSelect = (t: Template) => {
    onSelect(t.body);
    setSelectedId(t._id);
    // Panel stays open so user can pick another template
  };

  const handleSave = async () => {
    if (!formBody.trim()) {
      toast.error('Message is required');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        const res = await axios.put('/api/templates', { _id: editId, title: formBody.slice(0, 50), body: formBody });
        setTemplates((prev) => prev.map((t) => t._id === editId ? res.data.template : t));
        toast.success('Updated');
      } else {
        const res = await axios.post('/api/templates', { title: formBody.slice(0, 50), body: formBody });
        setTemplates((prev) => [...prev, res.data.template]);
        toast.success('Saved');
      }
      resetForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (t: Template, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditId(t._id);
    setFormTitle(t.title);
    setFormBody(t.body);
    setShowForm(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this template?')) return;
    try {
      await axios.delete(`/api/templates?id=${id}`);
      setTemplates((prev) => prev.filter((t) => t._id !== id));
      toast.success('Deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormTitle('');
    setFormBody('');
  };

  // Drag to reorder
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver  = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = async (dropIdx: number) => {
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); setDragOverIdx(null); return; }
    const reordered = [...templates];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);
    const withOrder = reordered.map((t, i) => ({ ...t, order: i }));
    setTemplates(withOrder);
    setDragIdx(null); setDragOverIdx(null);
    try {
      await axios.put('/api/templates', { reorder: withOrder.map((t) => ({ _id: t._id, order: t.order })) });
    } catch { toast.error('Reorder failed'); }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        title="Templates"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-400 rounded-lg transition-colors bg-white"
      >
        <Plus size={13} />
        Template
      </button>
    );
  }

  // ── Inline expanded panel ──
  return (
    <div className="border border-blue-200 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border-b border-blue-100">
        <p className="text-xs font-semibold text-blue-700">Message Templates</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowForm(true); setEditId(null); setFormTitle(''); setFormBody(''); }}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus size={12} /> New
          </button>
          <button onClick={handleToggle} className="text-blue-400 hover:text-blue-600">
            <ChevronDown size={15} />
          </button>
        </div>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50 space-y-2">
          <textarea
            value={formBody}
            onChange={(e) => setFormBody(e.target.value)}
            placeholder="Type your message... Use {name} for patient name"
            rows={3}
            autoFocus
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
            >
              <Check size={11} />
              {saving ? 'Saving...' : editId ? 'Update' : 'Save'}
            </button>
            <button onClick={resetForm} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Template list */}
      <div className="max-h-48 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-6 px-3">
            <p className="text-gray-400 text-xs">No templates yet — click "+ New" to create one</p>
          </div>
        ) : (
          templates.map((t, idx) => (
            <div
              key={t._id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
              className={`flex items-center gap-2 px-3 py-2 border-b border-gray-50 last:border-0 transition-colors ${
                selectedId === t._id ? 'bg-blue-50' : dragOverIdx === idx ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              {/* Drag handle */}
              <div className="text-gray-300 hover:text-gray-500 cursor-grab flex-shrink-0">
                <GripVertical size={13} />
              </div>

              {/* Click to use */}
              <button onClick={() => handleSelect(t)} className="flex-1 text-left min-w-0">
                <p className={`text-xs truncate ${selectedId === t._id ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>{t.body}</p>
              </button>

              {/* Edit / Delete */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button onClick={(e) => handleEdit(t, e)} className="p-1 text-gray-300 hover:text-blue-500 rounded">
                  <Pencil size={11} />
                </button>
                <button onClick={(e) => handleDelete(t._id, e)} className="p-1 text-gray-300 hover:text-red-500 rounded">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {templates.length > 1 && (
        <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400">Drag ⠿ to reorder · Click to use</p>
        </div>
      )}
    </div>
  );
}
