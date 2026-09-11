import React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import Pagination from "@/components/tables/Pagination";
import EmptyState from "@/components/ui/states/EmptyState";
import LoadingState from "@/components/ui/states/LoadingState";
import ErrorState from "@/components/ui/states/ErrorState";

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  field?: keyof T;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  error = null,
  emptyTitle,
  emptyDescription,
  onRetry,
  onRowClick,
  currentPage,
  totalPages,
  onPageChange,
  className,
}: DataTableProps<T>) {
  const showPagination =
    !loading &&
    !error &&
    data.length > 0 &&
    currentPage !== undefined &&
    totalPages !== undefined &&
    onPageChange;

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-100 text-left dark:border-gray-800">
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  isHeader
                  className={`whitespace-nowrap px-3 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 ${
                    column.align === "right" ? "text-right" : "text-left"
                  } ${column.className ?? ""}`}
                >
                  {column.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="p-0"
                >
                  <LoadingState />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  <ErrorState
                    title="Error al cargar"
                    description={error}
                    onRetry={onRetry}
                  />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyState
                    title={emptyTitle ?? "Sin datos"}
                    description={emptyDescription}
                  />
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03] ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={`whitespace-nowrap px-3 py-2.5 text-[13px] text-gray-600 dark:text-gray-400 ${
                        column.align === "right" ? "text-right" : "text-left"
                      } ${column.className ?? ""}`}
                    >
                      {column.render
                        ? column.render(row)
                        : column.field !== undefined
                          ? String(row[column.field])
                          : null}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {showPagination && (
        <div className="mt-3 flex justify-end px-3">
          <Pagination
            currentPage={currentPage!}
            totalPages={totalPages!}
            onPageChange={onPageChange!}
          />
        </div>
      )}
    </div>
  );
}

export default DataTable;