'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  Send,
  RefreshCw,
  FileText,
  Inbox,
  Settings,
  MessageSquare,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

const allNavItems = [
  { href: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard, masterOnly: false },
  { href: '/send-sms',   label: 'Send SMS',      icon: Send,            masterOnly: false },
  { href: '/retry',      label: 'Retry Failed',  icon: RefreshCw,       masterOnly: false },
  { href: '/reports',    label: 'Reports',       icon: FileText,        masterOnly: false },
  { href: '/inbox',      label: 'Inbox',         icon: Inbox,           masterOnly: true  },
  { href: '/settings',   label: 'Settings',      icon: Settings,        masterOnly: true  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<'master_admin' | 'admin' | null>(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    axios.get('/api/auth/me').then((res) => {
      setRole(res.data.role);
      setEmail(res.data.email);
    }).catch(() => {});
  }, []);

  const navItems = allNavItems.filter((item) =>
    item.masterOnly ? role === 'master_admin' : true
  );

  const handleLogout = async () => {
    await axios.post('/api/auth/logout');
    toast.success('Logged out');
    router.push('/login');
  };

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
        <div className="bg-blue-600 p-2 rounded-lg">
          <MessageSquare size={20} />
        </div>
        <div>
          <p className="font-bold text-sm">BulkSMS</p>
          <p className="text-xs text-gray-400">Admin Panel</p>
        </div>
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
      <nav className="flex-1 px-3 py-4 space-y-1">
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
    </aside>
  );
}
