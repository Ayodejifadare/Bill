import { ArrowLeft, Bell } from 'lucide-react';
import { Button } from './button';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  showAvatar?: boolean;
  avatarSrc?: string;
  avatarFallback?: string;
  showNotifications?: boolean;
  notificationCount?: number;
  rightAction?: React.ReactNode;
  onBack?: () => void;
  onNotifications?: () => void;
  className?: string;
}

export function ScreenHeader({
  title,
  subtitle,
  showBackButton = false,
  showAvatar = false,
  avatarSrc,
  avatarFallback = 'U',
  showNotifications = false,
  notificationCount = 0,
  rightAction,
  onBack,
  onNotifications,
  className = ''
}: ScreenHeaderProps) {
  return (
    <div className={`sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border ${className}`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {showBackButton && onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          
          {showAvatar && (
            <Avatar className="h-10 w-10">
              {avatarSrc && (
                <AvatarImage src={avatarSrc} loading="eager" fetchPriority="high" decoding="async" />
              )}
              <AvatarFallback className="bg-primary text-primary-foreground">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
          )}
          
          {(title || subtitle) && (
            <div>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
              {title && <h1 className="font-medium">{title}</h1>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showNotifications && onNotifications && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onNotifications}
              className="relative"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </Button>
          )}
          
          {rightAction}
        </div>
      </div>
    </div>
  );
}
