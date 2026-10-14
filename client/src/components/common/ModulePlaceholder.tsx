import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from './PageHeader';

/** Temporary screen for modules not built yet. Lists what the module will cover. */
export function ModulePlaceholder({ title, description, todo }: { title: string; description: string; todo: string[] }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent>
          <p className="mb-3 text-sm font-medium">Planned for this module</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {todo.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
