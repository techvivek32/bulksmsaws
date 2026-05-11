'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Send, RefreshCw, FileText,
  Inbox, Settings, MessageSquare, LogOut,
  ShieldCheck, Menu, X, Edit3, ChevronLeft, ChevronRight,
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
  const pathname  = usePathname();
  const router    = useRouter();
  const [role, setRole]         = useState<'master_admin' | 'admin' | null>(null);
  const [email, setEmail]       = useState('');
  const [open, setOpen]         = useState(false);       // mobile drawer
  const [collapsed, setCollapsed] = useState(false);     // desktop collapse

  useEffect(() => {
    axios.get('/api/auth/me').then((res) => {
      setRole(res.data.role);
      setEmail(res.data.email);
    }).catch(() => {});
  }, []);

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
  const NavContent = ({ mini = false }: { mini?: boolean }) => (
    <>
      {/* Logo */}
      <div className={`flex items-center border-b border-gray-700 ${mini ? 'justify-center px-3 py-5' : 'gap-3 px-4 py-5'}`}>
        <div className="bg-blue-600 p-2 rounded-lg flex-shrink-0">
          <MessageSquare size={20} />
        </div>
        {!mini && (
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">BulkSMS</p>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        )}
        {/* Mobile close */}
        {!mini && (
          <button onClick={() => setOpen(false)} className="ml-auto lg:hidden text-gray-400 hover:text-white p-1">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Role badge */}
      {role && !mini && (
        <div className="px-4 py-3 border-b border-gray-700">
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
      <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${mini ? 'px-2' : 'px-3'}`}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              title={mini ? label : undefined}
              className={`flex items-center rounded-lg text-sm font-medium transition-colors ${
                mini ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
              } ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {!mini && label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className={`py-4 border-t border-gray-700 ${mini ? 'px-2' : 'px-3'}`}>
        <button
          onClick={handleLogout}
          title={mini ? 'Logout' : undefined}
          className={`flex items-center rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white w-full transition-colors ${
            mini ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'
          }`}
        >
          <LogOut size={18} />
          {!mini && 'Logout'}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── DESKTOP sidebar ── */}
      <aside
        className={`hidden lg:flex h-screen sticky top-0 bg-gray-900 text-white flex-col flex-shrink-0 transition-all duration-300 relative ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <NavContent mini={collapsed} />

        {/* Collapse toggle button */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="absolute -right-3 top-20 w-6 h-6 bg-gray-700 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors z-10"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
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

      {/* ── MOBILE drawer ── */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
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
