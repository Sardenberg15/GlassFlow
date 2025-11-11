import React from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode; // actions (right side)
  className?: string;
};

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <div className={"flex items-center justify-between gap-3 " + (className || "")}>
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" data-testid="text-page-title">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">{children}</div>
      )}
    </div>
  );
}

export default PageHeader;