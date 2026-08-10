import { NextResponse } from "next/server";
import { jobeService } from "@/services/jobe/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const runSpec = body.run_spec;

    if (!runSpec || !runSpec.sourcecode || !runSpec.language_id) {
      return NextResponse.json({ error: "Invalid run_spec" }, { status: 400 });
    }

    // Execute code using the local fallback engine which spawns compilers natively
    const result = (jobeService as any).executeLocalFallback(
      runSpec.language_id,
      runSpec.sourcecode,
      runSpec.input || ""
    );

    // Format back to Jobe API response style
    const jobeResponse = {
      run_id: `run_${Date.now()}`,
      outcome: result.outcome,
      cmpinfo: result.compile_output,
      stdout: result.stdout,
      stderr: result.stderr,
      time: parseFloat(result.time || "0"),
      memory: result.memory || 0,
    };

    return NextResponse.json(jobeResponse);
  } catch (error) {
    return NextResponse.json({ error: "Execution failed" }, { status: 500 });
  }
}
