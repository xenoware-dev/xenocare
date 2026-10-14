import { ModulePlaceholder } from '@/components/common/ModulePlaceholder';

export function SettingsPage() {
  return (
    <ModulePlaceholder
      title="Settings"
      description="Organization settings"
      todo={[
        'Organization profile, logo, currency, timezone',
        'Roles and permission overrides',
        'WhatsApp templates and reminder rules',
      ]}
    />
  );
}
