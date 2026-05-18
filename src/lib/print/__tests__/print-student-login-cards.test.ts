import { describe, expect, it } from "vitest";
import { buildStudentLoginCardsPrintDocument } from "@/lib/print/print-student-login-cards";

describe("buildStudentLoginCardsPrintDocument", () => {
    it("includes every student card and escapes HTML", () => {
        const html = buildStudentLoginCardsPrintDocument({
            students: [
                { name: "สมชาย", loginCode: "abc123" },
                { name: "<img onerror=alert(1)>", loginCode: "xyz" },
            ],
            labels: {
                documentTitle: "รหัสนักเรียน",
                accessCode: "รหัส",
                joinLine: "เข้าร่วม: /student",
            },
        });

        expect(html).toContain("สมชาย");
        expect(html).toContain("ABC123");
        expect(html).toContain("&lt;img onerror=alert(1)&gt;");
        expect(html).toContain('grid-template-columns: repeat(2');
        expect(html.match(/<article class="card">/g)?.length).toBe(2);
        expect(html).not.toContain("window.open");
        expect(html).not.toContain("window.close");
    });
});
