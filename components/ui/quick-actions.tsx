import { LucideIcon } from "lucide-react";

interface QuickAction {
  id: string;
  icon: LucideIcon;
  label: string;
  color: string;
  onClick: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
  columns?: number;
  className?: string;
}

export function QuickActions({
  actions,
  columns = 4,
  className = "",
}: QuickActionsProps) {
  return (
    <div
      className={`grid gap-4 ${className}`}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={action.onClick}
            className="flex flex-col items-center space-y-2 p-4 rounded-xl hover:bg-muted transition-colors"
          >
            <div className={`${action.color} p-3 rounded-full text-white`}>
              <Icon className="h-6 w-6" />
            </div>
            <span className="text-sm">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}
