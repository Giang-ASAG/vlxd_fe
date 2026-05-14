"use client";
import { Warehouse, AlertTriangle, PackageCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePagination } from "@/src/hooks/use-pagination";
import { PaginationWrapper } from "@/src/admin/pagination-wrapper";
import { PageSizeSelect } from "@/src/admin/page-size-select";

const inventoryItems = [
  { sku: "VLXD-001", name: "Thép Hòa Phát D10", stock: 1240, minStock: 800, unit: "kg", location: "Kho A" },
  { sku: "VLXD-002", name: "Xi măng PCB40", stock: 320, minStock: 500, unit: "bao", location: "Kho B" },
  { sku: "VLXD-003", name: "Gạch ống tuynel", stock: 14500, minStock: 10000, unit: "viên", location: "Kho C" },
  { sku: "VLXD-004", name: "Cát vàng xây tô", stock: 28, minStock: 20, unit: "m3", location: "Kho D" },
];

export default function InventoryPage() {
  const lowStockCount = inventoryItems.filter((item) => item.stock < item.minStock).length;
  const healthyStockCount = inventoryItems.length - lowStockCount;

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
  } = usePagination(inventoryItems, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Thông tin kho hàng</h1>
        <p className="text-muted-foreground">Theo dõi tồn kho và cảnh báo sắp hết hàng</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Warehouse className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng mặt hàng</p>
                <p className="text-2xl font-bold">{inventoryItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sắp hết hàng</p>
                <p className="text-2xl font-bold">{lowStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <PackageCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tồn kho ổn định</p>
                <p className="text-2xl font-bold">{healthyStockCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã hàng</TableHead>
              <TableHead>Tên hàng</TableHead>
              <TableHead className="text-right">Tồn kho</TableHead>
              <TableHead className="text-right">Mức tối thiểu</TableHead>
              <TableHead>Vị trí</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((item) => {
              const isLow = item.stock < item.minStock;
              return (
                <TableRow key={item.sku}>
                  <TableCell className="font-medium">{item.sku}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right">
                    {item.stock.toLocaleString("vi-VN")} {item.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.minStock.toLocaleString("vi-VN")} {item.unit}
                  </TableCell>
                  <TableCell>{item.location}</TableCell>
                  <TableCell>
                    <span className={isLow ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>
                      {isLow ? "Cần nhập thêm" : "Ổn định"}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Hiển thị</span>
          <PageSizeSelect pageSize={pageSize} onChange={setPageSize} />
          <span>/ {totalItems} mặt hàng</span>
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
