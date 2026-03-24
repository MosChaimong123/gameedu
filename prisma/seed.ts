import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // 1. Cleanup
    await prisma.pointHistory.deleteMany();
    await prisma.student.deleteMany();
    await prisma.skill.deleteMany();
    await prisma.classroom.deleteMany();
    await prisma.user.deleteMany({ where: { email: 'teacher@test.com' } });

    // 2. Create Teacher
    const hashedPassword = await bcrypt.hash('password123', 10);
    const teacher = await prisma.user.create({
        data: {
            name: 'Test Teacher',
            email: 'teacher@test.com',
            password: hashedPassword,
            image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Teacher',
            role: 'TEACHER',
        },
    });

    console.log(`👤 Created teacher: ${teacher.email}`);

    // 3. Create Classroom
    const classroom = await prisma.classroom.create({
        data: {
            name: 'Demo Class 101',
            grade: '5th Grade',
            image: '🚀',
            teacherId: teacher.id,
        },
    });

    console.log(`🏫 Created classroom: ${classroom.name}`);

    // 4. Create Skills (Default Set)
    const skills = [
        { name: 'Helping others', weight: 1, icon: 'heart', type: 'POSITIVE' },
        { name: 'On task', weight: 1, icon: 'check', type: 'POSITIVE' },
        { name: 'Participating', weight: 1, icon: 'star', type: 'POSITIVE' },
        { name: 'Teamwork', weight: 1, icon: 'users', type: 'POSITIVE' },
        { name: 'Working hard', weight: 1, icon: 'hammer', type: 'POSITIVE' },
        { name: 'Forgot homework', weight: -1, icon: 'book', type: 'NEEDS_WORK' },
        { name: 'Talking out of turn', weight: -1, icon: 'volume-x', type: 'NEEDS_WORK' },
    ];

    for (const skill of skills) {
        await prisma.skill.create({
            data: { ...skill, classId: classroom.id },
        });
    }
    console.log(`✨ Added ${skills.length} skills`);

    // 5. Create Students
    const studentNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Evan', 'Fiona', 'George', 'Hannah'];

    for (const name of studentNames) {
        await prisma.student.create({
            data: {
                name,
                classId: classroom.id,
                avatar: Math.random().toString(36).substring(7), // Random seed
                points: Math.floor(Math.random() * 10), // Random starting points
            },
        });
    }

    console.log(`🎓 Added ${studentNames.length} students`);
    console.log('✅ Seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
