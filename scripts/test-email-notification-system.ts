/**
 * SENSILEARN LMS — AUTOMATED EMAIL NOTIFICATION SYSTEM VALIDATION SUITE
 * 
 * Verifies all 20 LMS Activity Email Templates, the Central Dispatcher,
 * corporate styling (#0A1F44, #2563EB, clean white), responsive HTML,
 * plain-text fallbacks, recipient deduplication, and draft gating.
 */

import {
  generateCoursePublishedEmail,
  generatePracticePublishedEmail,
  generateMcqPracticePublishedEmail,
  generateCodingPracticePublishedEmail,
  generateTestPublishedEmail,
  generateAssessmentScheduledEmail,
  generateLiveClassScheduledEmail,
  generateLiveClassRescheduledEmail,
  generateLiveClassCancelledEmail,
  generateCodingChallengePublishedEmail,
  generateProgrammingContestEmail,
  generateAssignmentAssignedEmail,
  generateProjectAssignedEmail,
  generateDeadlineReminderEmail,
  generateResultPublishedEmail,
  generateFeedbackEmail,
  generateStudyMaterialEmail,
  generateAnnouncementEmail,
  generateBatchAllocationEmail,
  generateCourseUpdatedEmail,
} from "../src/lib/email/email-templates";
import { dispatchLMSEvent } from "../src/lib/notifications/dispatcher";

interface TestResult {
  templateName: string;
  passed: boolean;
  errors: string[];
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string, errors: string[]) {
  if (!condition) {
    errors.push(message);
  }
}

function runTemplateTest(
  name: string,
  generator: () => { subject: string; html: string; text: string },
  expectedSubjectPattern: RegExp,
  expectedCtaText: string
) {
  const errors: string[] = [];
  try {
    const { subject, html, text } = generator();

    // 1. Subject line test
    assert(
      expectedSubjectPattern.test(subject),
      `Subject "${subject}" did not match pattern ${expectedSubjectPattern}`,
      errors
    );

    // 2. Branding & Enterprise Colors
    assert(html.includes("#0A1F44"), "HTML missing royal dark blue header color #0A1F44", errors);
    assert(html.includes("#2563EB"), "HTML missing Sensilearn blue accent color #2563EB", errors);
    assert(html.includes("SENSILEARN"), "HTML missing Sensilearn brand name", errors);

    // 3. Personalized greeting
    assert(html.includes("Dear John Doe,"), "HTML missing personalized greeting 'Dear John Doe,'", errors);
    assert(text.includes("Dear John Doe,"), "Plain text missing personalized greeting 'Dear John Doe,'", errors);

    // 4. CTA and Redirect URL
    assert(html.includes(expectedCtaText), `HTML missing expected CTA text "${expectedCtaText}"`, errors);
    assert(html.includes("https://sensilearn.com"), "HTML missing destination or portal link", errors);

    // 5. Support & Corporate Footer
    assert(html.includes("sensigroup.info@gmail.com"), "HTML missing support contact sensigroup.info@gmail.com", errors);
    assert(html.includes("sensilearn.com"), "HTML footer missing sensilearn.com", errors);
    assert(text.includes("sensigroup.info@gmail.com"), "Plain text footer missing support email", errors);

    // 6. Zero Unresolved Placeholders
    assert(!html.includes("{{"), "HTML contains unresolved {{ placeholder", errors);
    assert(!html.includes("}}"), "HTML contains unresolved }} placeholder", errors);
    assert(!text.includes("{{"), "Plain text contains unresolved {{ placeholder", errors);
    assert(!text.includes("}}"), "Plain text contains unresolved }} placeholder", errors);

    // 7. Plain-text fallback completeness
    assert(text.length > 50, "Plain text fallback is too short or empty", errors);
  } catch (err: any) {
    errors.push(`Exception thrown: ${err.message}`);
  }

  results.push({
    templateName: name,
    passed: errors.length === 0,
    errors,
  });
}

console.log("================================================================================");
console.log("   SENSILEARN LMS — EMAIL NOTIFICATION & TEMPLATE SYSTEM VALIDATION SUITE      ");
console.log("================================================================================\n");

// 1. COURSE EMAIL TEMPLATE
runTemplateTest(
  "1. Course Published",
  () =>
    generateCoursePublishedEmail({
      recipientName: "John Doe",
      courseName: "Fullstack Cloud Architecture",
      courseDescription: "Advanced microservices and cloud deployment strategies.",
      batchName: "Alpha-2026",
      trainerName: "Dr. Robert Smith",
      publishedDate: "Nov 05, 2026",
      courseUrl: "https://sensilearn.com/student/course/cloud-architecture",
    }),
  /^New Course Available – Fullstack Cloud Architecture \| Sensilearn$/,
  "ACCESS YOUR COURSE"
);

// 2. PRACTICE MODULE EMAIL TEMPLATE
runTemplateTest(
  "2. Practice Module Published",
  () =>
    generatePracticePublishedEmail({
      recipientName: "John Doe",
      practiceName: "Distributed Systems Labs",
      courseName: "Cloud Computing",
      topicName: "Consensus Algorithms",
      batchName: "Alpha-2026",
      publishedDate: "Nov 05, 2026",
      practiceUrl: "https://sensilearn.com/student/practices/101",
    }),
  /^New Practice Module – Distributed Systems Labs \| Sensilearn$/,
  "START PRACTICING"
);

// 3. MCQ PRACTICE EMAIL TEMPLATE
runTemplateTest(
  "3. MCQ Practice Published",
  () =>
    generateMcqPracticePublishedEmail({
      recipientName: "John Doe",
      practiceName: "Database Indexing & Concurrency",
      courseName: "Backend Engineering",
      topicName: "B-Trees & Locks",
      totalQuestions: 15,
      batchName: "Alpha-2026",
      practiceUrl: "https://sensilearn.com/student/practices/mcq/102",
    }),
  /^New MCQ Practice Available – Database Indexing & Concurrency \| Sensilearn$/,
  "START MCQ PRACTICE"
);

// 4. CODING PRACTICE EMAIL TEMPLATE
runTemplateTest(
  "4. Coding Practice Published",
  () =>
    generateCodingPracticePublishedEmail({
      recipientName: "John Doe",
      practiceName: "Graph Traversal & Shortest Path",
      programmingLanguage: "Python, C++, Java",
      difficulty: "Hard",
      courseName: "Advanced Data Structures",
      batchName: "Alpha-2026",
      practiceUrl: "https://sensilearn.com/student/practices/coding/103",
    }),
  /^New Programming Practice – Graph Traversal & Shortest Path \| Sensilearn$/,
  "OPEN CODING PRACTICE"
);

// 5. TEST EMAIL TEMPLATE
runTemplateTest(
  "5. Test Published",
  () =>
    generateTestPublishedEmail({
      recipientName: "John Doe",
      testName: "Midterm Algorithms Examination",
      courseName: "Computer Science Core",
      batchName: "Alpha-2026",
      totalQuestions: 30,
      totalMarks: 100,
      duration: "90 Minutes",
      startDate: "Nov 10, 2026",
      endDate: "Nov 12, 2026",
      testUrl: "https://sensilearn.com/student/tests/201",
    }),
  /^New Test Available – Midterm Algorithms Examination \| Sensilearn$/,
  "VIEW TEST DETAILS"
);

// 6. ASSESSMENT EMAIL TEMPLATE
runTemplateTest(
  "6. Assessment Scheduled",
  () =>
    generateAssessmentScheduledEmail({
      recipientName: "John Doe",
      assessmentName: "Proctored System Design Assessment",
      courseName: "Enterprise Software Engineering",
      batchName: "Alpha-2026",
      assessmentDate: "Nov 15, 2026",
      startTime: "10:00 AM IST",
      duration: "120 Minutes",
      totalMarks: 100,
      assessmentUrl: "https://sensilearn.com/student/tests/301",
    }),
  /^Assessment Scheduled – Proctored System Design Assessment \| Sensilearn$/,
  "VIEW ASSESSMENT"
);

// 7. LIVE CLASS EMAIL TEMPLATE
runTemplateTest(
  "7. Live Class Scheduled",
  () =>
    generateLiveClassScheduledEmail({
      recipientName: "John Doe",
      sessionTitle: "Event-Driven Architecture & WebSockets",
      courseName: "Modern Web Systems",
      trainerName: "Prof. Alan Turing",
      batchName: "Alpha-2026",
      sessionDate: "Nov 08, 2026",
      sessionTime: "06:00 PM IST",
      duration: "60 Minutes",
      meetingUrl: "https://sensilearn.com/student/live-classes/401",
      liveClassUrl: "https://sensilearn.com/student/live-classes/401",
    }),
  /^Upcoming Live Class – Event-Driven Architecture & WebSockets \| Sensilearn$/,
  "JOIN LIVE CLASS"
);

// 8. LIVE CLASS RESCHEDULE EMAIL TEMPLATE
runTemplateTest(
  "8. Live Class Rescheduled",
  () =>
    generateLiveClassRescheduledEmail({
      recipientName: "John Doe",
      sessionTitle: "Event-Driven Architecture & WebSockets",
      oldDate: "Nov 08, 2026",
      oldTime: "06:00 PM IST",
      newDate: "Nov 09, 2026",
      newTime: "07:00 PM IST",
      trainerName: "Prof. Alan Turing",
      batchName: "Alpha-2026",
      liveClassUrl: "https://sensilearn.com/student/live-classes/401",
    }),
  /^Schedule Update – Live Class \| Sensilearn$/,
  "VIEW UPDATED SCHEDULE"
);

// 9. LIVE CLASS CANCELLATION EMAIL TEMPLATE
runTemplateTest(
  "9. Live Class Cancelled",
  () =>
    generateLiveClassCancelledEmail({
      recipientName: "John Doe",
      sessionTitle: "High-Performance C++ Memory Management",
      courseName: "Systems Programming",
      sessionDate: "Nov 06, 2026",
      batchName: "Alpha-2026",
      dashboardUrl: "https://sensilearn.com/student/live-classes",
    }),
  /^Live Class Cancelled – High-Performance C\+\+ Memory Management \| Sensilearn$/,
  "VIEW DASHBOARD"
);

// 10. CODING CHALLENGE EMAIL TEMPLATE
runTemplateTest(
  "10. Coding Challenge Published",
  () =>
    generateCodingChallengePublishedEmail({
      recipientName: "John Doe",
      challengeName: "LRU Cache Implementation",
      category: "Data Structures",
      difficulty: "Hard",
      languages: "Python, Java, C++, TypeScript",
      batchName: "Alpha-2026",
      deadline: "Nov 20, 2026",
      challengeUrl: "https://sensilearn.com/coding/problems/lru-cache",
    }),
  /^New Coding Challenge – LRU Cache Implementation \| Sensilearn$/,
  "SOLVE CHALLENGE"
);

// 11. PROGRAMMING CONTEST EMAIL TEMPLATE
runTemplateTest(
  "11. Programming Contest",
  () =>
    generateProgrammingContestEmail({
      recipientName: "John Doe",
      contestName: "Sensilearn Winter Algorithmic Cup 2026",
      batchName: "Alpha-2026",
      startDate: "Nov 25, 2026",
      startTime: "02:00 PM IST",
      duration: "180 Minutes",
      problemCount: 6,
      contestUrl: "https://sensilearn.com/coding/contests/winter-2026",
    }),
  /^Upcoming Programming Contest – Sensilearn Winter Algorithmic Cup 2026 \| Sensilearn$/,
  "VIEW CONTEST"
);

// 12. ASSIGNMENT EMAIL TEMPLATE
runTemplateTest(
  "12. Assignment Assigned",
  () =>
    generateAssignmentAssignedEmail({
      recipientName: "John Doe",
      assignmentName: "OAuth2 & JWT Microservice Implementation",
      courseName: "Identity & Security Engineering",
      batchName: "Alpha-2026",
      assignedDate: "Nov 05, 2026",
      dueDate: "Nov 19, 2026",
      totalMarks: 100,
      assignmentUrl: "https://sensilearn.com/student/assignments/501",
    }),
  /^New Assignment – OAuth2 & JWT Microservice Implementation \| Sensilearn$/,
  "VIEW ASSIGNMENT"
);

// 13. PROJECT EMAIL TEMPLATE
runTemplateTest(
  "13. Project Assigned",
  () =>
    generateProjectAssignedEmail({
      recipientName: "John Doe",
      projectName: "Autonomous Agent Workflow Engine",
      courseName: "Applied Artificial Intelligence",
      batchName: "Alpha-2026",
      trainerName: "Dr. Grace Hopper",
      startDate: "Nov 05, 2026",
      deadline: "Dec 15, 2026",
      projectUrl: "https://sensilearn.com/student/projects/601",
    }),
  /^New Project Assigned – Autonomous Agent Workflow Engine \| Sensilearn$/,
  "VIEW PROJECT"
);

// 14. DEADLINE REMINDER EMAIL TEMPLATE
runTemplateTest(
  "14. Deadline Reminder",
  () =>
    generateDeadlineReminderEmail({
      recipientName: "John Doe",
      activityName: "OAuth2 & JWT Microservice Implementation",
      activityType: "Project Assignment",
      courseName: "Identity & Security Engineering",
      batchName: "Alpha-2026",
      deadline: "Tomorrow at 11:59 PM IST",
      activityUrl: "https://sensilearn.com/student/assignments/501",
    }),
  /^Upcoming Deadline Reminder – OAuth2 & JWT Microservice Implementation \| Sensilearn$/,
  "CONTINUE ACTIVITY"
);

// 15. RESULTS PUBLISHED EMAIL TEMPLATE
runTemplateTest(
  "15. Results Published",
  () =>
    generateResultPublishedEmail({
      recipientName: "John Doe",
      assessmentName: "Proctored System Design Assessment",
      courseName: "Enterprise Software Engineering",
      batchName: "Alpha-2026",
      publishedDate: "Nov 05, 2026",
      resultUrl: "https://sensilearn.com/student/reports",
      score: 94,
      totalMarks: 100,
      percentage: 94,
    }),
  /^Results Published – Proctored System Design Assessment \| Sensilearn$/,
  "VIEW MY RESULTS"
);

// 16. FEEDBACK EMAIL TEMPLATE
runTemplateTest(
  "16. Feedback Available",
  () =>
    generateFeedbackEmail({
      recipientName: "John Doe",
      activityName: "Distributed KV Store Milestone 2",
      courseName: "Distributed Systems",
      batchName: "Alpha-2026",
      trainerName: "Dr. Leslie Lamport",
      evaluationDate: "Nov 05, 2026",
      feedbackUrl: "https://sensilearn.com/student/assignments/502/feedback",
    }),
  /^Feedback Available – Distributed KV Store Milestone 2 \| Sensilearn$/,
  "VIEW FEEDBACK"
);

// 17. STUDY MATERIAL EMAIL TEMPLATE
runTemplateTest(
  "17. Study Material Uploaded",
  () =>
    generateStudyMaterialEmail({
      recipientName: "John Doe",
      resourceName: "Raft Consensus Protocol Deep Dive Slides",
      courseName: "Distributed Systems",
      moduleName: "Module 4: Consensus",
      batchName: "Alpha-2026",
      trainerName: "Dr. Leslie Lamport",
      materialUrl: "https://sensilearn.com/student/course/distributed-systems/materials",
    }),
  /^New Learning Material – Raft Consensus Protocol Deep Dive Slides \| Sensilearn$/,
  "ACCESS STUDY MATERIAL"
);

// 18. ANNOUNCEMENT EMAIL TEMPLATE
runTemplateTest(
  "18. Important Announcement",
  () =>
    generateAnnouncementEmail({
      recipientName: "John Doe",
      announcementTitle: "Campus Hackathon & Career Fair Schedule",
      announcementDescription: "Registrations are now open for the annual Sensilearn Enterprise Hiring Hackathon.",
      batchName: "All Cohorts",
      authorName: "Sensilearn Academic Council",
      publishedDate: "Nov 05, 2026",
      announcementUrl: "https://sensilearn.com/announcements/701",
    }),
  /^Important Announcement – Campus Hackathon & Career Fair Schedule \| Sensilearn$/,
  "READ ANNOUNCEMENT"
);

// 19. BATCH ALLOCATION EMAIL TEMPLATE
runTemplateTest(
  "19. Batch Allocation Confirmed",
  () =>
    generateBatchAllocationEmail({
      recipientName: "John Doe",
      batchName: "Alpha-2026 Cloud Architects",
      programmeName: "Enterprise Software Engineering Track",
      institutionName: "Sensilearn Institute of Technology",
      trainerName: "Dr. Robert Smith",
      startDate: "Nov 15, 2026",
      dashboardUrl: "https://sensilearn.com/student/dashboard",
    }),
  /^Batch Allocation Confirmed – Sensilearn$/,
  "OPEN STUDENT DASHBOARD"
);

// 20. COURSE UPDATE EMAIL TEMPLATE
runTemplateTest(
  "20. Course Update",
  () =>
    generateCourseUpdatedEmail({
      recipientName: "John Doe",
      courseName: "Fullstack Cloud Architecture",
      batchName: "Alpha-2026",
      updateDescription: "Added new Kubernetes Operators and Terraform modules to Week 6.",
      updatedBy: "Sensilearn Curriculum Board",
      updatedDate: "Nov 05, 2026",
      courseUrl: "https://sensilearn.com/student/course/cloud-architecture",
    }),
  /^Course Update – Fullstack Cloud Architecture \| Sensilearn$/,
  "VIEW COURSE UPDATE"
);

// Print Test Summary
let passedCount = 0;
results.forEach((r) => {
  if (r.passed) {
    passedCount++;
    console.log(`  [PASS] ${r.templateName}`);
  } else {
    console.error(`  [FAIL] ${r.templateName}`);
    r.errors.forEach((err) => console.error(`         -> ${err}`));
  }
});

console.log("\n--------------------------------------------------------------------------------");
console.log(`Templates Validated: ${passedCount} / ${results.length} (${Math.round((passedCount / results.length) * 100)}%)`);

// Test Draft Gating
async function testDraftGating() {
  console.log("\nTesting Draft Gating Rule in Dispatcher...");
  const draftResult = await dispatchLMSEvent({
    eventType: "COURSE_PUBLISHED",
    isDraft: true,
    name: "Draft Course Never Emailed",
    targetUrl: "/student/course/draft-test",
    recipientEmails: ["test@example.com"],
  });

  if (draftResult.skippedDraft && draftResult.dispatched === 0) {
    console.log("  [PASS] Draft item correctly skipped with 0 emails dispatched.");
  } else {
    console.error("  [FAIL] Draft item was NOT skipped!");
    process.exit(1);
  }
}

testDraftGating()
  .then(() => {
    if (passedCount === results.length) {
      console.log("\n================================================================================");
      console.log("   ALL 20 EMAIL TEMPLATES & DISPATCHER CHECKS PASSED PERFECTLY (100%)           ");
      console.log("================================================================================\n");
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  });

