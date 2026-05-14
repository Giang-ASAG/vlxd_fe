import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "@/app/admin/layout";
import DashboardPage from "@/app/admin/page";
import ProductsPage from "@/app/admin/products/page";
import CustomersPage from "@/app/admin/customers/page";
import InvoicesPage from "@/app/admin/invoices/page";
import SuppliersPage from "@/app/admin/suppliers/page";
import ReportsPage from "@/app/admin/reports/page";
import SettingsPage from "@/app/admin/settings/page";
import POSLayout from "@/app/pos/layout";
import POSPage from "@/app/pos/page";
import POSPrintPage from "@/app/pos/print/page";
import LoginPage from "@/app/login/page";
import { RequireAuth } from "@/src/auth/require-auth";
function App() {
    return (<Routes>
      <Route path="/" element={<Navigate to="/admin" replace/>}/>
      <Route path="/login" element={<LoginPage />}/>

      <Route path="/admin" element={<RequireAuth>
            <AdminLayout>
              <DashboardPage />
            </AdminLayout>
          </RequireAuth>}/>
      <Route path="/admin/products" element={<RequireAuth>
            <AdminLayout>
              <ProductsPage />
            </AdminLayout>
          </RequireAuth>}/>
      <Route path="/admin/customers" element={<RequireAuth>
            <AdminLayout>
              <CustomersPage />
            </AdminLayout>
          </RequireAuth>}/>
      <Route path="/admin/invoices" element={<RequireAuth>
            <AdminLayout>
              <InvoicesPage />
            </AdminLayout>
          </RequireAuth>}/>
      <Route path="/admin/suppliers" element={<RequireAuth>
            <AdminLayout>
              <SuppliersPage />
            </AdminLayout>
          </RequireAuth>}/>
      <Route path="/admin/reports" element={<RequireAuth>
            <AdminLayout>
              <ReportsPage />
            </AdminLayout>
          </RequireAuth>}/>
      <Route path="/admin/settings" element={<RequireAuth>
            <AdminLayout>
              <SettingsPage />
            </AdminLayout>
          </RequireAuth>}/>

      <Route path="/pos" element={<RequireAuth>
            <POSLayout>
              <POSPage />
            </POSLayout>
          </RequireAuth>}/>
      <Route path="/pos/print" element={<RequireAuth>
            <POSLayout>
              <POSPrintPage />
            </POSLayout>
          </RequireAuth>}/>

      <Route path="*" element={<Navigate to="/admin" replace/>}/>
    </Routes>);
}
export default App;
