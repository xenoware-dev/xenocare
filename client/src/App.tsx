import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/queryClient';
import { ConfirmProvider } from '@/components/common/ConfirmDialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/providers/AuthProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { router } from '@/routes/router';

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <ConfirmProvider>
            <AuthProvider>
              <RouterProvider router={router} />
              <Toaster richColors position="top-right" closeButton />
            </AuthProvider>
          </ConfirmProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
