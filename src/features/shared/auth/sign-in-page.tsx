"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@components/ui";

interface Props {
  googleEnabled: boolean;
  githubEnabled: boolean;
  gitlabEnabled: boolean;
  keycloakEnabled: boolean;
  oktaEnabled: boolean;
  demoEnabled: boolean;
  callbackUrl: string;
  initialError?: string;
}

type OAuthProviderId = "google" | "github" | "gitlab" | "keycloak" | "okta";

const oauthOptions: Array<{ id: OAuthProviderId; label: string }> = [
  { id: "google", label: "Continue with Google" },
  { id: "github", label: "Continue with GitHub" },
  { id: "gitlab", label: "Continue with GitLab" },
  { id: "keycloak", label: "Continue with Keycloak" },
  { id: "okta", label: "Continue with Okta" },
];

export default function SignInPageClient({
  googleEnabled,
  githubEnabled,
  gitlabEnabled,
  keycloakEnabled,
  oktaEnabled,
  demoEnabled,
  callbackUrl,
  initialError,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"demo" | OAuthProviderId | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const toMessage = (err?: string | null) => {
    if (!err) return null;
    switch (err) {
      case "AccessDenied":
        return "Access denied. Contact an administrator.";
      case "CredentialsSignin":
        return "Demo sign-in failed. Contact an administrator.";
      default:
        return "Sign-in failed. Please try again.";
    }
  };

  const handleDemo = async () => {
    if (!demoEnabled) return;
    setLoading("demo");
    setError(null);
    try {
      const res = await signIn("demo", { callbackUrl, redirect: false });
      if (res?.error) {
        setError(toMessage(res.error));
      } else if (res?.url) {
        router.push(res.url);
      }
    } finally {
      setLoading(null);
    }
  };

  const handleOAuth = async (provider: OAuthProviderId) => {
    setLoading(provider);
    setError(null);
    try {
      const res = await signIn(provider, { callbackUrl, redirect: false });
      if (res?.error) {
        setError(toMessage(res.error));
      } else if (res?.url) {
        window.location.assign(res.url);
      }
    } finally {
      setLoading(null);
    }
  };

  const oauthEnabled: Record<OAuthProviderId, boolean> = {
    google: googleEnabled,
    github: githubEnabled,
    gitlab: gitlabEnabled,
    keycloak: keycloakEnabled,
    okta: oktaEnabled,
  };

  const enabledOauthOptions = oauthOptions.filter((option) => oauthEnabled[option.id]);
  const nothingEnabled = enabledOauthOptions.length === 0 && !demoEnabled;
  const showSeparator = demoEnabled && enabledOauthOptions.length > 0;

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-md border border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader className="pb-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
            <CardTitle className="text-[var(--color-text-primary)] tracking-tight">RTAP</CardTitle>
          </div>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">Red Team operations and analytics</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {error && (
            <div className="text-sm text-[var(--status-error-fg)] border border-[var(--status-error-fg)]/30 rounded px-3 py-2">
              {error}
            </div>
          )}

          {demoEnabled && (
            <Button
              variant="glass"
              className="w-full"
              onClick={handleDemo}
              disabled={loading !== null}
            >
              {loading === "demo" ? "Signing in…" : "Sign in as Demo Admin"}
            </Button>
          )}

          {showSeparator && (
            <div className="relative text-center">
              <div className="h-px bg-[var(--color-border)]" />
              <span className="inline-block px-2 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)] -mt-2 relative">
                or
              </span>
            </div>
          )}

          {enabledOauthOptions.map((option) => (
            <Button
              key={option.id}
              variant="glass"
              className="w-full"
              onClick={() => void handleOAuth(option.id)}
              disabled={loading !== null}
            >
              {loading === option.id ? "Redirecting…" : option.label}
            </Button>
          ))}

          {nothingEnabled && (
            <div className="text-sm text-[var(--color-text-secondary)]">
              No sign-in methods are currently enabled. Please contact an administrator.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
