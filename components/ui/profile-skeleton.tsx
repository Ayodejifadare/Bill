import { Card } from "./card";
import { Separator } from "./separator";
import { Skeleton } from "./skeleton";

export function ProfileSkeleton() {
  return (
    <div className="py-4 space-y-6">
      <Card className="p-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-[120px]" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-3 w-[200px]" />
            <Skeleton className="h-3 w-[150px]" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </Card>

      <Card className="p-6">
        <Skeleton className="h-5 w-[120px] mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <Skeleton className="h-6 w-[60px] mx-auto" />
              <Skeleton className="h-3 w-[80px] mx-auto" />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <Skeleton className="h-5 w-[120px] mb-4" />
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-[120px]" />
                    <Skeleton className="h-3 w-[180px]" />
                  </div>
                </div>
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
              {i < 3 && <Separator className="my-4" />}
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-6">
        {[4, 3, 3].map((count, sectionIndex) => (
          <Card key={sectionIndex} className="p-6">
            <Skeleton className="h-5 w-[120px] mb-4" />
            <div className="space-y-1">
              {Array.from({ length: count }).map((_, itemIndex) => (
                <div
                  key={itemIndex}
                  className="flex items-center justify-between p-3 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-4 w-[120px]" />
                  </div>
                  <Skeleton className="h-4 w-4" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
