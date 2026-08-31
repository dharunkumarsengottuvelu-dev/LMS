import { UniversalExecutor } from "../src/lib/compiler/universal-executor";
import { compareOutput, sanitizeCompilerOutput } from "../src/lib/compiler/comparator";
import { SQLExecutionService } from "../src/services/sql-execution.service";

async function runTestSuite() {
  console.log("============================================================");
  console.log("🚀 STARTING UNIVERSAL MULTI-LANGUAGE COMPILER TEST SUITE");
  console.log("============================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  async function assertTest(
    name: string,
    testFn: () => Promise<boolean>
  ) {
    totalTests++;
    process.stdout.write(`Testing: ${name}... `);
    try {
      const ok = await testFn();
      if (ok) {
        console.log("✅ PASSED");
        passedTests++;
      } else {
        console.log("❌ FAILED");
      }
    } catch (err: any) {
      console.log(`❌ ERROR: ${err?.message}`);
    }
  }

  // ── TEST 1: Java with public class Main ───────────────────────────────────
  await assertTest("Java (public class Main with STDIN arithmetic)", async () => {
    const code = `import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println(a + b);
    }
}`;
    const res = await UniversalExecutor.execute("java", code, "10 20");
    return res.stdout.trim() === "30" && (res.outcome === 15 || res.status.id === 3);
  });

  // ── TEST 2: Java with public class Solution ───────────────────────────────
  await assertTest("Java (public class Solution dynamic filename matching)", async () => {
    const code = `import java.util.*;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println(a + b);
    }
}`;
    const res = await UniversalExecutor.execute("java", code, "10 20");
    return res.stdout.trim() === "30" && res.filename === "Solution.java";
  });

  // ── TEST 3: Java Multiple Public Classes Compilation Error ─────────────────
  await assertTest("Java (multiple public classes compilation error)", async () => {
    const code = `public class A {} public class B {}`;
    const res = await UniversalExecutor.execute("java", code, "");
    return res.status.description === "COMPILE_ERROR" && res.stderr.includes("Multiple public classes");
  });

  // ── TEST 4: Python 3 STDIN arithmetic ─────────────────────────────────────
  await assertTest("Python 3 (space-separated STDIN arithmetic)", async () => {
    const code = `a, b = map(int, input().split())
print(a + b)`;
    const res = await UniversalExecutor.execute("python", code, "10 20");
    return res.stdout.trim() === "30" && (res.outcome === 15 || res.status.id === 3);
  });

  // ── TEST 5: C++ (GCC 17) STDIN arithmetic ──────────────────────────────────
  await assertTest("C++ 17 (cin / cout arithmetic)", async () => {
    const code = `#include <iostream>
using namespace std;
int main() {
    int a, b;
    if (cin >> a >> b) {
        cout << a + b << endl;
    }
    return 0;
}`;
    const res = await UniversalExecutor.execute("cpp", code, "10 20");
    return res.stdout.trim() === "30" && (res.outcome === 15 || res.status.id === 3);
  });

  // ── TEST 6: C (GCC 17) STDIN arithmetic ────────────────────────────────────
  await assertTest("C 17 (scanf / printf arithmetic)", async () => {
    const code = `#include <stdio.h>
int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        printf("%d\\n", a + b);
    }
    return 0;
}`;
    const res = await UniversalExecutor.execute("c", code, "10 20");
    return res.stdout.trim() === "30" && (res.outcome === 15 || res.status.id === 3);
  });

  // ── TEST 7: JavaScript (Node.js) STDIN arithmetic ─────────────────────────
  await assertTest("JavaScript (fs.readFileSync STDIN arithmetic)", async () => {
    const code = `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8');
const [a, b] = input.trim().split(/\\s+/).map(Number);
console.log(a + b);`;
    const res = await UniversalExecutor.execute("javascript", code, "10 20");
    return res.stdout.trim() === "30" && (res.outcome === 15 || res.status.id === 3);
  });

  // ── TEST 8: SQL Sandbox in-memory query ────────────────────────────────────
  await assertTest("SQL Sandbox (Isolated Query Evaluation)", async () => {
    const sqlRes = await SQLExecutionService.executeQuery("SELECT 10 + 20 AS sum;", "university", { engine: "sqlite" });
    return !sqlRes.error && sqlRes.rows[0]?.sum === 30;
  });

  // ── TEST 9: Whitespace Normalized Output Comparison ───────────────────────
  await assertTest("Output Comparator (WHITESPACE_NORMALIZED mode)", async () => {
    const actual = "10   20 \r\n30\n\n";
    const expected = "10 20\n30";
    return compareOutput(actual, expected, "WHITESPACE_NORMALIZED");
  });

  // ── TEST 10: Infinite Loop Timeout Handling ───────────────────────────────
  await assertTest("Timeout Monitor (graceful termination on infinite loop)", async () => {
    const code = `while True:\n    pass`;
    const res = await UniversalExecutor.execute("python", code, "", 2000);
    return res.status.description === "TIME_LIMIT_EXCEEDED" || res.outcome === 13;
  });

  // ── TEST 11: Compilation Error Path Sanitization ─────────────────────────
  await assertTest("Security Path Sanitizer (cleans internal temp paths)", async () => {
    const dirty = "C:\\Users\\admin\\AppData\\Local\\Temp\\lms_sandbox_84930\\Main.java:5: error: cannot find symbol";
    const clean = sanitizeCompilerOutput(dirty, "Main.java");
    return clean.includes("Main.java:5: error:") && !clean.includes("AppData");
  });

  console.log("\n============================================================");
  console.log(`📊 TEST SUITE FINISHED: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("============================================================\n");

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTestSuite();
