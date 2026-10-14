import { ModulePlaceholder } from '@/components/common/ModulePlaceholder';

export function BillingPage() {
  return (
    <ModulePlaceholder
      title="Billing"
      description="Fees, invoices and payment records"
      todo={[
        'Fee plans per branch',
        'Create invoices and record payments (cash, UPI, bank, card)',
        'Outstanding dues with WhatsApp payment reminder',
      ]}
    />
  );
}
