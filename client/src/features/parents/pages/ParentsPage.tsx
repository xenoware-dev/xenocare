import { ModulePlaceholder } from '@/components/common/ModulePlaceholder';

export function ParentsPage() {
  return (
    <ModulePlaceholder
      title="Parents"
      description="Parent and guardian contacts (WhatsApp)"
      todo={[
        'Parent list with WhatsApp number and opt-in',
        'Link parents to students (siblings share one parent)',
        'Send a WhatsApp message to the parents of a student',
      ]}
    />
  );
}
