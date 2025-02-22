import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Chart } from "@/components/ui/chart";
import type { UsageStats as UsageStatsType } from "@shared/schema";

export function UsageStats() {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    to: new Date(),
  });

  const { data: usageStats, isLoading } = useQuery<UsageStatsType[]>({
    queryKey: [
      "/api/admin/usage-stats",
      dateRange.from.toISOString(),
      dateRange.to.toISOString(),
    ],
  });

  if (isLoading) {
    return <div>Loading usage statistics...</div>;
  }

  const totalRequests = usageStats?.reduce((acc, stat) => acc + stat.requestCount, 0) || 0;
  const totalTokens = usageStats?.reduce((acc, stat) => acc + stat.tokensUsed, 0) || 0;

  const chartData = usageStats?.reduce((acc, stat) => {
    const date = new Date(stat.date).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { requests: 0, tokens: 0 };
    }
    acc[date].requests += stat.requestCount;
    acc[date].tokens += stat.tokensUsed;
    return acc;
  }, {} as Record<string, { requests: number; tokens: number }>);

  const chartConfig = {
    data: Object.entries(chartData || {}).map(([date, stats]) => ({
      date,
      requests: stats.requests,
      tokens: stats.tokens,
    })),
    categories: ["requests", "tokens"],
    colors: ["#2563eb", "#10b981"],
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Statistics</CardTitle>
        <DateRangePicker
          from={dateRange.from}
          to={dateRange.to}
          onSelect={(range) => {
            if (range?.from && range?.to) {
              setDateRange({ from: range.from, to: range.to });
            }
          }}
        />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 border rounded">
            <p className="text-sm text-gray-500">Total Requests</p>
            <p className="text-2xl font-bold">{totalRequests}</p>
          </div>
          <div className="p-4 border rounded">
            <p className="text-sm text-gray-500">Total Tokens</p>
            <p className="text-2xl font-bold">{totalTokens}</p>
          </div>
        </div>
        <Chart {...chartConfig} />
      </CardContent>
    </Card>
  );
}
