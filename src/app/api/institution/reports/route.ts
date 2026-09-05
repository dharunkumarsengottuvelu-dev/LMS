import { NextRequest, NextResponse } from "next/server";
import { authenticateInstitutionSession } from "@/app/api/institution/_auth";
import { InstitutionPerformanceService, StudentBatchPerformanceRow } from "@/services/institution-performance.service";

export async function GET(request: NextRequest) {
  const auth = await authenticateInstitutionSession();
  if (auth.errorResponse) return auth.errorResponse;

  const { institutionInfo } = auth;
  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId");
  const format = (searchParams.get("format") || "json").toLowerCase();

  const assignedBatches = await InstitutionPerformanceService.getAssignedBatches(institutionInfo!);

  let targetBatches = assignedBatches;
  if (batchId && batchId !== "all") {
    targetBatches = assignedBatches.filter((b) => b.id === batchId);
  }

  const allRecords: (StudentBatchPerformanceRow & { batchName: string; batchCode: string })[] = [];

  for (const b of targetBatches) {
    const { students } = await InstitutionPerformanceService.getBatchPerformance(b.id);
    students.forEach((s) => {
      allRecords.push({
        ...s,
        batchName: b.name,
        batchCode: b.code,
      });
    });
  }

  // If CSV format requested
  if (format === "csv") {
    const headers = [
      "Student ID",
      "Student Name",
      "Email",
      "Batch Code",
      "Batch Name",
      "Learning (%)",
      "Skill Lab (%)",
      "Code Lab (%)",
      "Assess (%)",
      "Overall (%)",
      "Progress (%)",
      "Performance Status",
      "Account Status",
      "Last Activity",
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines = [
      headers.join(","),
      ...allRecords.map((r) =>
        [
          escapeCsv(r.employeeId),
          escapeCsv(r.studentName),
          escapeCsv(r.email),
          escapeCsv(r.batchCode),
          escapeCsv(r.batchName),
          escapeCsv(r.learning !== null ? `${r.learning}%` : "N/A"),
          escapeCsv(r.skillLab !== null ? `${r.skillLab}%` : "N/A"),
          escapeCsv(r.codeLab !== null ? `${r.codeLab}%` : "N/A"),
          escapeCsv(r.assess !== null ? `${r.assess}%` : "N/A"),
          escapeCsv(r.overall !== null ? `${r.overall}%` : "N/A"),
          escapeCsv(r.progress !== null ? `${r.progress}%` : "N/A"),
          escapeCsv(r.status),
          escapeCsv(r.accountStatus),
          escapeCsv(r.lastActivity),
        ].join(",")
      ),
    ];

    const csvContent = csvLines.join("\r\n");
    const filename = `institution-performance-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({
    institution: institutionInfo!.name,
    totalRecords: allRecords.length,
    records: allRecords,
    generatedAt: new Date().toISOString(),
  });
}
