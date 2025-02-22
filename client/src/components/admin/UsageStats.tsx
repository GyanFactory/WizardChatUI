import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Chart } from "@/components/ui/chart";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import type { User, Project, UsageStats as UsageStatsType } from "@shared/schema";

export function UsageStats() {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    to: new Date(),
  });

  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");

  // Fetch users for filtering
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  // Fetch projects for filtering
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/admin/projects"],
  });

  // Fetch usage statistics with filters
  const { data: usageStats, isLoading } = useQuery<UsageStatsType[]>({
    queryKey: [
      "/api/admin/usage-stats",
      dateRange.from.toISOString(),
      dateRange.to.toISOString(),
      selectedUser,
      selectedProject,
    ],
  });

  if (isLoading) {
    return <div>Loading usage statistics...</div>;
  }

  // Calculate totals
  const statsGroupedByUser = usageStats?.reduce((acc, stat) => {
    const userId = stat.userId.toString();
    if (!acc[userId]) {
      acc[userId] = { requests: 0, tokens: 0, user: users?.find(u => u.id === stat.userId) };
    }
    acc[userId].requests += stat.requestCount;
    acc[userId].tokens += stat.tokensUsed;
    return acc;
  }, {} as Record<string, { requests: number; tokens: number; user?: User }>);

  const statsGroupedByProject = usageStats?.reduce((acc, stat) => {
    const projectId = stat.projectId.toString();
    if (!acc[projectId]) {
      acc[projectId] = { requests: 0, tokens: 0, project: projects?.find(p => p.id === stat.projectId) };
    }
    acc[projectId].requests += stat.requestCount;
    acc[projectId].tokens += stat.tokensUsed;
    return acc;
  }, {} as Record<string, { requests: number; tokens: number; project?: Project }>);

  // Prepare chart data
  const chartData = usageStats?.reduce((acc, stat) => {
    const date = new Date(stat.date).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { date, requests: 0, tokens: 0 };
    }
    acc[date].requests += stat.requestCount;
    acc[date].tokens += stat.tokensUsed;
    return acc;
  }, {} as Record<string, { date: string; requests: number; tokens: number }>);

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <DateRangePicker
              from={dateRange.from}
              to={dateRange.to}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }}
            />
            <Select
              value={selectedUser}
              onValueChange={setSelectedUser}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedProject}
              onValueChange={setSelectedProject}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Total Users</div>
                <div className="text-2xl font-bold">{Object.keys(statsGroupedByUser || {}).length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Total Projects</div>
                <div className="text-2xl font-bold">{Object.keys(statsGroupedByProject || {}).length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Total Requests</div>
                <div className="text-2xl font-bold">
                  {Object.values(statsGroupedByUser || {}).reduce((sum, stat) => sum + stat.requests, 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-8">
            <h3 className="mb-4 text-lg font-semibold">Usage Over Time</h3>
            <div className="h-[300px]">
              <Chart
                data={Object.values(chartData || {})}
                categories={["requests", "tokens"]}
                colors={["#2563eb", "#10b981"]}
              />
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="mb-4 text-lg font-semibold">Usage by User</h3>
              <div className="rounded-md border">
                <div className="grid grid-cols-3 gap-4 p-4 font-medium">
                  <div>User</div>
                  <div>Requests</div>
                  <div>Tokens</div>
                </div>
                {Object.entries(statsGroupedByUser || {}).map(([userId, stats]) => (
                  <div key={userId} className="grid grid-cols-3 gap-4 border-t p-4">
                    <div>{stats.user?.email || userId}</div>
                    <div>{stats.requests}</div>
                    <div>{stats.tokens}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-lg font-semibold">Usage by Project</h3>
              <div className="rounded-md border">
                <div className="grid grid-cols-3 gap-4 p-4 font-medium">
                  <div>Project</div>
                  <div>Requests</div>
                  <div>Tokens</div>
                </div>
                {Object.entries(statsGroupedByProject || {}).map(([projectId, stats]) => (
                  <div key={projectId} className="grid grid-cols-3 gap-4 border-t p-4">
                    <div>{stats.project?.name || projectId}</div>
                    <div>{stats.requests}</div>
                    <div>{stats.tokens}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}