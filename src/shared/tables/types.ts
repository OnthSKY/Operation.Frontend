import type { ReactNode } from "react";
import type { TableShowFrom } from "@/shared/tables/column-visibility";

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  /** Decorative icon before header label */
  headerIcon?: ReactNode;
  /** `title` on `<th>` */
  headerTitle?: string;
  cell: (row: T) => ReactNode;
  thClassName?: string;
  tdClassName?: string;
  showFrom?: TableShowFrom;
  /** When the row has `onRowClick`, clicks on this cell do not trigger the row handler */
  isolateRowClick?: boolean;
};
