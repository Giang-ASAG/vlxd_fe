"use client";
import { HandCoins, ReceiptText, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePagination } from "@/src/hooks/use-pagination";
import { PaginationWrapper } from "@/src/admin/pagination-wrapper";
import { PageSizeSelect } from "@/src/admin/page-size-select";

const expenses = [
  { id: "CP-001", category: "Vận chuyển", note: "Phí giao hàng công trình", amount: 4200000, date: "09/04/2026" },
  { id: "CP-002", category: "Kho bãi", note: "Thuê kho tháng 4", amount: 12000000, date: "05/04/2026" },
  { id: "CP-003", category: "Nhân sự", note: "Lương bộ phận kho", amount: 28500000, date: "01/04/2026" },
  { id: "CP-004", category: "Vận hành", note: "Điện nước và bảo trì", amount: 6900000, date: "31/03/2026" },
];

const formatCurrency = (value) => `${value.toLocaleString("vi-VN")}d`;

export default function ExpensesPage() {
  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
  const avgExpense = totalExpense / expenses.length;

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
  } = usePagination(expenses, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Thông tin chi phí</h1>
        <p className="text-muted-foreground">Theo dõi chi phí vận hành theo từng nhóm</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <HandCoins className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng chi phí</p>
                <p className="text-2xl font-bold">{formatCurrency(totalExpense)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <ReceiptText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Số phiếu chi</p>
                <p className="text-2xl font-bold">{expenses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trung bình phiếu</p>
                <p className="text-2xl font-bold">{formatCurrency(Math.round(avgExpense))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã phiếu</TableHead>
              <TableHead>Nhóm chi phí</TableHead>
              <TableHead>Nội dung</TableHead>
              <TableHead className="text-right">Số tiền</TableHead>
              <TableHead>Ngày</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.id}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.note}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                <TableCell>{item.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Hiển thị</span>
          <PageSizeSelect pageSize={pageSize} onChange={setPageSize} />
          <span>/ {totalItems} phiếu chi</span>
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
