import { auth } from "@/auth";
import { AdminLineHealthClient } from "@/components/admin/admin-line-health-client";
import { redirect } from "next/navigation";

export default async function AdminLineHealthPage() {
    const session = await auth();
    const role = session?.user?.role;

    if (!session?.user || role !== "ADMIN") {
        redirect("/dashboard");
    }

    return <AdminLineHealthClient />;
}
