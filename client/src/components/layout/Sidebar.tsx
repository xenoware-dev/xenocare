import { HeartPulse, LogOut } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { NAV } from '@/routes/nav';

export const ROLE_LABEL = { owner: 'Owner', admin: 'Branch admin', therapist: 'Therapist' } as const;

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { permissions, profile, signOut } = useAuth();
  const role = profile?.role;

  return (
    <nav className="flex h-full flex-col bg-sidebar text-sidebar-foreground" aria-label="Main">
      <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <HeartPulse className="size-5" aria-hidden />
        </span>
        <span>
          <span className="block text-base leading-tight font-bold">XenoCare</span>
          <span className="block text-[11px] text-muted-foreground">Therapy centre</span>
        </span>
      </Link>

      <div className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.map((group) => {
          const items = group.items.filter(
            (i) => (!i.permission || permissions.has(i.permission)) && (!i.roles || (role && i.roles.includes(role))),
          );
          if (!items.length) return null;
          return (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{group.label}</p>
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/80 hover:bg-muted hover:text-sidebar-foreground',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon className={cn('size-[18px]', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} aria-hidden />
                          {role === 'therapist' && item.therapistLabel ? item.therapistLabel : item.label}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {profile && (
        <div className="m-3 flex items-center gap-3 rounded-xl border bg-background/60 p-2.5">
          <Link to="/profile" onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-2.5">
            <UserAvatar name={profile.full_name || profile.email} path={profile.avatar_url} className="size-9" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{profile.full_name || profile.email}</span>
              <span className="block truncate text-xs text-muted-foreground">{ROLE_LABEL[profile.role]}</span>
            </span>
          </Link>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={signOut} aria-label="Sign out">
                <LogOut className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
        </div>
      )}
    </nav>
  );
}
