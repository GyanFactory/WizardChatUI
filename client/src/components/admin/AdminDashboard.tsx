import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserManagement } from "./UserManagement";
import { ModelSettings } from "./ModelSettings";
import { UsageStats } from "./UsageStats";
import { useNavigate } from "wouter";

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.isAdmin) {
      toast({
        title: "Unauthorized",
        description: "You need admin privileges to access this page",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [user, navigate, toast]);

  if (!user?.isAdmin) return null;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>
      <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
        <UserManagement />
        <ModelSettings />
        <UsageStats />
      </div>
    </div>
  );
}
