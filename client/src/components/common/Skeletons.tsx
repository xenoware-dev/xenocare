import { EmptyState } from './EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { TableCell, TableRow } from '@/components/ui/table';

/** Placeholder rows while a table loads. */
export function TableSkeleton({ rows = 4, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <TableRow key={r} className="hover:bg-transparent">
          {Array.from({ length: cols }, (_, c) => (
            <TableCell key={c}>
              <Skeleton className={c === 0 ? 'h-4 w-32' : 'h-4 w-20'} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/** Placeholder list items while a list loads. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-9 w-16" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

export function StatSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-[104px] rounded-xl" />
      ))}
    </div>
  );
}

/** Full-width "nothing here" row inside a table. */
export function EmptyTableRow({
  cols,
  icon,
  title,
  description,
  action,
}: {
  cols: number;
  icon: React.ComponentProps<typeof EmptyState>['icon'];
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={cols} className="whitespace-normal">
        <EmptyState icon={icon} title={title} description={description} action={action} className="py-8" />
      </TableCell>
    </TableRow>
  );
}
