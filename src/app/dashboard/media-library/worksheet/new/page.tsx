import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { WorksheetMediaCreatePage } from "@/components/dashboard/worksheet-media-create-page";
import { isTeacherOrAdmin } from "@/lib/role-guards";

export default async function NewWorksheetMediaPage() {
    const session = await auth();
    if (!session?.user?.id || !isTeacherOrAdmin(session.user.role)) {
        redirect("/dashboard");
    }

    return <WorksheetMediaCreatePage />;
}
