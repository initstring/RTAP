"use client";

import { useState } from "react";
import { TrendingUp, Activity, Eye, Shield, Clock } from "lucide-react";
import { api } from "@/trpc/react";
import { Card, CardContent } from "@/components/ui/card";
import { TimeRangeFilter, type TimeRange } from "@features/shared/time-range-filter";
import {
  useTrendsData,
  OperationsActivityChart,
  OperationsTimelineChart,
  TechniqueActivityChart,
  RateTrendChart,
  TimeTrendChart,
} from "@features/analytics/components/trends";

export default function TrendsPage() {
  const [range, setRange] = useState<TimeRange>("all");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const { chartData, timelineData, isLoading } = useTrendsData({
    range,
    customStartDate,
    customEndDate,
    selectedTagIds,
  });

  const { data: allTags } = api.taxonomy.tags.list.useQuery();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent)]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-[var(--color-accent)]" />
          Trends & Insights
        </h1>
      </div>

      <TimeRangeFilter
        range={range}
        setRange={setRange}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        selectedTagIds={selectedTagIds}
        setSelectedTagIds={setSelectedTagIds}
        allTags={allTags}
      />

      {chartData.length === 0 && timelineData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
            <p className="text-[var(--color-text-muted)]">
              {selectedTagIds.length > 0
                ? "No trend data available for the selected time period and tag filters. Try adjusting your filters or time period."
                : "No trend data available for the selected time period. Create and complete operations to see trends over time."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {timelineData.length > 0 && <OperationsTimelineChart data={timelineData} />}
          {chartData.length > 0 && (
            <>
              <OperationsActivityChart data={chartData} />
              <TechniqueActivityChart data={chartData} />
              <RateTrendChart
                data={chartData}
                dataKey="detectionRate"
                name="Detection Rate"
                title="Detection Rate Trends"
                color="var(--color-accent)"
                icon={Eye}
              />
              <RateTrendChart
                data={chartData}
                dataKey="preventionRate"
                name="Prevention Rate"
                title="Prevention Rate Trends"
                color="var(--color-accent)"
                icon={Shield}
              />
              <RateTrendChart
                data={chartData}
                dataKey="attributionRate"
                name="Attribution Rate"
                title="Attribution Rate Trends"
                color="var(--color-accent)"
                icon={Activity}
              />
              <TimeTrendChart
                data={chartData}
                dataKey="avgTimeToDetect"
                name="Avg Time to Detect"
                title="Time to Detect Trends"
                color="var(--color-accent)"
                icon={Clock}
              />
              <TimeTrendChart
                data={chartData}
                dataKey="avgTimeToAttribute"
                name="Avg Time to Attribute"
                title="Time to Attribute Trends"
                color="var(--color-accent)"
                icon={Clock}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
