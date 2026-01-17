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
  const githubEnabled = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
  const gitlabEnabled = Boolean(env.GITLAB_CLIENT_ID && env.GITLAB_CLIENT_SECRET);
  const keycloakEnabled = Boolean(env.KEYCLOAK_CLIENT_ID && env.KEYCLOAK_CLIENT_SECRET && env.KEYCLOAK_ISSUER);
  const oktaEnabled = Boolean(env.OKTA_CLIENT_ID && env.OKTA_CLIENT_SECRET && env.OKTA_ISSUER);

  return (
    <SignInPageClient
      googleEnabled={googleEnabled}
      githubEnabled={githubEnabled}
      gitlabEnabled={gitlabEnabled}
      keycloakEnabled={keycloakEnabled}
      oktaEnabled={oktaEnabled}
      demoEnabled={demoEnabled}
      callbackUrl={callbackUrl}
      initialError={error}
    />
  );
}
