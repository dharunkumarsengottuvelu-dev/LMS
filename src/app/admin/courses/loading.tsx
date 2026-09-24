import { SkeletonPage } from "@/components/loading";

export default function AdminCoursesLoading() {
  return (
    <SkeletonPage
      type="grid"
      titleWidth="220px"
      subtitleWidth="340px"
    />
  );
}
