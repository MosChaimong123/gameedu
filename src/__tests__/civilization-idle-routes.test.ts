import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialCivilizationState } from "@/lib/civilization-idle";

const mockGetStudentAccessSession = vi.fn();
const mockReadCivilizationState = vi.fn();
const mockExecuteCivilizationCommand = vi.fn();

vi.mock("@/lib/auth/student-access-session", () => ({
  getStudentAccessSession: mockGetStudentAccessSession,
}));

vi.mock("@/lib/services/civilization-idle/civilization-state", () => ({
  readCivilizationState: mockReadCivilizationState,
  executeCivilizationCommand: mockExecuteCivilizationCommand,
}));

function request(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Civilization Idle student access routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CIVILIZATION_IDLE_ENABLED = "true";
    delete process.env.CIVILIZATION_IDLE_PILOT_CLASSROOM_IDS;
    mockGetStudentAccessSession.mockResolvedValue({ classId: "class-1", student: { id: "student-1" } });
  });

  it("hides the API from classrooms outside the pilot allowlist", async () => {
    process.env.CIVILIZATION_IDLE_PILOT_CLASSROOM_IDS = "class-2,class-3";
    const { GET } = await import("@/app/api/student/access/civilization/state/route");

    const response = await GET();

    expect(response.status).toBe(404);
    expect(mockReadCivilizationState).not.toHaveBeenCalled();
  });

  it("can disable and re-enable access without replacing the stored state", async () => {
    const state = createInitialCivilizationState(1_000);
    state.resources.wood.amount = 42;
    mockReadCivilizationState.mockResolvedValue({
      ok: true,
      value: { initialized: true, revision: 7, state, serverNow: new Date(1_000).toISOString() },
    });
    const { GET } = await import("@/app/api/student/access/civilization/state/route");

    process.env.CIVILIZATION_IDLE_ENABLED = "false";
    expect((await GET()).status).toBe(404);
    expect(mockReadCivilizationState).not.toHaveBeenCalled();

    process.env.CIVILIZATION_IDLE_ENABLED = "true";
    const enabled = await GET();
    expect(enabled.status).toBe(200);
    expect(await enabled.json()).toMatchObject({ revision: 7, state: { resources: { wood: { amount: 42 } } } });
    expect(mockReadCivilizationState).toHaveBeenCalledTimes(1);
  });

  it("hides the API while the feature flag is disabled", async () => {
    process.env.CIVILIZATION_IDLE_ENABLED = "false";
    const { GET } = await import("@/app/api/student/access/civilization/state/route");

    const response = await GET();

    expect(response.status).toBe(404);
    expect(mockGetStudentAccessSession).not.toHaveBeenCalled();
  });

  it("requires a student access session", async () => {
    mockGetStudentAccessSession.mockResolvedValue(null);
    const { GET } = await import("@/app/api/student/access/civilization/state/route");

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mockGetStudentAccessSession).toHaveBeenCalledWith("student:read");
    expect(mockReadCivilizationState).not.toHaveBeenCalled();
  });

  it("reads only the student bound to the access session", async () => {
    const state = createInitialCivilizationState(1_000);
    mockReadCivilizationState.mockResolvedValue({
      ok: true,
      value: { initialized: false, revision: 0, state, serverNow: new Date(1_000).toISOString() },
    });
    const { GET } = await import("@/app/api/student/access/civilization/state/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, initialized: false, revision: 0 });
    expect(mockReadCivilizationState).toHaveBeenCalledWith("student-1");
  });

  it("rejects malformed commands before calling the service", async () => {
    const { POST } = await import("@/app/api/student/access/civilization/command/route");

    const response = await POST(
      request("/api/student/access/civilization/command", {
        commandId: "short",
        expectedRevision: -1,
        command: { type: "SYNC", injected: true },
      })
    );

    expect(response.status).toBe(400);
    expect(mockGetStudentAccessSession).toHaveBeenCalledWith("student:write");
    expect(mockExecuteCivilizationCommand).not.toHaveBeenCalled();
  });

  it("binds a valid command to the session student", async () => {
    const state = createInitialCivilizationState(1_000);
    mockExecuteCivilizationCommand.mockResolvedValue({
      ok: true,
      value: { accepted: true, revision: 1, state, events: [], replayed: false },
    });
    const { POST } = await import("@/app/api/student/access/civilization/command/route");

    const response = await POST(
      request("/api/student/access/civilization/command", {
        commandId: "command-route-1",
        expectedRevision: 0,
        command: { type: "SYNC" },
      })
    );

    expect(response.status).toBe(200);
    expect(mockExecuteCivilizationCommand).toHaveBeenCalledWith({
      studentId: "student-1",
      commandId: "command-route-1",
      expectedRevision: 0,
      command: { type: "SYNC" },
    });
  });

  it("maps revision conflicts and command rejections to stable API responses", async () => {
    const { POST } = await import("@/app/api/student/access/civilization/sync/route");
    mockExecuteCivilizationCommand.mockResolvedValueOnce({
      ok: false,
      reason: "revision_conflict",
      currentRevision: 4,
    });

    const conflict = await POST(
      request("/api/student/access/civilization/sync", {
        commandId: "sync-route-001",
        expectedRevision: 3,
      })
    );
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({
      error: { code: "CIVILIZATION_REVISION_CONFLICT" },
      currentRevision: 4,
    });

    const state = createInitialCivilizationState(1_000);
    mockExecuteCivilizationCommand.mockResolvedValueOnce({
      ok: true,
      value: {
        accepted: false,
        commandError: "CONTENT_LOCKED",
        revision: 5,
        state,
        events: [],
        replayed: false,
      },
    });
    const rejected = await POST(
      request("/api/student/access/civilization/sync", {
        commandId: "sync-route-002",
        expectedRevision: 4,
      })
    );
    expect(rejected.status).toBe(422);
    expect(await rejected.json()).toMatchObject({
      error: { code: "CIVILIZATION_COMMAND_REJECTED" },
      commandError: "CONTENT_LOCKED",
      revision: 5,
    });
  });
});
