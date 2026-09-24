import { SkeletonPage } from "@/components/loading";

export default function AdminStudentsLoading() {
  return (
    <SkeletonPage
      type="table"
      titleWidth="240px"
      subtitleWidth="360px"
    />
  );
}
