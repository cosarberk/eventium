/**
 * @fileoverview Root application component with all provider wrappers.
 * Composes urql, TanStack Query, TanStack Router, Radix Theme, and Sonner providers.
 * Performs an initial authentication check on mount.
 */

import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { Provider as UrqlProvider } from 'urql';
import { urqlClient } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { router } from '@/router';
import { useThemeStore } from '@/storage/theme.store';

/** TanStack Query client with default configuration */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Inner component that runs the auth check.
 * Separated so it can access hooks within provider context.
 * @returns Application router
 */
function AppInner() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  return <RouterProvider router={router} />;
}

/**
 * Root application component that provides all context providers
 * required by the Eventium frontend application.
 * @returns Application root element
 */
export function App() {
  const themeMode = useThemeStore((s) => s.mode);

  return (
    <UrqlProvider value={urqlClient}>
      <QueryClientProvider client={queryClient}>
        <Theme appearance={themeMode} accentColor="iris" radius="medium">
          <AppInner />
          <Toaster
            position="bottom-right"
            theme={themeMode}
            richColors
            closeButton
            toastOptions={{
              duration: 5000,
              className: 'text-sm',
            }}
          />
        </Theme>
      </QueryClientProvider>
    </UrqlProvider>
  );
}
