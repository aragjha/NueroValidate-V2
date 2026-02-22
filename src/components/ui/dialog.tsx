import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  fullscreen?: boolean;
}

export function Dialog({ open, onClose, title, description, children, className, fullscreen }: DialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative z-50 mt-8 flex flex-col rounded-2xl border bg-background shadow-2xl',
          fullscreen ? 'mx-4 h-[calc(100vh-4rem)] w-[calc(100vw-2rem)]' : 'w-full max-w-2xl',
          className,
        )}
      >
        <div className="flex items-start justify-between border-b px-7 py-5">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted cursor-pointer transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-7">{children}</div>
      </div>
    </div>
  );
}
