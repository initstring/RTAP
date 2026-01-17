"use client";

import { api } from "@/trpc/react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@components/ui";
import { parseUserProfile, type UserProfile } from "@features/shared/users/user-validators";

const renderLastLogin = (lastLogin: UserProfile["lastLogin"]) => {
  if (!lastLogin) return "Never";

  if (lastLogin instanceof Date) {
    return lastLogin.toLocaleString();
  }

  if (typeof lastLogin === "string" || typeof lastLogin === "number") {
    const parsed = new Date(lastLogin);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString();
    }
  }

  return String(lastLogin);
};

export default function AccountPage() {
  const { data: meData, refetch, isLoading } = api.users.me.useQuery();
  const me = parseUserProfile(meData);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Account</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="text-sm text-[var(--color-text-secondary)]">Loading…</p>}
          {!isLoading && me && (
            <>
              <p className="text-sm text-[var(--color-text-secondary)]">Name: {me.name ?? "Not set"}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">Email: {me.email}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">Role: {me.role}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Last login: {renderLastLogin(me.lastLogin)}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Access to RTAP is managed through your configured SSO provider.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => void refetch()}>
              Refresh status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
