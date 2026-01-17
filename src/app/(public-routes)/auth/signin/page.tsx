import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { env } from "@/env";
import SignInPageClient from "@features/shared/auth/sign-in-page";

export default async function SignInPage(props: { searchParams?: Promise<{ callbackUrl?: string; error?: string }> }) {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  const { callbackUrl = "/", error } = (await props.searchParams) ?? {};
  const demoEnabled = env.ENABLE_DEMO_MODE === "true";
  const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

  return (
    <SignInPageClient
      googleEnabled={googleEnabled}
      demoEnabled={demoEnabled}
      callbackUrl={callbackUrl}
      initialError={error}
    />
  );
}
