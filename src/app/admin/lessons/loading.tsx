import { SkeletonPage } from "@/components/loading";

export default function AdminLessonsLoading() {
  return (
    <SkeletonPage
      type="grid"
      titleWidth="240px"
      subtitleWidth="360px"
    />
  );
}
