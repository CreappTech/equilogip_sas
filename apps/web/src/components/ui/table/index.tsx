import React, { ReactNode } from "react";

interface TableProps {
  children: ReactNode;
  className?: string;
}

interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

interface TableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

interface TableCellProps {
  children?: ReactNode;
  isHeader?: boolean;
  className?: string;
  colSpan?: number;
}

export const Table: React.FC<TableProps> = ({ children, className }) => {
  return <table className={`min-w-full ${className}`}>{children}</table>;
};

export const TableHeader: React.FC<TableHeaderProps> = ({
  children,
  className,
}) => {
  return <thead className={className}>{children}</thead>;
};

export const TableBody: React.FC<TableBodyProps> = ({
  children,
  className,
}) => {
  return <tbody className={className}>{children}</tbody>;
};

export const TableRow: React.FC<TableRowProps> = ({
  children,
  className,
  onClick,
}) => {
  return (
    <tr className={className} onClick={onClick}>
      {children}
    </tr>
  );
};

export const TableCell: React.FC<TableCellProps> = ({
  children,
  isHeader = false,
  className,
  colSpan,
}) => {
  const CellTag = isHeader ? "th" : "td";
  return (
    <CellTag className={className} colSpan={colSpan}>
      {children}
    </CellTag>
  );
};
