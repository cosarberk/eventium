/**
 * @fileoverview Authentication guard wrapper component.
 * Redirects unauthenticated users to the login page and shows
 * a loading spinner during the initial session check.
 */

import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect } from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuthStore } from '@/storage/auth.store';

interface AuthGuardProps {
  /** Content to render when the user is authenticated */
  children: React.ReactNode;
}

/**
 * Wraps protected routes to enforce authentication.
 * Displays a full-screen spinner while the auth check is in progress.
 * Navigates to /login if the user is not authenticated.
 * @param props - Component props
 * @returns The guarded content or a loading/redirect state
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const mustChangePassword = useAuthStore((s) => s.user?.mustChangePassword ?? false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      void navigate({ to: '/login' });
      return;
    }
    // Force the first-login password change before anything else.
    if (mustChangePassword && pathname !== '/change-password') {
      void navigate({ to: '/change-password' });
    }
  }, [isLoading, isAuthenticated, mustChangePassword, pathname, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg-primary)]">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
