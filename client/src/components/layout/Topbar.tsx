import { Laptop, LogOut, Menu, Moon, Plus, Search, Sun, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router';
import { LogoMark } from '@/components/brand/Logo';
import { UserAvatar } from '@/components/common/UserAvatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeChoice } from '@/providers/ThemeProvider';
import { useQuickActions } from '@/routes/actions';
import { BranchSwitcher } from './BranchSwitcher';
import { PALETTE_SHORTCUT, useCommandPalette } from './CommandPalette';
import { ROLE_LABEL } from './Sidebar';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const actions = useQuickActions();
  const palette = useCommandPalette();

  return (
    <header className="sticky top-0 z-20 flex h-[calc(3.75rem+env(safe-area-inset-top))] items-center gap-2 border-b border-border/60 bg-background/80 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:h-[4.25rem] sm:gap-3 md:px-6 lg:px-8 print:hidden">
      <Button variant="ghost" size="icon" className="hidden md:inline-flex lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu />
      </Button>
      <LogoMark className="size-8 md:hidden" />
      <BranchSwitcher />

      {/* Search: the fastest way to a patient. */}
      <button
        type="button"
        onClick={palette.open}
        className="ml-1 hidden h-10 max-w-sm flex-1 items-center gap-2.5 rounded-xl border bg-card px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:border-primary/30 hover:text-foreground md:flex"
      >
        <Search className="size-4" aria-hidden />
        Search patients, actions…
        <kbd className="ml-auto rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-semibold">{PALETTE_SHORTCUT}</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={palette.open} aria-label="Search">
          <Search />
        </Button>

        {actions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="hidden gap-1.5 px-4 sm:inline-flex">
                <Plus className="size-4" /> New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Create</DropdownMenuLabel>
              {actions.map((a) => (
                <DropdownMenuItem key={a.label} onSelect={() => navigate(a.to)} className="gap-3">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-accent">
                    <a.icon className="text-primary" />
                  </span>
                  <span>
                    <span className="block font-semibold">{a.label}</span>
                    <span className="block text-xs text-muted-foreground">{a.hint}</span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {profile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full ring-offset-2 ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
                <UserAvatar name={profile.full_name || profile.email} path={profile.avatar_url} className="size-9" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="flex items-center gap-3 font-normal">
                <UserAvatar name={profile.full_name || profile.email} path={profile.avatar_url} className="size-10" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{profile.full_name || 'Your account'}</span>
                  <span className="block truncate text-xs text-muted-foreground">{profile.email}</span>
                  <span className="mt-0.5 block text-xs font-semibold text-primary">{ROLE_LABEL[profile.role]}</span>
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/profile')}>
                <UserRound /> My profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Appearance</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemeChoice)}>
                <DropdownMenuRadioItem value="light"><Sun /> Light</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark"><Moon /> Dark</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system"><Laptop /> System</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut} variant="destructive">
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
