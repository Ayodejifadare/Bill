import { Badge } from './badge';
import { LucideIcon } from 'lucide-react';

interface StatusConfig {
  color: string;
  icon?: LucideIcon;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

interface StatusBadgeProps {
  status: string;
  statusConfigs: Record<string, StatusConfig>;
  className?: string;
}

export function StatusBadge({ status, statusConfigs, className = '' }: StatusBadgeProps) {
  const config = statusConfigs[status] || statusConfigs.default;
  
  if (!config) {
    return (
      <Badge variant="secondary" className={className}>
        {status}
      </Badge>
    );
  }
  
  const Icon = config.icon;
  
  return (
    <Badge
      variant={config.variant || 'secondary'}
      className={`${config.color} flex items-center gap-1 ${className}`}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {status}
    </Badge>
  );
}