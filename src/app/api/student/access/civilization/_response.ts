import { NextResponse } from "next/server";
import { createAppError } from "@/lib/api-error";
import type { ExecuteCivilizationCommandResult } from "@/lib/services/civilization-idle/civilization-state";

export function civilizationCommandResultResponse(result: ExecuteCivilizationCommandResult) {
  if (!result.ok) {
    if (result.reason === "revision_conflict") {
      return NextResponse.json(
        {
          ...createAppError(
            "CIVILIZATION_REVISION_CONFLICT",
            "Civilization state revision is stale"
          ),
          currentRevision: result.currentRevision,
        },
        { status: 409 }
      );
    }
    if (result.reason === "command_conflict") {
      return NextResponse.json(
        createAppError(
          "CIVILIZATION_COMMAND_CONFLICT",
          "Command id was already used with different input"
        ),
        { status: 409 }
      );
    }
    return NextResponse.json(
      createAppError("INTERNAL_ERROR", "Civilization state is invalid"),
      { status: 500 }
    );
  }

  if (!result.value.accepted) {
    return NextResponse.json(
      {
        ...createAppError(
          "CIVILIZATION_COMMAND_REJECTED",
          result.value.commandError ?? "Civilization command rejected"
        ),
        commandError: result.value.commandError,
        revision: result.value.revision,
        state: result.value.state,
        events: result.value.events,
        replayed: result.value.replayed,
      },
      { status: 422 }
    );
  }

  return NextResponse.json({ ok: true, ...result.value });
}
