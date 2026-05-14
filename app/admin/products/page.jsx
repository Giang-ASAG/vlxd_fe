import { ProductTable } from "@/src/admin/products/product";
export default function ProductsPage() {
  return (<div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Quản lý sản phẩm</h1>
      <p className="text-muted-foreground">Quản lý danh sách sản phẩm và tồn kho</p>
    </div>

    <ProductTable />
  </div>);
}
