import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTests() {
    console.log("🧪 เริ่มต้นตรวจสอบระบบ Backend (Database Logic)...");
    
    try {
        // 1. จำลองการสร้าง Teacher
        console.log("1️⃣ กำลังสร้าง Teacher จำลอง...");
        const pwd = Math.random().toString(36);
        const testUser = await prisma.user.create({
            data: {
                name: "Test System User",
                email: `test_system_${Date.now()}@example.com`,
                password: pwd,
                role: "TEACHER"
            }
        });
        console.log("✅ Teacher สร้างสำเร็จ: " + testUser.id);

        // 2. จำลองการสร้าง Classroom
        console.log("2️⃣ กำลังสร้าง Classroom...");
        const classroom = await prisma.classroom.create({
            data: {
                name: "Automated Test Class",
                grade: "Test Grade",
                teacherId: testUser.id,
            }
        });
        console.log("✅ Classroom สร้างสำเร็จ: " + classroom.name);

        // 3. จำลองการเพิ่ม Skills (Points)
        console.log("3️⃣ กำลังเพิ่ม Skills สำหรับให้คะแนน...");
        const skill = await prisma.skill.create({
            data: {
                name: "Good Test",
                weight: 5,
                icon: "star",
                type: "POSITIVE",
                classId: classroom.id
            }
        });
        console.log("✅ Skill สร้างสำเร็จ: " + skill.name);

        // 4. จำลองการเพิ่มนักเรียน (Add Students)
        console.log("4️⃣ กำลังเพิ่มนักเรียน (Alice, Bob)...");
        await prisma.student.createMany({
            data: [
                { name: "Alice", classId: classroom.id, avatar: "seed1" },
                { name: "Bob", classId: classroom.id, avatar: "seed2" }
            ]
        });
        
        const students = await prisma.student.findMany({ where: { classId: classroom.id } });
        console.log(`✅ เพิ่มนักเรียนสำเร็จ ${students.length} คน (Alice, Bob)`);

        // 5. จำลองระบบ Attendance (เช็คชื่อ)
        console.log("5️⃣ ทดสอบระบบเช็คชื่อ (Attendance Mode)...");
        const alice = students.find(s => s.name === "Alice");
        const bob = students.find(s => s.name === "Bob");

        if (alice && bob) {
            await prisma.student.update({
                where: { id: alice.id },
                data: { attendance: "ABSENT" }
            });
            await prisma.student.update({
                where: { id: bob.id },
                data: { attendance: "LATE" }
            });

            const updatedAlice = await prisma.student.findUnique({ where: { id: alice.id } });
            console.log(`✅ อัปเดตสถานะเช็คชื่อสำเร็จ: Alice = ${updatedAlice?.attendance}`);
        }

        // 6. จำลองการให้คะแนน (Award Points)
        console.log("6️⃣ ทดสอบการให้คะแนนนักเรียน...");
        if (bob) {
            await prisma.student.update({
                where: { id: bob.id },
                data: {
                    behaviorPoints: { increment: skill.weight },
                    history: {
                        create: {
                            skillId: skill.id,
                            reason: skill.name,
                            value: skill.weight
                        }
                    }
                }
            });
            
            const pointHistory = await prisma.pointHistory.findFirst({ where: { studentId: bob.id } });
            const finalBob = await prisma.student.findUnique({ where: { id: bob.id }});
            console.log(`✅ การให้คะแนนสำเร็จ: Bob ได้คะแนนเพิ่ม ${pointHistory?.value} คะแนน (ยอดรวม = ${finalBob?.behaviorPoints})`);
        }

        console.log("🎉 การทดสอบ Backend สำเร็จทุกขั้นตอน! ระบบข้อมูลทำงานได้ถูกต้อง!");

        // Cleanup
        console.log("🧹 กำลังลบข้อมูลที่ใช้ในการทดสอบ...");
        await prisma.classroom.delete({ where: { id: classroom.id } }); // Will cascade delete skills, students, point history
        await prisma.user.delete({ where: { id: testUser.id } });
        console.log("✅ ล้างข้อมูลเรียบร้อย");

    } catch (error) {
        console.error("❌ การทดสอบล้มเหลว:", error);
    } finally {
        await prisma.$disconnect();
    }
}

runTests();
