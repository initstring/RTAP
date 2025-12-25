"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { UserRole } from "@prisma/client";
// Theme toggle now lives inside the UserMenu dropdown
import { useSidebar } from "@features/shared/layout/sidebar-context";
import { Shield } from "lucide-react";
import { UserMenu } from "./user-menu";

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon?: string;
  requiredRole?: UserRole;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    key: "operations",
    label: "Operations",
    href: "/operations",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
  {
    key: "analytics",
    label: "Analytics",
    href: "",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    children: [
      {
        key: "attack-matrix",
        label: "Attack Matrix",
        href: "/analytics/attack-matrix",
      },
      {
        key: "scorecard",
        label: "Scorecards",
        href: "/analytics/scorecard",
      },
      {
        key: "trends",
        label: "Trends",
        href: "/analytics/trends",
      },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    href: "",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    requiredRole: UserRole.ADMIN,
    children: [
      {
        key: "taxonomy",
        label: "Taxonomy",
        href: "/settings/taxonomy",
      },
      {
        key: "users",
        label: "Users",
        href: "/settings/users",
      },
      {
        key: "groups",
        label: "Groups",
        href: "/settings/groups",
      },
      {
        key: "data",
        label: "Data",
        href: "/settings/data",
      },

    ],
  },
];

export function SidebarNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { isCollapsed, toggleCollapsed } = useSidebar();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(["analytics", "settings"]));

  const toggleExpanded = (key: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedItems(newExpanded);
  };

  const isActive = (href: string) => pathname === href;
  const isParentActive = (item: NavItem): boolean => {
    if (pathname === item.href) return true;
    if (item.children) {
      return item.children.some(child =>
        isParentActive(child) || pathname === child.href
      );
    }
    return false;
  };

  const shouldShowItem = (item: NavItem) => {
    if (!item.requiredRole) return true;
    return session?.user.role === item.requiredRole;
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    if (!shouldShowItem(item)) return null;

    const hasChildren = (item.children?.length ?? 0) > 0;
    const isExpanded = expandedItems.has(item.key);
    const active = isActive(item.href);
    const parentActive = isParentActive(item);

    return (
      <div key={item.key}>
        <div
          className={`
            flex items-center justify-between px-3 py-2 text-sm rounded-[var(--radius-md)] transition-all duration-200 cursor-pointer
            ${depth > 0 ? 'ml-' + (depth * 4) : ''}
            ${active
              ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)] border-l-2 border-[var(--color-accent)] -ml-[2px]'
              : parentActive
                ? 'text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)]'
            }
          `}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.key);
            }
          }}
        >
          {item.href ? (
            <Link
              href={item.href}
              className="flex items-center gap-3 flex-1"
              onClick={(e) => hasChildren && e.stopPropagation()}
            >
              {item.icon && depth === 0 && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
              )}
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          ) : (
            <div className="flex items-center gap-3 flex-1">
              {item.icon && depth === 0 && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
              )}
              {!isCollapsed && <span>{item.label}</span>}
            </div>
          )}
          {hasChildren && !isCollapsed && (
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
        {hasChildren && isExpanded && !isCollapsed && (
          <div className="mt-1">
            {item.children!.map((child) => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!session) return null;

  return (
    <div
      className={`
        ${isCollapsed ? 'w-16' : 'w-64'} 
        h-screen bg-[var(--color-surface)] border-r border-[var(--color-border)] 
        flex flex-col transition-all duration-300 fixed left-0 top-0 z-40
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <Link href="/" className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'}`}>
            <Shield className="w-8 h-8 text-[var(--color-accent)] fill-[var(--color-accent)]/10" />
            {!isCollapsed && (
              <span className="text-xl font-bold text-[var(--color-text-primary)]">RTAP</span>
            )}
          </Link>
          <button
            onClick={toggleCollapsed}
            className="p-1 rounded hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isCollapsed ? "M9 5l7 7-7 7" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navigation.map((item) => renderNavItem(item))}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-[var(--color-border)]">
        {!isCollapsed ? (
          <div className="flex items-center">
            <UserMenu />
          </div>
        ) : (
          <div className="flex items-center">
            <UserMenu collapsed />
          </div>
        )}
      </div>
    </div>
  );
}
