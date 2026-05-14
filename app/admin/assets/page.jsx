"use client";
import { Landmark, Wrench, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePagination } from "@/src/hooks/use-pagination";
import { PaginationWrapper } from "@/src/admin/pagination-wrapper";
import { PageSizeSelect } from "@/src/admin/page-size-select";

const assets = [
  { code: "TS-001", name: "Xe tải 3.5 tấn", type: "Phương tiện", value: 520000000, status: "Đang sử dụng", maintenanceDate: "20/04/2026" },
  { code: "TS-002", name: "Xe nâng kho", type: "Thiết bị kho", value: 185000000, status: "Đang sử dụng", maintenanceDate: "12/05/2026" },
  { code: "TS-003", name: "Cân điện tử 5 tấn", type: "Thiết bị đo lường", value: 78000000, status: "Bảo trì", maintenanceDate: "15/04/2026" },
];

const formatCurrency = (value) => `${value.toLocaleString("vi-VN")}d`;

export default function AssetsPage() {
  const totalValue = assets.reduce((sum, item) => sum + item.value, 0);
  const inMaintenance = assets.filter((item) => item.status === "Bảo trì").length;
  const activeAssets = assets.length - inMaintenance;

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
  } = usePagination(assets, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Thông tin tài sản</h1>
        <p className="text-muted-foreground">Quản lý tài sản cố định và lịch bảo trì</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Landmark className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng giá trị tài sản</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Wrench className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đang bảo trì</p>
                <p className="text-2xl font-bold">{inMaintenance}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                <p className="text-2xl font-bold">{activeAssets}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã tài sản</TableHead>
              <TableHead>Tên tài sản</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead className="text-right">Giá trị</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Bảo trì tiếp theo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((item) => (
              <TableRow key={item.code}>
                <TableCell className="font-medium">{item.code}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(item.value)}</TableCell>
                <TableCell>{item.status}</TableCell>
                <TableCell>{item.maintenanceDate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Hiển thị</span>
          <PageSizeSelect pageSize={pageSize} onChange={setPageSize} />
          <span>/ {totalItems} tài sản</span>
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
