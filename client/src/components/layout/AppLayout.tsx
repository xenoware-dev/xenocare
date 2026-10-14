import { X } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { Button } from '@/components/ui/button';
import { BranchProvider } from '@/providers/BranchProvider';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  // New page → start at the top.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <BranchProvider>
      <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr] print:block">
        <aside className="hidden border-r border-sidebar-border lg:block print:hidden">
          <div className="sticky top-0 h-screen">
            <Sidebar />
          </div>
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <button className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 border-r shadow-xl animate-in slide-in-from-left duration-200">
              <Button variant="ghost" size="icon" className="absolute top-4 right-3 z-10" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X />
              </Button>
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-col">
          <Topbar onMenu={() => setMobileOpen(true)} />
          <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 md:p-6 lg:p-8 print:max-w-none print:p-0">
            <Suspense fallback={<LoadingScreen />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </BranchProvider>
  );
}
