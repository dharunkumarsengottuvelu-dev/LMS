"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export function EnrollmentTrendChart({
  trendData,
}: {
  trendData: { day: string; enrollments: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorEnrollments" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
        <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            fontSize: "12px",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
          }}
        />
        <Area
          type="monotone"
          dataKey="enrollments"
          stroke="#2563EB"
          strokeWidth={2}
          fill="url(#colorEnrollments)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ResourceDistributionChart({
  data,
  colors,
}: {
  data: { name: string; value: number }[];
  colors: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={index} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SevenDayActivityChart({
  data,
  selectedMetric,
}: {
  data: any[];
  selectedMetric: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 12, fill: "#6B7280" }}
          tickLine={false}
          axisLine={{ stroke: "#E5E7EB" }}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 12, fill: "#6B7280" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            fontSize: "12px",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
          }}
          formatter={(val: any) => [
            val,
            selectedMetric === "activeStudents"
              ? "Active Students"
              : selectedMetric === "codingSubmissions"
              ? "Coding Submissions"
              : selectedMetric === "testAttempts"
              ? "Test Attempts"
              : "Lessons Completed",
          ]}
          labelFormatter={(label, payload) => {
            const item = payload?.[0]?.payload;
            return item?.date ? `${label} (${item.date})` : label;
          }}
        />
        <Area
          type="monotone"
          dataKey={selectedMetric}
          stroke="#2563EB"
          strokeWidth={2.5}
          fill="url(#colorActivity)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ProgressTrendChart({
  data,
}: {
  data: any[];
}) {
  return (
    <ResponsiveContainer width="100%" height={170}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
        <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(val: any) => [`${val}%`, "Avg Progress"]}
        />
        <Area type="monotone" dataKey="avgProgress" stroke="#10B981" strokeWidth={2} fill="url(#colorProgress)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

