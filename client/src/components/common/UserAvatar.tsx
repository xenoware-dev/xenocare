import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAvatarUrl } from '@/features/me/api';
import { cn } from '@/lib/utils';

export function initials(name: string | null | undefined) {
  return (name ?? '').trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

/** Profile photo (private bucket, signed URL) with initials fallback. */
export function UserAvatar({ name, path, className }: { name: string | null | undefined; path?: string | null; className?: string }) {
  const { data: url } = useAvatarUrl(path);
  return (
    <Avatar className={cn('size-8', className)}>
      {url && <AvatarImage src={url} alt="" />}
      <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
