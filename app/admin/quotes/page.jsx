"use client";
import { FileBadge, CircleDollarSign, Clock3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePagination } from "@/src/hooks/use-pagination";
import { PaginationWrapper } from "@/src/admin/pagination-wrapper";
import { PageSizeSelect } from "@/src/admin/page-size-select";

const quotes = [
  { id: "BG-2026-001", customer: "Công ty Minh An", value: 125000000, status: "Chờ duyệt", expireDate: "15/04/2026" },
  { id: "BG-2026-002", customer: "Nhà thầu Hoàng Gia", value: 86000000, status: "Đã gửi", expireDate: "18/04/2026" },
  { id: "BG-2026-003", customer: "Công ty Đất Xanh", value: 243000000, status: "Đã chấp nhận", expireDate: "22/04/2026" },
];

const formatCurrency = (value) => `${value.toLocaleString("vi-VN")}d`;

export default function QuotesPage() {
  const totalValue = quotes.reduce((sum, quote) => sum + quote.value, 0);
  const waitingCount = quotes.filter((quote) => quote.status === "Chờ duyệt").length;

  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    pageSize,
    setPageSize,
    totalItems,
    rangeStart,
    rangeEnd,
  } = usePagination(quotes, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Thông tin báo giá</h1>
        <p className="text-muted-foreground">Tổng hợp danh sách báo giá đang xử lý</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileBadge className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Số báo giá</p>
                <p className="text-2xl font-bold">{quotes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <CircleDollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng giá trị</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock3 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đang chờ duyệt</p>
                <p className="text-2xl font-bold">{waitingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Số báo giá</TableHead>
              <TableHead>Khách hàng</TableHead>
              <TableHead className="text-right">Giá trị</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Hạn báo giá</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell className="font-medium">{quote.id}</TableCell>
                <TableCell>{quote.customer}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(quote.value)}</TableCell>
                <TableCell>{quote.status}</TableCell>
                <TableCell>{quote.expireDate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Hiển thị</span>
          <PageSizeSelect pageSize={pageSize} onChange={setPageSize} />
          <span>/ {totalItems} báo giá</span>
        </p>
        <PaginationWrapper
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
        />
      </div>
    </div>
  );
}
