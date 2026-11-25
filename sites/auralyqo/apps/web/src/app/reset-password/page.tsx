import { Suspense } from "react";
import { ResetView } from "./ResetView";

export const metadata = { title: "Tetapkan kata laluan" };
export default function Page() {
  return (
    <Suspense>
      <ResetView />
    </Suspense>
  );
}
