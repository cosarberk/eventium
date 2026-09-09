/**
 * @fileoverview Login page with email/password authentication.
 * Provides a centered card layout with form validation and theme support.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';

/** Validation schema for the login form */
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Renders the login page with a centered card containing email/password fields.
 * Redirects to the dashboard on successful authentication.
 * @returns Login page element
 */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      void navigate({ to: '/' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-lg font-bold">E</span>
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Welcome back</h1>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
            Sign in to your Eventium account
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] shadow-sm p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Server error */}
            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Email field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-[var(--color-text-secondary)]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                {...register('email')}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-[11px] text-red-500">{errors.email.message}</p>}
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[var(--color-text-secondary)]"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="text-[11px] text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg text-sm font-semibold bg-brand-500 text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Register link */}
        <p className="text-center text-xs text-[var(--color-text-tertiary)] mt-5">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            className="text-brand-500 hover:text-brand-600 font-medium transition-colors"
          >
            Register
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
