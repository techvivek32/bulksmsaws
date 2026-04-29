'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Send, RefreshCw, FileText,
  Inbox, Settings, MessageSquare, LogOut,
  ShieldCheck, Menu, X, Edit3,
} from 'lucide-react';

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard',   icon: LayoutDashboard, masterOnly: false },
  { href: '/compose',   label: 'Compose',     icon: Edit3,           masterOnly: false },
  { href: '/send-sms',  label: 'Send SMS',     icon: Send,            masterOnly: true  },
  { href: '/retry',     label: 'Retry Failed', icon: RefreshCw,       masterOnly: false },
  { href: '/reports',   label: 'Reports',      icon: FileText,        masterOnly: false },
  { href: '/inbox',     label: 'Inbox',        icon: Inbox,           masterOnly: false },
  { href: '/settings',  label: 'Settings',     icon: Settings,        masterOnly: true  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [role, setRole]       = useState<'master_admin' | 'admin' | null>(null);
  const [email, setEmail]     = useState('');
  const [open, setOpen]       = useState(false); // mobile drawer

  useEffect(() => {
    axios.get('/api/auth/me').then((res) => {
      setRole(res.data.role);
      setEmail(res.data.email);
    }).catch(() => {});
  }, []);

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  const navItems = allNavItems.filter((item) =>
    item.masterOnly ? role === 'master_admin' : true
  );

  const handleLogout = async () => {
    await axios.post('/api/auth/logout');
    toast.success('Logged out');
    router.push('/login');
  };

  /* ── Shared nav content ── */
  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
        <div className="bg-blue-600 p-2 rounded-lg flex-shrink-0">
          <MessageSquare size={20} />
        </div>
        <div>
          <p className="font-bold text-sm">BulkSMS</p>
          <p className="text-xs text-gray-400">Admin Panel</p>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setOpen(false)}
          className="ml-auto lg:hidden text-gray-400 hover:text-white p-1"
        >
          <X size={20} />
        </button>
      </div>

      {/* Role badge */}
      {role && (
        <div className="px-6 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className={role === 'master_admin' ? 'text-yellow-400' : 'text-blue-400'} />
            <span className={`text-xs font-semibold ${role === 'master_admin' ? 'text-yellow-400' : 'text-blue-400'}`}>
              {role === 'master_admin' ? 'Master Admin' : 'Admin'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{email}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white w-full transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── DESKTOP sidebar (lg+) ── */}
      <aside className="hidden lg:flex w-64 h-screen sticky top-0 bg-gray-900 text-white flex-col flex-shrink-0">
        <NavContent />
      </aside>

      {/* ── MOBILE top navbar ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 text-white flex items-center px-4 py-3 border-b border-gray-700">
        <button onClick={() => setOpen(true)} className="text-gray-300 hover:text-white p-1 mr-3">
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <MessageSquare size={16} />
          </div>
          <p className="font-bold text-sm">BulkSMS Admin</p>
        </div>
        {role && (
          <div className="ml-auto flex items-center gap-1.5">
            <ShieldCheck size={13} className={role === 'master_admin' ? 'text-yellow-400' : 'text-blue-400'} />
            <span className={`text-xs font-semibold ${role === 'master_admin' ? 'text-yellow-400' : 'text-blue-400'}`}>
              {role === 'master_admin' ? 'Master Admin' : 'Admin'}
            </span>
          </div>
        )}
      </div>

      {/* ── MOBILE drawer overlay ── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Drawer */}
          <aside
            className="relative w-72 h-full bg-gray-900 text-white flex flex-col z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <NavContent />
          </aside>
        </div>
      )}
    </>
  );
}
