import { AdminShell } from "@/components/layout/admin-shell";
import { getCurrentAdmin } from "@/features/auth/queries";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();

  return <AdminShell admin={admin}>{children}</AdminShell>;
}
