import { LucideIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Badge } from './badge';
import { Button } from './button';

interface ListItemAction {
  icon: LucideIcon;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
}

interface ListItemProps {
  avatar?: {
    src?: string;
    fallback: string;
    className?: string;
  };
  icon?: {
    icon: LucideIcon;
    className?: string;
    color?: string;
  };
  title: string;
  subtitle?: string;
  description?: string;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
  };
  rightContent?: React.ReactNode;
  actions?: ListItemAction[];
  onClick?: () => void;
  className?: string;
}

export function ListItem({
  avatar,
  icon,
  title,
  subtitle,
  description,
  badge,
  rightContent,
  actions,
  onClick,
  className = ''
}: ListItemProps) {
  const IconComponent = icon?.icon;

  return (
    <div 
      className={`flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {avatar && (
          <Avatar className={`h-12 w-12 ${avatar.className || ''}`}>
            {avatar.src && <AvatarImage src={avatar.src} />}
            <AvatarFallback className="text-xs">
              {avatar.fallback}
            </AvatarFallback>
          </Avatar>
        )}
        
        {icon && IconComponent && (
          <div className={`p-3 rounded-full ${icon.color || 'bg-muted'} ${icon.className || ''}`}>
            <IconComponent className="h-6 w-6" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-medium truncate pr-2">{title}</h3>
            {rightContent && (
              <div className="flex-shrink-0">
                {rightContent}
              </div>
            )}
          </div>
          
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
          
          {description && (
            <p className="text-sm text-muted-foreground truncate mt-1">{description}</p>
          )}
          
          {badge && (
            <Badge 
              variant={badge.variant || 'secondary'} 
              className={`text-xs mt-1 ${badge.className || ''}`}
            >
              {badge.text}
            </Badge>
          )}
        </div>
      </div>
      
      {actions && actions.length > 0 && (
        <div className="flex gap-2 ml-3">
          {actions.map((action, index) => {
            const ActionIcon = action.icon;
            return (
              <Button
                key={index}
                size="sm"
                variant={action.variant || 'outline'}
                onClick={action.onClick}
                title={action.label}
              >
                <ActionIcon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}