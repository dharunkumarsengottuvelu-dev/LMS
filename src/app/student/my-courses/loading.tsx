import { SkeletonPage } from "@/components/loading";

export default function StudentMyCoursesLoading() {
  return (
    <SkeletonPage
      type="grid"
      titleWidth="220px"
      subtitleWidth="340px"
    />
  );
}
