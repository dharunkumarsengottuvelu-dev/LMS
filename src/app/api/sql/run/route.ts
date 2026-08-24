import { NextRequest, NextResponse } from "next/server";
import { SQLExecutionService } from "@/services/sql-execution.service";
import type { SQLQueryInput } from "@/types/coding";
import { getErrorMessage } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SQLQueryInput;
    const { query, datasetName, engine, schemaSql, seedSql, timeoutMs } = body;

    if (!query) {
      return NextResponse.json(
        { error: "Field 'query' is required." },
        { status: 400 }
      );
    }

    const result = await SQLExecutionService.executeQuery(query, datasetName, {
      engine,
      schemaSql,
      seedSql,
      timeoutMs,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const msg = getErrorMessage(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
