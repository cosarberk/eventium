/**
 * @fileoverview React Query hooks for admin user management.
 * Errors surface through the global query/mutation handlers (toasts); these
 * hooks add success toasts and cache invalidation.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CreateUserInput, UpdateUserInput } from '@/api/users';
import * as usersApi from '@/api/users';

/** Query-key factory for user data. */
export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
};

/** Fetch every user. */
export function useUsers() {
  return useQuery({ queryKey: userKeys.list(), queryFn: usersApi.listUsers });
}

/** Create a user. */
export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => usersApi.createUser(input),
    onSuccess: () => {
      toast.success('User created');
      void qc.invalidateQueries({ queryKey: userKeys.list() });
    },
  });
}

/** Update a user's name and/or role. */
export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateUserInput & { id: string }) =>
      usersApi.updateUser(id, input),
    onSuccess: () => {
      toast.success('User updated');
      void qc.invalidateQueries({ queryKey: userKeys.list() });
    },
  });
}

/** Reset a user's password. */
export function useResetUserPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      usersApi.resetUserPassword(id, newPassword),
    onSuccess: () => {
      toast.success('Password reset');
      void qc.invalidateQueries({ queryKey: userKeys.list() });
    },
  });
}

/** Delete a user. */
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      toast.success('User deleted');
      void qc.invalidateQueries({ queryKey: userKeys.list() });
    },
  });
}
