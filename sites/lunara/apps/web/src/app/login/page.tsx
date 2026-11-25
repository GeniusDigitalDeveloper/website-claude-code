import { Suspense } from "react";
import { LoginView } from "./LoginView";

export const metadata = { title: "Log masuk" };
export default function Page() {
  return (
    <Suspense>
      <LoginView />
    </Suspense>
  );
}
