import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-[400px] flex-col border-l bg-background shadow-2xl transition-transform',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b px-6 py-5">
          <h3 className="text-sm font-bold tracking-tight">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted cursor-pointer transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </aside>
    </>
  );
}
