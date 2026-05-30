import { UserRolesScreen } from "@/modules/admin/components/UserRolesScreen";

type Params = { userId: string };

/** Next.js 16: params is a Promise — server component'te await edilir. */
export default async function AdminUserRolesPage(props: { params: Promise<Params> }) {
  const { userId } = await props.params;
  const numericId = Number.parseInt(userId, 10);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    // Invalid id → kullanıcı listesine yönlendirmek server'da yapılmalı; client-side guard
    // ekrana giren id'yi de doğrular (NaN olursa screen kendi yönlendirir).
    return <UserRolesScreen userId={0} />;
  }
  return <UserRolesScreen userId={numericId} />;
}
