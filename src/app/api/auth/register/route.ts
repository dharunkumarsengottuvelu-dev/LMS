import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StudentIdService } from "@/services/student-id.service";

/**
 * GET /api/auth/register
 * Public helper endpoint for the student registration portal:
 * - Lists registered partner institutions (name, code, college)
 * - Lists active batches available for joining
 * - Validates an institution code if `?code=XYZ` query parameter is supplied
 */
export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const url = new URL(request.url);
    const codeParam = url.searchParams.get("code")?.trim();

    // 1. Fetch registered partner institutions (profiles with role='institution')
    const { data: instProfiles, error: instErr } = await admin
      .from("profiles")
      .select("id, first_name, last_name, college, branch, email, phone")
      .eq("role", "institution")
      .order("college", { ascending: true });

    if (instErr) {
      console.warn("Notice: Error fetching institution profiles:", instErr.message);
    }

    const institutions = (instProfiles || []).map((p: any) => {
      const college = (p.college || p.first_name || "Partner Institution").trim();
      const code = (p.branch || p.code || college.slice(0, 6)).trim().toUpperCase();
      const name = `${p.first_name || ""} ${p.last_name || ""}`.trim() || college;
      return {
        id: p.id,
        name,
        college,
        code,
        email: p.email || "",
      };
    });

    // If validating a specific institution code
    if (codeParam) {
      const normalizedCode = codeParam.toUpperCase();
      const matched = institutions.find(
        (inst) =>
          inst.code.toUpperCase() === normalizedCode ||
          inst.college.toUpperCase() === normalizedCode
      );

      if (matched) {
        return NextResponse.json({
          valid: true,
          institution: matched,
        });
      }

      return NextResponse.json(
        {
          valid: false,
          error: "Institution code not found. Please verify with your institution administrator or continue as an external learner.",
        },
        { status: 404 }
      );
    }

    // 2. Fetch active batches
    const { data: batchesData, error: bErr } = await admin
      .from("batches")
      .select("id, name, description, start_date")
      .order("name", { ascending: true });

    if (bErr) {
      console.warn("Notice: Error fetching batches:", bErr.message);
    }

    const batches = (batchesData || []).map((b: any) => {
      let collegeName = "";
      let courseName = "";
      try {
        if (b.description && typeof b.description === "string" && b.description.startsWith("{")) {
          const meta = JSON.parse(b.description);
          collegeName = meta.collegeName || meta.college_name || "";
          courseName = meta.course || meta.courseName || "";
        }
      } catch {}

      return {
        id: b.id,
        name: b.name || "Cohort",
        collegeName: collegeName || "All Institutions",
        courseName: courseName || "Fullstack Program",
        startDate: b.start_date || "",
      };
    });

    return NextResponse.json({
      success: true,
      institutions,
      batches,
    });
  } catch (error: any) {
    console.error("GET /api/auth/register error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load registration metadata" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/register
 * Student Registration Endpoint:
 * - Validates all student personal, academic, and security details server-side
 * - Enforces role="student" on the server (never trusts client role)
 * - Prevents duplicate account creation
 * - Creates user in Supabase Auth with confirmed email
 * - Assigns or generates Student Registration ID
 * - Associates student with selected institution and batch
 * - Upserts student profile record
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      first_name,
      last_name,
      email,
      password,
      phone,
      gender,
      date_of_birth,
      institution_name,
      institution_code,
      department,
      degree,
      academic_year,
      semester,
      register_number,
      graduation_year,
      batch_id,
      batch_name,
    } = body;

    // 1. Validate mandatory fields
    const firstNameClean = String(first_name || "").trim();
    const lastNameClean = String(last_name || "").trim();
    const emailClean = String(email || "").toLowerCase().trim();
    const passwordClean = String(password || "");

    if (!firstNameClean) {
      return NextResponse.json({ error: "First name is required." }, { status: 400 });
    }
    if (firstNameClean.length < 2) {
      return NextResponse.json({ error: "First name must be at least 2 characters." }, { status: 400 });
    }
    if (!lastNameClean) {
      return NextResponse.json({ error: "Last name is required." }, { status: 400 });
    }
    if (!emailClean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      return NextResponse.json({ error: "Please enter a valid student email address." }, { status: 400 });
    }
    if (!passwordClean || passwordClean.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }
    // Check password complexity (at least one letter and at least one number/symbol)
    if (!/(?=.*[a-zA-Z])(?=.*[0-9!@#$%^&*])/.test(passwordClean)) {
      return NextResponse.json(
        { error: "Password must contain a combination of letters and at least one number or special character." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 2. Prevent duplicate account registration
    // Check in auth.users
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const emailConflict = (existingUsers?.users || []).some(
      (u) => (u.email || "").toLowerCase().trim() === emailClean
    );

    if (emailConflict) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please sign in or reset your password." },
        { status: 409 }
      );
    }

    // Also check profiles table by email
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, email")
      .eq("email", emailClean)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: "An account with this email address already exists in the system. Please sign in." },
        { status: 409 }
      );
    }

    // Clean optional fields
    const phoneClean = phone ? String(phone).trim() : null;
    const genderClean = gender && ["male", "female", "other"].includes(String(gender).toLowerCase())
      ? String(gender).toLowerCase()
      : null;
    const dobClean = date_of_birth ? String(date_of_birth).trim() : null;
    const instNameClean = institution_name ? String(institution_name).trim() : "Independent Learner";
    const instCodeClean = institution_code ? String(institution_code).trim().toUpperCase() : null;
    const deptClean = department ? String(department).trim() : null;
    const degreeClean = degree ? String(degree).trim() : null;
    const acadYearClean = academic_year ? String(academic_year).trim() : null;
    const semClean = semester ? String(semester).trim() : null;
    const regNumClean = register_number ? String(register_number).trim().toUpperCase() : null;
    const gradYearClean = graduation_year ? String(graduation_year).trim() : null;

    // Validate institution code if provided
    let verifiedInstitutionId: string | null = null;
    if (instCodeClean) {
      const { data: matchedInst } = await admin
        .from("profiles")
        .select("id, college, branch")
        .eq("role", "institution")
        .or(`branch.ilike.${instCodeClean},college.ilike.${instCodeClean}`)
        .maybeSingle();

      if (matchedInst) {
        verifiedInstitutionId = matchedInst.id;
      }
    }

    // Resolve Batch details if batch_id provided
    let assignedBatchId: string | null = null;
    let assignedBatchName: string = "Self-Paced";

    if (batch_id && batch_id !== "none") {
      const { data: matchedBatch } = await admin
        .from("batches")
        .select("id, name")
        .eq("id", batch_id)
        .maybeSingle();

      if (matchedBatch) {
        assignedBatchId = matchedBatch.id;
        assignedBatchName = matchedBatch.name;
      }
    } else if (batch_name && batch_name !== "none") {
      assignedBatchName = String(batch_name).trim();
    }

    // 3. Create user in Supabase Auth strictly with role="student"
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: emailClean,
      password: passwordClean,
      email_confirm: true,
      user_metadata: {
        first_name: firstNameClean,
        last_name: lastNameClean,
        role: "student",
        phone: phoneClean,
        college: instNameClean,
        institution_code: instCodeClean,
        institution_id: verifiedInstitutionId,
        department: deptClean,
        degree: degreeClean,
        academic_year: acadYearClean,
        semester: semClean,
        student_id: regNumClean || null,
        graduation_year: gradYearClean,
        batch_id: assignedBatchId,
        batch_name: assignedBatchName,
      },
    });

    if (createError || !newUser?.user) {
      console.error("Supabase createUser error:", createError);
      return NextResponse.json(
        { error: createError?.message || "Failed to create user authentication record." },
        { status: 400 }
      );
    }

    const userId = newUser.user.id;

    // 4. Resolve or generate Student Register ID
    let officialStudentId = regNumClean;
    if (!officialStudentId) {
      try {
        officialStudentId = await StudentIdService.getOrGenerateStudentId(
          { id: userId, email: emailClean, created_at: new Date().toISOString() },
          admin
        );
      } catch (idErr) {
        console.warn("Notice generating student ID:", idErr);
        officialStudentId = `REG-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    // 5. Batch mapping: If batch assigned, link in batch_members table
    if (assignedBatchId) {
      try {
        await admin.from("batch_members").insert({
          batch_id: assignedBatchId,
          user_id: userId,
        });
      } catch (batchMapErr) {
        console.warn("Notice inserting batch_members record:", batchMapErr);
      }
    }

    // 6. Upsert Student Profile in profiles table
    // (Note: gender, date_of_birth, degree, semester are stored in auth user_metadata)
    const profilePayload: Record<string, any> = {
      user_id: userId,
      first_name: firstNameClean,
      last_name: lastNameClean,
      email: emailClean,
      phone: phoneClean,
      college: instNameClean,
      branch: deptClean,
      batch_id: assignedBatchId,
      batch_name: assignedBatchName,
      batch: assignedBatchName,
      role: "student", // STRICT: Always student
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: profileError } = await admin
      .from("profiles")
      .upsert(profilePayload, { onConflict: "user_id" });

    if (profileError) {
      console.error("Profile upsert error:", profileError);
      // Attempt recovery by inserting minimal profile
      await admin.from("profiles").upsert(
        {
          user_id: userId,
          first_name: firstNameClean,
          last_name: lastNameClean,
          email: emailClean,
          role: "student",
          status: "active",
        },
        { onConflict: "user_id" }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Student account created successfully.",
        userId,
        studentId: officialStudentId,
        student: {
          id: userId,
          employeeId: officialStudentId,
          name: `${firstNameClean} ${lastNameClean}`,
          email: emailClean,
          college: instNameClean,
          department: deptClean,
          batch: assignedBatchName || "Not Assigned",
          batchId: assignedBatchId,
          role: "student",
          status: "active",
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST /api/auth/register uncaught error:", err);
    const msg = err instanceof Error ? err.message : "An unexpected registration error occurred.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
