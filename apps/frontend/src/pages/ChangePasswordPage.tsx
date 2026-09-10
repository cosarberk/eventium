/**
 * @fileoverview Change-password page.
 * Used both for the forced first-login reset (AuthGuard redirects here when the
 * account is flagged) and for a voluntary password change.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';

/** Validation schema for the change-password form. */
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(12, 'New password must be at least 12 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

/**
 * Renders the change-password card. On success, navigates to the dashboard.
 * @returns Change password page element
 */
export function ChangePasswordPage() {
  const { changePassword } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await changePassword(data.currentPassword, data.newPassword);
      toast.success('Password updated');
      void navigate({ to: '/' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-lg font-bold">E</span>
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Set a new password</h1>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
            Choose a new password to continue
          </p>
        </div>

        <div className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] shadow-sm p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="currentPassword"
                className="block text-xs font-medium text-[var(--color-text-secondary)]"
              >
                Current password
              </label>
              <input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...register('currentPassword')}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                placeholder="Current password"
              />
              {errors.currentPassword && (
                <p className="text-[11px] text-red-500">{errors.currentPassword.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="newPassword"
                className="block text-xs font-medium text-[var(--color-text-secondary)]"
              >
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...register('newPassword')}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                placeholder="At least 12 characters"
              />
              {errors.newPassword && (
                <p className="text-[11px] text-red-500">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-medium text-[var(--color-text-secondary)]"
              >
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword')}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                placeholder="Repeat the new password"
              />
              {errors.confirmPassword && (
                <p className="text-[11px] text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg text-sm font-semibold bg-brand-500 text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Update password'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
