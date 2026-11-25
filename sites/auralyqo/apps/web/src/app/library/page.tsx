import { Suspense } from "react";
import { LibraryView } from "./LibraryView";

export const metadata = { title: "Pustaka" };
export default function Page() {
  return (
    <Suspense>
      <LibraryView />
    </Suspense>
  );
}
