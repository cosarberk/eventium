/**
 * @fileoverview Registration page with name, email, and password fields.
 * Provides a centered card layout with form validation and theme support.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';

/** Validation schema for the registration form */
const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Renders the registration page with a centered card containing
 * name, email, password, and confirm password fields.
 * Redirects to the dashboard on successful registration.
 * @returns Register page element
 */
export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await registerUser(data.email, data.name, data.password);
      void navigate({ to: '/' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            Create your account
          </h1>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
            Get started with Eventium
          </p>
        </div>

        {/* Register card */}
        <div className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] shadow-sm p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Server error */}
            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Name field */}
            <div className="space-y-1.5">
              <label
                htmlFor="name"
                className="block text-xs font-medium text-[var(--color-text-secondary)]"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                autoFocus
                {...register('name')}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                placeholder="Your name"
              />
              {errors.name && <p className="text-[11px] text-red-500">{errors.name.message}</p>}
            </div>

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
                autoComplete="new-password"
                {...register('password')}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                placeholder="At least 8 characters"
              />
              {errors.password && (
                <p className="text-[11px] text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm password field */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-medium text-[var(--color-text-secondary)]"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword')}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors"
                placeholder="Repeat your password"
              />
              {errors.confirmPassword && (
                <p className="text-[11px] text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg text-sm font-semibold bg-brand-500 text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        {/* Login link */}
        <p className="text-center text-xs text-[var(--color-text-tertiary)] mt-5">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-brand-500 hover:text-brand-600 font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
