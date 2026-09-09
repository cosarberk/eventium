/**
 * @fileoverview Authentication guard wrapper component.
 * Redirects unauthenticated users to the login page and shows
 * a loading spinner during the initial session check.
 */

import { useNavigate } from '@tanstack/react-router';
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
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void navigate({ to: '/login' });
    }
  }, [isLoading, isAuthenticated, navigate]);

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
