"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ACCENT = "#e5400b";
const GRID = "#262626";
const AXIS = "#a1a1a1";

const PIE_COLORS = [
  "#a1a1a1",
  "#eab308",
  "#e5400b",
  "#f97316",
  "#38bdf8",
  "#22c55e",
  "#16a34a",
];

const tooltipStyle = {
  backgroundColor: "#161616",
  border: "1px solid #262626",
  borderRadius: 8,
  fontSize: 12,
};

export function OrdersPerWeekChart({
  data,
}: {
  data: { week: string; orders: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Orders per week</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="week" stroke={AXIS} fontSize={12} tickLine={false} />
            <YAxis stroke={AXIS} fontSize={12} allowDecimals={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#ffffff10" }} />
            <Bar dataKey="orders" fill={ACCENT} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function RevenueChart({
  data,
}: {
  data: { month: string; revenue: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue over time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="month" stroke={AXIS} fontSize={12} tickLine={false} />
            <YAxis stroke={AXIS} fontSize={12} tickLine={false} width={48} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke={ACCENT}
              strokeWidth={2}
              dot={{ r: 3, fill: ACCENT }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function StatusBreakdownChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const hasData = data.some((d) => d.value > 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Order status breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data.filter((d) => d.value > 0)}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(entry) => `${entry.name}: ${entry.value}`}
                labelLine={false}
                fontSize={11}
              >
                {data
                  .filter((d) => d.value > 0)
                  .map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No orders yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
