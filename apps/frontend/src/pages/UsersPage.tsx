/**
 * @fileoverview Admin user management page.
 * Lists users and lets an admin create, re-role, reset the password of, and
 * delete accounts. Every action is also enforced by the backend (ADMIN only).
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { ManagedRole, ManagedUser } from '@/api/users';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useCreateUser,
  useDeleteUser,
  useResetUserPassword,
  useUpdateUser,
  useUsers,
} from '@/hooks/useUsers';
import { useAuthStore } from '@/storage/auth.store';

/** Selectable roles, most privileged first. */
const ROLES: ManagedRole[] = ['ADMIN', 'EDITOR', 'VIEWER'];

/** Validation for the create-user form. */
const createUserSchema = z.object({
  email: z.string().email('Enter a valid email'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

/** Shared input class. */
const inputClass =
  'w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors';

/** A single user row with inline role change and actions. */
function UserRow({
  user,
  currentUserId,
}: {
  user: ManagedUser;
  currentUserId: string | undefined;
}) {
  const updateUser = useUpdateUser();
  const resetPassword = useResetUserPassword();
  const deleteUser = useDeleteUser();
  const isSelf = user.id === currentUserId;

  const onResetPassword = () => {
    const next = window.prompt(`New password for ${user.email} (min 12 chars):`);
    if (next === null) return;
    if (next.length < 12) {
      toast.error('Password must be at least 12 characters');
      return;
    }
    resetPassword.mutate({ id: user.id, newPassword: next });
  };

  const onDelete = () => {
    if (!window.confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    deleteUser.mutate(user.id);
  };

  return (
    <tr className="border-t border-[var(--color-border-primary)]">
      <td className="px-3 py-2.5">
        <div className="text-sm text-[var(--color-text-primary)]">{user.name}</div>
        <div className="text-xs text-[var(--color-text-tertiary)]">{user.email}</div>
      </td>
      <td className="px-3 py-2.5">
        <select
          aria-label={`Role for ${user.email}`}
          value={user.role}
          disabled={isSelf || updateUser.isPending}
          onChange={(e) => updateUser.mutate({ id: user.id, role: e.target.value as ManagedRole })}
          className={`${inputClass} w-auto py-1.5 disabled:opacity-50`}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2.5">
        {user.mustChangePassword ? (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            Must change password
          </span>
        ) : (
          <span className="text-[11px] text-[var(--color-text-tertiary)]">Active</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        <button
          type="button"
          onClick={onResetPassword}
          disabled={resetPassword.isPending}
          className="text-xs font-medium text-brand-500 hover:text-brand-600 disabled:opacity-50 mr-3"
        >
          Reset password
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isSelf || deleteUser.isPending}
          className="text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-30"
          title={isSelf ? 'You cannot delete your own account' : undefined}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

/**
 * Renders the admin-only user management page.
 * @returns Users page element
 */
export function UsersPage() {
  const { canManageSources } = usePermissions();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: '', name: '', password: '', role: 'VIEWER' },
  });

  const onSubmit = (data: CreateUserFormData) => {
    createUser.mutate(data, {
      onSuccess: () => {
        reset();
        setShowForm(false);
      },
    });
  };

  if (!canManageSources) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Users</h1>
        <EmptyState title="Not authorized" description="Only administrators can manage users." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Users</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors"
        >
          {showForm ? 'Cancel' : 'Add user'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] p-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              Name
            </label>
            <input id="name" {...register('name')} className={inputClass} placeholder="Full name" />
            {errors.name && <p className="text-[11px] text-red-500">{errors.name.message}</p>}
          </div>
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
              {...register('email')}
              className={inputClass}
              placeholder="user@example.com"
            />
            {errors.email && <p className="text-[11px] text-red-500">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              Temporary password
            </label>
            <input
              id="password"
              type="text"
              {...register('password')}
              className={inputClass}
              placeholder="At least 12 characters"
            />
            {errors.password && (
              <p className="text-[11px] text-red-500">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="role"
              className="block text-xs font-medium text-[var(--color-text-secondary)]"
            >
              Role
            </label>
            <select id="role" {...register('role')} className={inputClass}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={createUser.isPending}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {createUser.isPending ? 'Creating...' : 'Create user'}
            </button>
          </div>
        </form>
      )}

      <section className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <LoadingSpinner size={32} />
          </div>
        ) : !users || users.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No users" description="Create the first user to get started." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <UserRow key={u.id} user={u} currentUserId={currentUserId} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
