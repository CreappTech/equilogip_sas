import React from "react";
import Button from "@/components/ui/button/Button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Ocurrió un error",
  description = "No se pudieron cargar los datos. Intenta de nuevo.",
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-50 text-error-500 dark:bg-error-500/15">
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m0 0a.75.75 0 100 1.5.75.75 0 000-1.5zM3.75 12a8.25 8.25 0 1016.5 0 8.25 8.25 0 00-16.5 0z"
          />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-gray-800 dark:text-white/90">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      )}
    </div>
  );
};

export default ErrorState;