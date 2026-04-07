import { getStudentLoginCodeVariants } from "@/lib/student-login-code";

/** Classroom real-time events (Socket.io `classroom-update`). */
export type ClassroomSocketEventType = "BOARD_UPDATE" | "POINT_UPDATE";

type QuestionSetAccessDb = {
  user: {
    findUnique: (args: {
      where: { id: string };
      select: { role: true };
    }) => Promise<{ role: string } | null>;
  };
  questionSet: {
    findUnique: (args: {
      where: { id: string };
      select: { creatorId: true };
    }) => Promise<{ creatorId: string } | null>;
  };
};

type ClassroomAccessDb = {
  classroom: {
    findUnique: (args: {
      where: { id: string };
      select: {
        teacherId: true;
        students: {
          where: { userId: string };
          select: { id: true };
          take: 1;
        };
      };
    }) => Promise<{ teacherId: string; students: Array<{ id: string }> } | null>;
  };
};

type StudentLoginCodeDb = {
  student: {
    findFirst: (args: {
      where: { OR: Array<{ loginCode: string }> };
      select: { classId: true };
    }) => Promise<{ classId: string } | null>;
  };
};

/** Admin or owner of the question set may host a live game with that set. */
export async function canHostQuestionSetForUser(
  prisma: QuestionSetAccessDb,
  userId: string,
  setId: string
): Promise<boolean> {
  const [user, questionSet] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    }),
    prisma.questionSet.findUnique({
      where: { id: setId },
      select: { creatorId: true },
    }),
  ]);

  if (!user || !questionSet) {
    return false;
  }

  return user.role === "ADMIN" || questionSet.creatorId === userId;
}

/**
 * Teacher of the class, or a student row linked to this user (`Student.userId`), may access classroom-scoped data over Socket/API.
 */
export async function canUserAccessClassroom(
  prisma: ClassroomAccessDb,
  userId: string,
  classId: string
): Promise<boolean> {
  const classroom = await prisma.classroom.findUnique({
    where: { id: classId },
    select: {
      teacherId: true,
      students: {
        where: { userId },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!classroom) {
    return false;
  }

  return classroom.teacherId === userId || classroom.students.length > 0;
}

/**
 * Who may emit a classroom socket event: teachers always for POINT_UPDATE; BOARD_UPDATE also allowed for linked students.
 */
export async function canUserPublishClassroomSocketEvent(
  prisma: ClassroomAccessDb,
  userId: string,
  classId: string,
  eventType: ClassroomSocketEventType
): Promise<boolean> {
  const classroom = await prisma.classroom.findUnique({
    where: { id: classId },
    select: {
      teacherId: true,
      students: {
        where: { userId },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!classroom) {
    return false;
  }

  if (eventType === "POINT_UPDATE") {
    return classroom.teacherId === userId;
  }

  return classroom.teacherId === userId || classroom.students.length > 0;
}

/** Student portal: login code must belong to the requested classroom. */
export async function canLoginCodeAccessClassroom(
  prisma: StudentLoginCodeDb,
  normalizedLoginCode: string,
  classId: string
): Promise<boolean> {
  const student = await prisma.student.findFirst({
    where: {
      OR: getStudentLoginCodeVariants(normalizedLoginCode).map((candidate) => ({ loginCode: candidate })),
    },
    select: { classId: true },
  });
  return student?.classId === classId;
}
