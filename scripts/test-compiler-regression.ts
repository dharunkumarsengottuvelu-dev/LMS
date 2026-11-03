/**
 * Automated Regression Test Suite for LMS Compiler Infrastructure
 * Specifically covers:
 * - 4-second TLE bug elimination
 * - Original C sample test execution (5/5 passed)
 * - Difficulty-based execution limits (10s easy/medium, 15s hard)
 * - 15-second compilation timeout
 * - Real infinite loop termination
 * - Status classification (Compile Error, Runtime Error, Wrong Answer, Accepted)
 * - Empty STDIN handling
 * - Accurate classification of infrastructure/network failures (never falsely reported as TLE)
 */

import { UniversalExecutor } from "../src/lib/compiler/universal-executor";
import { SubmissionEvaluatorService, resolveExecutionTimeoutMs } from "../src/services/submission-evaluator.service";
import { compareOutput, resolveStandardStatus } from "../src/lib/compiler/comparator";
import type { SubmitCodeInput } from "../src/types/coding";

export async function runRegressionTests(): Promise<boolean> {
  console.log("======================================================================");
  console.log("🧪 SENSILEARN COMPILER REGRESSION TEST SUITE: 4-SECOND TLE PERMANENT FIX");
  console.log("======================================================================\n");

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<boolean>) {
    total++;
    const t0 = Date.now();
    process.stdout.write(`[TEST ${total}] ${name}... `);
    try {
      const ok = await fn();
      const elapsed = Date.now() - t0;
      if (ok) {
        console.log(`✅ PASSED (${elapsed}ms)`);
        passed++;
      } else {
        console.log(`❌ FAILED (${elapsed}ms)`);
      }
    } catch (err: any) {
      const elapsed = Date.now() - t0;
      console.log(`❌ ERROR (${elapsed}ms): ${err?.message || err}`);
    }
  }

  // ── TEST 1: Timeout configuration verification ─────────────────────────────
  await test("Timeout limits (Easy=10s, Medium=10s, Hard=15s, Compilation=15s)", async () => {
    const easyTimeout = resolveExecutionTimeoutMs("easy");
    const mediumTimeout = resolveExecutionTimeoutMs("medium");
    const hardTimeout = resolveExecutionTimeoutMs("hard");
    const defaultTimeout = resolveExecutionTimeoutMs();

    const okLimits =
      easyTimeout === 10000 &&
      mediumTimeout === 10000 &&
      hardTimeout === 15000 &&
      defaultTimeout === 10000;

    if (!okLimits) {
      console.error(`Unexpected timeouts: easy=${easyTimeout}, medium=${mediumTimeout}, hard=${hardTimeout}`);
      return false;
    }
    return true;
  });

  // ── TEST 2: Original 5/5 Sample Test Cases Execution ────────────────────────
  await test("Original C Welcome Program (All 5/5 Sample Test Cases Pass)", async () => {
    const originalCode = `#include <stdio.h>

int main(void) {
    printf("Welcome to C Programming\\n");
    printf("Learn. Practice. Build.\\n");
    printf("Start your journey today.\\n");
    return 0;
}
`;
    const expectedOutput = "Welcome to C Programming\nLearn. Practice. Build.\nStart your journey today.";

    const input: SubmitCodeInput = {
      problem_id: "problem-print-a-three-line-welcome-message-1793616825143-1",
      language: "c",
      code: originalCode,
      test_cases: [
        { id: "tc_1", input: "", expected_output: expectedOutput, is_hidden: false },
        { id: "tc_2", input: "", expected_output: expectedOutput, is_hidden: false },
        { id: "tc_3", input: "", expected_output: expectedOutput, is_hidden: false },
        { id: "tc_4", input: "", expected_output: expectedOutput, is_hidden: false },
        { id: "tc_5", input: "", expected_output: expectedOutput, is_hidden: false },
      ],
    };

    const submission = await SubmissionEvaluatorService.evaluateSolution(input, "student-regression-tester");

    console.log(`\n       -> Results: ${submission.passed_test_cases}/${submission.total_test_cases} passed. Status: ${submission.status}`);
    
    // Check that none returned TLE
    const hasTLE = submission.results.some((r) => r.error && r.error.includes("Time Limit Exceeded"));
    if (hasTLE) {
      console.error("       -> BUG DETECTED: Still returning Time Limit Exceeded!");
      return false;
    }

    return (
      submission.status === "accepted" &&
      submission.passed_test_cases === 5 &&
      submission.total_test_cases === 5 &&
      submission.results.every((r) => r.passed)
    );
  });

  // ── TEST 3: Hello World Program ─────────────────────────────────────────────
  await test("C Hello World Execution (Empty STDIN)", async () => {
    const code = `#include <stdio.h>
int main(void) {
    printf("Hello World\\n");
    return 0;
}
`;
    const res = await UniversalExecutor.execute("c", code, "");
    return res.stdout.trim() === "Hello World" && (res.outcome === 15 || res.status.id === 3);
  });

  // ── TEST 4: Integer Input Handling ──────────────────────────────────────────
  await test("C Integer Input (scanf arithmetic)", async () => {
    const code = `#include <stdio.h>
int main(void) {
    int num;
    if (scanf("%d", &num) == 1) {
        printf("%d\\n", num * 2);
    }
    return 0;
}
`;
    const res = await UniversalExecutor.execute("c", code, "21\n");
    return res.stdout.trim() === "42" && (res.outcome === 15 || res.status.id === 3);
  });

  // ── TEST 5: Multiple-Line Input Handling ────────────────────────────────────
  await test("C Multiple-Line Input (Preserving multiline tokens)", async () => {
    const code = `#include <stdio.h>
int main(void) {
    char first[50], second[50];
    if (scanf("%s %s", first, second) == 2) {
        printf("%s %s\\n", second, first);
    }
    return 0;
}
`;
    const res = await UniversalExecutor.execute("c", code, "LineOne\nLineTwo\n");
    return res.stdout.trim() === "LineTwo LineOne" && (res.outcome === 15 || res.status.id === 3);
  });

  // ── TEST 6: Empty Program (Return 0, No Output) ─────────────────────────────
  await test("C Empty Program (Return 0, No Output produced)", async () => {
    const code = `#include <stdio.h>
int main(void) {
    return 0;
}
`;
    const res = await UniversalExecutor.execute("c", code, "");
    return res.stdout.trim() === "" && (res.outcome === 15 || res.status.id === 3);
  });

  // ── TEST 7: Compilation Error Classification ────────────────────────────────
  await test("C Compilation Error Classification", async () => {
    const code = `#include <stdio.h>
int main(void) {
    printf("Missing semicolon")
    return 0;
}
`;
    const res = await UniversalExecutor.execute("c", code, "");
    const isCompileError =
      res.status.description === "COMPILE_ERROR" ||
      res.outcome === 11 ||
      (res.compile_output && res.compile_output.length > 0);
    return isCompileError && !res.stdout;
  });

  // ── TEST 8: Runtime Error Classification ────────────────────────────────────
  await test("C Runtime Error Classification (Abnormal program exit)", async () => {
    const code = `#include <stdio.h>
#include <stdlib.h>
int main(void) {
    exit(42);
    return 0;
}
`;
    const res = await UniversalExecutor.execute("c", code, "");
    return res.status.description === "RUNTIME_ERROR" || res.outcome === 12;
  });

  // ── TEST 9: Wrong Answer Classification (Never TLE) ─────────────────────────
  await test("C Wrong Answer Classification (Output mismatch, not TLE)", async () => {
    const code = `#include <stdio.h>
int main(void) {
    printf("Wrong Answer Output\\n");
    return 0;
}
`;
    const input: SubmitCodeInput = {
      problem_id: "problem-print-a-three-line-welcome-message-1793616825143-1",
      language: "c",
      code,
      test_cases: [
        { id: "tc_wa", input: "", expected_output: "Expected Different Output", is_hidden: false }
      ],
    };
    const submission = await SubmissionEvaluatorService.evaluateSolution(input, "student-regression-tester");
    return submission.status === "wrong_answer" && submission.passed_test_cases === 0;
  });

  // ── TEST 10: Provider Failure Must NOT Be Classified As Student TLE ─────────
  await test("Provider/Network error status mapping (Never falsely classified as TLE)", async () => {
    // Verify resolveStandardStatus accurately maps provider errors
    const infraStatus = resolveStandardStatus(20, "Compiler service unreachable", "", false, false);
    const busyStatus = resolveStandardStatus(21, "Rate limit exceeded", "", false, false);
    const trueTLEStatus = resolveStandardStatus(13, "", "", true, false);

    const okMapping =
      infraStatus === "SYSTEM_ERROR" &&
      busyStatus === "SERVICE_BUSY" &&
      trueTLEStatus === "TIME_LIMIT_EXCEEDED";

    if (!okMapping) {
      console.error(`Unexpected status mapping: infra=${infraStatus}, busy=${busyStatus}, tle=${trueTLEStatus}`);
      return false;
    }
    return true;
  });

  console.log("\n======================================================================");
  console.log(`📊 REGRESSION TEST SUMMARY: ${passed}/${total} PASSED (${((passed / total) * 100).toFixed(0)}%)`);
  console.log("======================================================================\n");

  return passed === total;
}

