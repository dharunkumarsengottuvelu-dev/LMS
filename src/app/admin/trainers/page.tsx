import { redirect } from "next/navigation";

export default function AdminTrainersPage() {
  redirect("/admin/users?tab=employee");
}
