import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — desktop: visible, mobile: hidden (shown as drawer via Sidebar component) */}
      <Sidebar />

      {/* Main content — pt-14 on mobile to clear the fixed top navbar */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
