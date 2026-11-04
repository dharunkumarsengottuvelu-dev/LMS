/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * SensiLearn LMS - Universal Responsive UI/UX & Display Resolution Verification Suite (JS)
 */

const fs = require('fs');
const path = require('path');

const results = [];

function assert(category, name, condition, details) {
  results.push({
    category,
    name,
    passed: Boolean(condition),
    details,
  });
}

function runResponsiveAudit() {
  console.log("=======================================================================");
  console.log(" SENSILEARN LMS — UNIVERSAL RESPONSIVE UI & RESOLUTION AUDIT SUITE");
  console.log("=======================================================================\n");

  const projectRoot = path.resolve(__dirname, '..');

  // 1. Audit src/app/layout.tsx
  const layoutPath = path.join(projectRoot, 'src/app/layout.tsx');
  const layoutCode = fs.readFileSync(layoutPath, 'utf8');

  assert(
    "Root Viewport Metadata",
    "Viewport export exists in layout.tsx",
    layoutCode.includes("export const viewport: Viewport"),
    "Exporting Next.js Viewport config ensures proper mobile and foldable scaling"
  );

  assert(
    "Root Viewport Metadata",
    "Viewport includes viewportFit: 'cover' for safe areas and cutouts",
    layoutCode.includes('viewportFit: "cover"') || layoutCode.includes("viewportFit: 'cover'"),
    "Required for iPhone notches and foldable displays"
  );

  assert(
    "Root Viewport Metadata",
    "Viewport allows user scalability for accessibility",
    layoutCode.includes("maximumScale: 5"),
    "Allows WCAG compliant zoom up to 500%"
  );

  // 2. Audit src/app/globals.css
  const globalsPath = path.join(projectRoot, 'src/app/globals.css');
  const globalsCss = fs.readFileSync(globalsPath, 'utf8');

  assert(
    "Global CSS Responsive Tiers",
    "Base :root defines responsive container and safe area variables",
    globalsCss.includes("--container-max-width: 1536px") &&
    globalsCss.includes("--safe-bottom:") &&
    globalsCss.includes("--safe-left:") &&
    globalsCss.includes("--safe-right:"),
    "Safe areas and container padding initialized"
  );

  assert(
    "Global CSS Responsive Tiers",
    "Tier 1: Laptop breakpoint (@media min-width: 1440px) scales container",
    globalsCss.includes("@media (min-width: 1440px)") && globalsCss.includes("--container-max-width: 1680px"),
    "Container scales to 1680px for 1440p-1600p laptops"
  );

  assert(
    "Global CSS Responsive Tiers",
    "Tier 2: Full HD Desktop (@media min-width: 1920px) scales container",
    globalsCss.includes("@media (min-width: 1920px)") && globalsCss.includes("--container-max-width: 1920px"),
    "Eliminates wasted borders on 1080p/1200p monitors"
  );

  assert(
    "Global CSS Responsive Tiers",
    "Tier 3: QHD / 2K Displays (@media min-width: 2560px) scales container",
    globalsCss.includes("@media (min-width: 2560px)") && globalsCss.includes("--container-max-width: 2400px"),
    "Expands to 2400px on 2K/1440p screens"
  );

  assert(
    "Global CSS Responsive Tiers",
    "Tier 4: Ultrawide 21:9 & 4K (@media min-width: 3440px) scales container",
    globalsCss.includes("@media (min-width: 3440px)") && globalsCss.includes("--container-max-width: 3100px"),
    "Fills ultrawide 3440px displays without dead whitespace"
  );

  assert(
    "Global CSS Responsive Tiers",
    "Tier 5: Super Ultrawide 32:9 & 5K/6K/8K (@media min-width: 5120px) scales container",
    globalsCss.includes("@media (min-width: 5120px)") && globalsCss.includes("--container-max-width: 4400px"),
    "Expands up to 4400px on 5120px and 8K displays"
  );

  assert(
    "Global CSS Fluid Utilities",
    "Fluid grid utilities (.lms-grid-responsive, .lms-grid-responsive-wide) exist",
    globalsCss.includes(".lms-grid-responsive") && globalsCss.includes(".lms-grid-responsive-wide"),
    "Allows dynamic column wrapping without rigid column numbers"
  );

  assert(
    "Global CSS Dynamic Viewport Units",
    "Dynamic viewport units (.h-viewport-available, dvh) provided",
    globalsCss.includes(".h-viewport-available") && globalsCss.includes("100dvh"),
    "Prevents mobile browser address bar jump on iOS and Android"
  );

  // 3. Audit Coding Problem Workspace (src/app/coding/problems/[problemId]/page.tsx)
  const problemCodingPath = path.join(projectRoot, 'src/app/coding/problems/[problemId]/page.tsx');
  const problemCoding = fs.readFileSync(problemCodingPath, 'utf8');

  assert(
    "Coding Compiler Mobile Ergonomics",
    "Coding problem page supports 5 accessible mobile views",
    problemCoding.includes('"problem" | "editor" | "custom_input" | "output" | "testcases"'),
    "5 distinct tabs: problem, editor, custom_input, output, testcases"
  );

  assert(
    "Coding Compiler Mobile Ergonomics",
    "Monaco Editor container is monitored by ResizeObserver",
    problemCoding.includes("new ResizeObserver") && problemCoding.includes("editorContainerRef"),
    "Auto-relayouts Monaco on screen resize, rotation, or folding/unfolding"
  );

  assert(
    "Coding Compiler Large Screen Proportions",
    "Workspace grid expands across 2xl and 3xl breakpoints",
    problemCoding.includes("2xl:grid-cols-[38%_minmax(0,1fr)]") &&
    problemCoding.includes("3xl:grid-cols-[35%_minmax(0,1fr)]"),
    "Prevents editor cramping on 2K/4K/Ultrawide displays"
  );

  // 4. Audit Student Practice Coding Page (src/app/student/practices/coding/[id]/page.tsx)
  const practiceCodingPath = path.join(projectRoot, 'src/app/student/practices/coding/[id]/page.tsx');
  const practiceCoding = fs.readFileSync(practiceCodingPath, 'utf8');

  assert(
    "Practice Coding Compiler",
    "Practice coding page supports 5 accessible mobile views",
    practiceCoding.includes('"problem" | "editor" | "custom_input" | "output" | "testcases"'),
    "Provides parity across all coding execution environments"
  );

  assert(
    "Practice Coding Compiler",
    "Practice coding page has ResizeObserver on Monaco container",
    practiceCoding.includes("new ResizeObserver") && practiceCoding.includes("editorContainerRef"),
    "Keeps Monaco responsive on viewport dimension shifts"
  );

  // 5. Audit Practice Runner Question Palette (src/components/quiz/practice-runner.tsx)
  const runnerPath = path.join(projectRoot, 'src/components/quiz/practice-runner.tsx');
  const runnerCode = fs.readFileSync(runnerPath, 'utf8');

  assert(
    "Question Palette & Assessments",
    "PracticeRunnerEngine supports slide-over drawer modal on mobile",
    runnerCode.includes("showPaletteDrawer") && runnerCode.includes("renderMobileQuestionNavigation"),
    "Touch-friendly slide-over drawer for phone and tablet screens"
  );

  assert(
    "Question Palette & Assessments",
    "Question palette scales for large 2K/4K displays",
    runnerCode.includes("2xl:max-w-[340px]") && runnerCode.includes("3xl:max-w-[400px]"),
    "Maintains readable palette proportions on large screens"
  );

  // 6. Brand Name Consistency
  assert(
    "Brand Identity Verification",
    "Root layout uses exact brand name 'SensiLearn'",
    layoutCode.includes('default: "SensiLearn"') && !layoutCode.includes('SensilLearn'),
    "Spelling strictly SensiLearn (no double 'l')"
  );

  // Report Summary
  console.log("-----------------------------------------------------------------------");
  console.log("AUDIT RESULTS:");
  console.log("-----------------------------------------------------------------------");

  let passedCount = 0;
  for (const r of results) {
    const icon = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`[${icon}] [${r.category}] ${r.name}`);
    if (r.details) {
      console.log(`         Note: ${r.details}`);
    }
    if (r.passed) passedCount++;
  }

  console.log("\n=======================================================================");
  console.log(` SUMMARY: ${passedCount} / ${results.length} checks passed (${Math.round((passedCount / results.length) * 100)}%)`);
  console.log("=======================================================================\n");

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runResponsiveAudit();

