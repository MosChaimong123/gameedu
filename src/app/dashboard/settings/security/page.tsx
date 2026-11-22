import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SecurityCenter } from "@/components/auth/security-center";

export default async function SecuritySettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <SecurityCenter />;
}
