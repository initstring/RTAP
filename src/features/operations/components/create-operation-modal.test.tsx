import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { OperationStatus, OperationVisibility } from "@prisma/client";
import CreateOperationModal from "./create-operation-modal";
import type { RouterOutputs } from "@/trpc/react";

vi.mock("@/trpc/react", () => {
  const makeMutation = () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  });

  return {
    api: {
      taxonomy: {
        threatActors: { list: { useQuery: () => ({ data: [] }) } },
        tags: { list: { useQuery: () => ({ data: [] }) } },
        targets: { list: { useQuery: () => ({ data: [] }) } },
      },
      groups: { list: { useQuery: () => ({ data: [] }) } },
      operations: {
        create: { useMutation: makeMutation },
        update: { useMutation: makeMutation },
      },
      useUtils: () => ({
        operations: {
          list: { invalidate: vi.fn() },
          getById: { invalidate: vi.fn() },
        },
      }),
    },
  };
});

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

type Operation = RouterOutputs["operations"]["getById"];

describe("CreateOperationModal status select", () => {
  it("shows the current status when editing", () => {
    const operation: Operation = {
      id: 1,
      name: "Operation Falcon",
      description: "Test operation",
      status: "ACTIVE" as OperationStatus,
      startDate: new Date("2024-01-10"),
      endDate: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
      createdById: "user-1",
      visibility: "EVERYONE" as OperationVisibility,
      accessGroups: [],
      tags: [],
      targets: [],
      techniques: [],
      createdBy: { id: "user-1", name: "Alice", email: "alice@example.com" },
      threatActor: null,
      threatActorId: null,
    };

    render(
      <CreateOperationModal
        isOpen
        onClose={() => undefined}
        operationId={operation.id}
        operation={operation}
      />
    );

    return waitFor(() => {
      expect(screen.getByLabelText(/Operation Status/i)).toHaveTextContent("Active");
    });
  });
});
