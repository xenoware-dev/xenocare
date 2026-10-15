import { Activity, Hand, MessageCircle, Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { THERAPY_LABELS, type TherapyType } from '@/types/app';

/** One colour + icon per therapy, used for chips, timeline bars and avatars. */
export const THERAPY_STYLE: Record<TherapyType, { icon: LucideIcon; chip: string; bar: string; short: string }> = {
  speech: { icon: MessageCircle, chip: 'bg-t-speech-soft text-t-speech', bar: 'bg-t-speech', short: 'Speech' },
  ot: { icon: Hand, chip: 'bg-t-ot-soft text-t-ot', bar: 'bg-t-ot', short: 'OT' },
  physio: { icon: Activity, chip: 'bg-t-physio-soft text-t-physio', bar: 'bg-t-physio', short: 'Physio' },
  other: { icon: Sparkles, chip: 'bg-t-other-soft text-t-other', bar: 'bg-t-other', short: 'Other' },
};

export function TherapyChip({ type, short, className }: { type: TherapyType; short?: boolean; className?: string }) {
  const s = THERAPY_STYLE[type] ?? THERAPY_STYLE.other;
  const Icon = s.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap', s.chip, className)}>
      <Icon className="size-3" aria-hidden />
      {short ? s.short : THERAPY_LABELS[type]}
    </span>
  );
}
