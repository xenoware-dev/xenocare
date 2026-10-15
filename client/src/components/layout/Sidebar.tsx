import { LogOut, Search } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import { Logo } from '@/components/brand/Logo';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { visibleNav } from '@/routes/nav';
import { PALETTE_SHORTCUT, useCommandPalette } from './CommandPalette';

export const ROLE_LABEL = { owner: 'Owner', admin: 'Branch admin', therapist: 'Therapist' } as const;

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { permissions, profile, signOut } = useAuth();
  const palette = useCommandPalette();
  const groups = visibleNav(permissions, profile?.role);

  return (
    <nav className="relative flex h-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground" aria-label="Main">
      {/* soft brand glow */}
      <div className="pointer-events-none absolute -top-24 -left-20 size-64 rounded-full bg-sidebar-primary/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -right-24 size-56 rounded-full bg-sunflower/10 blur-3xl" aria-hidden />

      <Link to="/" onClick={onNavigate} className="relative px-5 pt-6 pb-5">
        <Logo tone="light" />
      </Link>

      <div className="relative px-3 pb-3">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            palette.open();
          }}
          className="flex w-full items-center gap-2.5 rounded-xl bg-white/[0.07] px-3 py-2.5 text-sm text-sidebar-foreground/70 ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Search className="size-4" aria-hidden />
          Search…
          <kbd className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold">{PALETTE_SHORTCUT}</kbd>
        </button>
      </div>

      <div className="relative flex-1 space-y-5 overflow-y-auto px-3 pt-2 pb-4 scrollbar-none">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[10.5px] font-bold tracking-[0.14em] text-sidebar-foreground/45 uppercase">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/75 hover:bg-white/[0.05] hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <span className="absolute top-1/2 -left-3 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" aria-hidden />}
                        <span
                          className={cn(
                            'flex size-7 items-center justify-center rounded-lg transition-colors',
                            isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/60 group-hover:text-white',
                          )}
                        >
                          <item.icon className="size-4" aria-hidden />
                        </span>
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {profile && (
        <div className="relative m-3 flex items-center gap-3 rounded-2xl bg-white/[0.06] p-2.5 ring-1 ring-white/10">
          <Link to="/profile" onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-2.5">
            <UserAvatar name={profile.full_name || profile.email} path={profile.avatar_url} className="size-9 ring-2 ring-sidebar-primary/40" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">{profile.full_name || profile.email}</span>
              <span className="block truncate text-xs text-sidebar-foreground/60">{ROLE_LABEL[profile.role]}</span>
            </span>
          </Link>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-white/10 hover:text-white"
                onClick={signOut}
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
        </div>
      )}
    </nav>
  );
}
