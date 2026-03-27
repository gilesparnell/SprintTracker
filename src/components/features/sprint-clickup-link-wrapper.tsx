"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { SprintClickUpLink } from "./sprint-clickup-link";

export function SprintClickUpLinkWrapper({
  sprintId,
  sprintName,
}: {
  sprintId: string;
  sprintName: string;
}) {
  const router = useRouter();

  const fetchLists = useCallback(async () => {
    const res = await fetch("/api/clickup/lists");
    const data = await res.json();
    return data.lists;
  }, []);

  async function handleLink(listId: string) {
    await fetch(`/api/sprints/${sprintId}/link-clickup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId }),
    });
    router.refresh();
  }

  async function handleCreateNew() {
    await fetch(`/api/sprints/${sprintId}/link-clickup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    router.refresh();
  }

  return (
    <SprintClickUpLink
      sprintId={sprintId}
      sprintName={sprintName}
      isLinked={false}
      onLink={handleLink}
      onCreateNew={handleCreateNew}
      fetchLists={fetchLists}
    />
  );
}
