import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export function UserManagement() {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      const response = await apiRequest(`/api/admin/users/${userId}/password`, {
        method: "PATCH",
        body: { password },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password updated successfully",
      });
      setNewPassword("");
      setSelectedUserId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleUserActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: number; isActive: boolean }) => {
      const response = await apiRequest(`/api/admin/users/${userId}/toggle-active`, {
        method: "PATCH",
        body: { isActive },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Loading users...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users?.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 border rounded">
              <div>
                <p className="font-medium">{user.email}</p>
                <p className="text-sm text-gray-500">
                  {user.isAdmin ? "Admin" : "User"} • {user.isVerified ? "Verified" : "Unverified"}
                </p>
              </div>
              <div className="flex gap-2">
                {selectedUserId === user.id ? (
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                    />
                    <Button
                      onClick={() => {
                        if (newPassword) {
                          updatePasswordMutation.mutate({
                            userId: user.id,
                            password: newPassword,
                          });
                        }
                      }}
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => setSelectedUserId(user.id)}>
                    Change Password
                  </Button>
                )}
                <Button
                  variant={user.isActive ? "destructive" : "default"}
                  onClick={() =>
                    toggleUserActiveMutation.mutate({
                      userId: user.id,
                      isActive: !user.isActive,
                    })
                  }
                >
                  {user.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
