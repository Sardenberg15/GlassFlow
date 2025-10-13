import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  iconColor?: string;
}

export function MetricCard({ title, value, icon: Icon, trend, iconColor = "bg-primary" }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`${iconColor} rounded-full p-2`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`metric-${title.toLowerCase().replace(/\s/g, '-')}`}>{value}</div>
        {trend && (
          <p className={`text-xs ${trend.isPositive ? 'text-chart-2' : 'text-chart-4'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}% vs. mês anterior
          </p>
        )}
      </CardContent>
    </Card>
  );
}
