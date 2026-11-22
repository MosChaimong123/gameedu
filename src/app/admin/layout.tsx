import { auth } from "@/auth";
import { PasswordUpgradeNotice } from "@/components/auth/password-upgrade-notice";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <>
      <PasswordUpgradeNotice required={session?.user?.passwordUpgradeRequired} />
      {children}
    </>
  );
}
