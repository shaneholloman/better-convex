import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../lib/cn';

export function Compare({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('my-4 grid items-start gap-4 lg:grid-cols-2', className)}
      {...props}
    />
  );
}

export function CompareItem({
  title,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border bg-fd-secondary',
        className
      )}
      {...props}
    >
      <div className="not-prose flex items-center gap-2 overflow-x-auto px-4 py-2">
        <span className="font-medium text-fd-secondary-foreground text-sm">
          {title}
        </span>
      </div>
      <div className="prose-no-margin rounded-xl bg-fd-background p-4 text-[0.9375rem] outline-none [&>figure:only-child]:-m-4 [&>figure:only-child]:border-none">
        {children}
      </div>
    </div>
  );
}
