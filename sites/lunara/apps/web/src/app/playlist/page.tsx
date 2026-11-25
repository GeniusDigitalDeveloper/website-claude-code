import { Suspense } from "react";
import { View } from "./View";

export default function Page() {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
}
