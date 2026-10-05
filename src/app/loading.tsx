import { Loading } from "@/components/ui/loading";

export default function GlobalRouteLoading() {
  return (
    <Loading
      fullScreen
      size="lg"
      text="Loading..."
      subtext="Please wait while we prepare your content."
    />
  );
}
