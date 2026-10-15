import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAvatarUrl } from '@/features/me/api';
import { cn } from '@/lib/utils';

export function initials(name: string | null | undefined) {
  return (name ?? '').trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

const AVATAR_TONES = [
  'bg-t-speech-soft text-t-speech',
  'bg-t-ot-soft text-t-ot',
  'bg-t-physio-soft text-t-physio',
  'bg-t-other-soft text-t-other',
  'bg-accent text-accent-foreground',
  'bg-success-soft text-success',
];

/** Same name → same colour, so people are easy to spot in lists. */
export function avatarTone(name: string | null | undefined) {
  let h = 0;
  for (const c of name ?? '') h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length];
}

/** Profile photo (private bucket, signed URL) with initials fallback. */
export function UserAvatar({ name, path, className }: { name: string | null | undefined; path?: string | null; className?: string }) {
  const { data: url } = useAvatarUrl(path);
  return (
    <Avatar className={cn('size-8 text-xs', className)}>
      {url && <AvatarImage src={url} alt="" />}
      <AvatarFallback className={cn('font-bold [font-size:inherit]', avatarTone(name))}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
