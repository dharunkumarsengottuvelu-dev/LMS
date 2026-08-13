import { redirect } from "next/navigation";

export default function StudentCodingIDEPage() {
  // Redirect to the new dynamic assessment engine
  redirect("/student/assessments");
}
