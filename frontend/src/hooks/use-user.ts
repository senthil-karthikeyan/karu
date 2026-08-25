"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi, type UpdateUserRequest } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export function useUserProfileQuery() {
  const setUser = useAuthStore((state) => state.setUser);

  return useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const user = await authApi.getMe();
      setUser(user);
      return user;
    },
    staleTime: 60 * 1000,
  });
}

export function useUpdateUserProfileMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (data: UpdateUserRequest) => authApi.updateMe(data),
    onSuccess: (updated) => {
      setUser(updated);
      queryClient.setQueryData(["user", "me"], updated);
      queryClient.invalidateQueries({ queryKey: ["user", "me"] });
    },
  });
}
