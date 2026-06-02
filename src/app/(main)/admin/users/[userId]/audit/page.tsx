import { UserAuditScreen } from "@/modules/admin/components/UserAuditScreen";

type Params = { userId: string };

/** Next.js 16: params bir Promise — server component'te await edilir. */
export default async function AdminUserAuditPage(props: { params: Promise<Params> }) {
  const { userId } = await props.params;
  const numericId = Number.parseInt(userId, 10);
  return (
    <UserAuditScreen
      userId={Number.isFinite(numericId) && numericId > 0 ? numericId : 0}
    />
  );
}
