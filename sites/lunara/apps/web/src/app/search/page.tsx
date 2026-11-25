import { Suspense } from "react";
import { SearchView } from "./SearchView";

export const metadata = { title: "Cari" };

export default function Page() {
  return (
    <Suspense>
      <SearchView />
    </Suspense>
  );
}
