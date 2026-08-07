import { AppShell } from "@/components/app-shell";
import { TenantUsersClient } from "@/components/tenant-users-client";

export default function UsuariosPage() {
  return (
    <AppShell>
      <TenantUsersClient />
    </AppShell>
  );
}
