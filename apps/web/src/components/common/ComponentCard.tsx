import React from "react";

interface ComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  desc?: string;
  headerRight?: React.ReactNode;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
  headerRight,
}) => {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h3 className="text-sm font-medium text-gray-800 dark:text-white/90">{title}</h3>
          {desc && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{desc}</p>}
        </div>
        {headerRight}
      </div>
      <div className="p-3 border-t border-gray-100 dark:border-gray-800 sm:p-5">
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
};

export default ComponentCard;
