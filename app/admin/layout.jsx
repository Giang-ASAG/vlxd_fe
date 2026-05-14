import { AdminSidebar } from "@/src/admin/sidebar";
import { AdminHeader } from "@/src/admin/header";
export default function AdminLayout({ children, }) {
  return (<div className="flex h-screen overflow-hidden">
    <AdminSidebar />
    <div className="flex flex-1 flex-col overflow-hidden">
      <AdminHeader />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  </div>);
}
