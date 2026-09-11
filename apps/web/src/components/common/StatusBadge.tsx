import React from "react";
import Badge, { type BadgeColor } from "@/components/ui/badge/Badge";

const DEFAULT_STATUS_COLORS: Record<string, BadgeColor> = {
  activo: "success",
  inactivo: "light",
  retirado: "error",
  pendiente: "warning",
  completado: "success",
  cancelado: "error",
};

interface StatusBadgeProps {
  value: string;
  colors?: Record<string, BadgeColor>;
  labels?: Record<string, string>;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  value,
  colors = DEFAULT_STATUS_COLORS,
  labels,
}) => {
  const normalized = value.trim().toLowerCase();
  const color = colors[normalized] ?? "light";
  const label = labels?.[normalized] ?? value;
  return <Badge color={color}>{label}</Badge>;
};

export default StatusBadge;