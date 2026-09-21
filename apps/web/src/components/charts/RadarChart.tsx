"use client";

import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface RadarChartProps {
  categories: string[];
  series: { name: string; data: number[] }[];
  height?: number;
}

/** Gráfico radar reutilizable (%-45%/40-ish) para el dashboard de mantenimiento. */
export default function RadarChart({
  categories,
  series,
  height = 340,
}: RadarChartProps) {
  const options = {
    chart: {
      type: "radar" as const,
      toolbar: { show: false },
      fontFamily: "inherit",
      animations: { enabled: false },
    },
    colors: series.map((_, i) =>
      i % 2 === 0 ? "#465FFF" : "#22C55E"
    ),
    labels: categories,
    stroke: { width: 2 },
    fill: { opacity: 0.2 },
    markers: { size: 4 },
    dataLabels: {
      enabled: true,
      formatter: (value: number) => `${Math.round(value)}%`,
      style: { fontSize: "11px", colors: ["#64748b"] },
    },
    plotOptions: {
      radar: {
        size: 100,
        polygons: {
          strokeColors: "#e2e8f0",
          connectorColors: "#e2e8f0",
          strokeWidth: 1,
        },
      },
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 5,
      labels: { formatter: (value: number) => `${Math.round(value)}%` },
    },
    legend: {
      show: series.length > 1,
      position: "bottom" as const,
      labels: { colors: "#94a3b8" },
    },
    grid: { padding: { top: 10, bottom: 10 } },
  };

  return (
    <div className="w-full">
      <ReactApexChart
        options={options}
        series={series}
        type="radar"
        height={height}
      />
    </div>
  );
}