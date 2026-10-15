import { LogoMark } from '@/components/brand/Logo';

export function LoadingScreen({ fullScreen }: { fullScreen?: boolean }) {
  return (
    <div className={fullScreen ? 'flex min-h-screen items-center justify-center' : 'flex min-h-[50vh] items-center justify-center'} role="status">
      <span className="animate-pulse">
        <LogoMark className="size-12" />
      </span>
      <span className="sr-only">Loading</span>
    </div>
  );
}
