import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('relative h-2.5 w-full overflow-hidden rounded-full bg-primary/15', className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
        style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
      />
    </div>
  ),
);
Progress.displayName = 'Progress';

export { Progress };
