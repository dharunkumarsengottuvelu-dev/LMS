import { redirect } from "next/navigation";

export default function AdminLessonsPage() {
  redirect("/admin/assigned-courses");
}
