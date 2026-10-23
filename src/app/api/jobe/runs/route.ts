import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jobeService } from "@/services/jobe/client";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Active session required to run code." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const runSpec = body.run_spec;

    if (!runSpec || !runSpec.sourcecode || !runSpec.language_id) {
      return NextResponse.json({ error: "Invalid run_spec" }, { status: 400 });
    }

    if (typeof runSpec.sourcecode === "string" && runSpec.sourcecode.length > 65536) {
      return NextResponse.json(
        { error: "Payload too large: Source code exceeds maximum allowed size (64KB)." },
        { status: 413 }
      );
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
