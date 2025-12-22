import { MetricCard } from '../metric-card';
import { Users } from 'lucide-react';

export default function MetricCardExample() {
  return (
    <MetricCard
      title="Total de Clientes"
      value="248"
      icon={Users}
      trend={{ value: 12, isPositive: true }}
      iconColor="bg-primary"
    />
  );
}
