import {
  applySimulationAction,
  createInitialState,
  type SimulationAction,
  type SimulationState,
} from "@/lib/filesystem";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(createInitialState());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      state?: SimulationState;
      action?: SimulationAction;
    };

    if (!body.action) {
      return Response.json({ error: "Simulation action is required." }, { status: 400 });
    }

    const nextState = applySimulationAction(body.state ?? createInitialState(), body.action);
    return Response.json(nextState);
  } catch {
    return Response.json({ error: "Invalid simulation request." }, { status: 400 });
  }
}
