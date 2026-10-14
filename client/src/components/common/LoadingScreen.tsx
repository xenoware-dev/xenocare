import { HeartPulse } from 'lucide-react';

export function LoadingScreen({ fullScreen }: { fullScreen?: boolean }) {
  return (
    <div className={fullScreen ? 'flex min-h-screen items-center justify-center' : 'flex min-h-[50vh] items-center justify-center'} role="status">
      <span className="flex size-12 animate-pulse items-center justify-center rounded-2xl bg-accent text-primary">
        <HeartPulse className="size-6" aria-hidden />
      </span>
      <span className="sr-only">Loading</span>
    </div>
  );
}
