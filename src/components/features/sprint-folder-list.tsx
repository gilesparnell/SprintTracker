"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { useDroppable } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import { SprintCard, SprintCardContent } from "./sprint-card";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderOpenIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  GripVerticalIcon,
  CheckIcon,
  XIcon,
} from "lucide-react";

type SprintWithCounts = {
  id: string;
  name: string;
  goal: string | null;
  startDate: string;
  endDate: string;
  status: string;
  folderId: string | null;
  clickupListId: string | null;
  taskCounts: { open: number; in_progress: number; done: number };
};

type Folder = {
  id: string;
  name: string;
};

function DraggableSprintCard({
  sprint,
  groupId,
  index,
}: {
  sprint: SprintWithCounts;
  groupId: string;
  index: number;
}) {
  const router = useRouter();
  const { ref, isDragSource } = useSortable({
    id: sprint.id,
    index,
    group: groupId,
    type: "sprint",
    accept: "sprint",
  });

  return (
    <div
      ref={ref}
      onClick={() => router.push(`/sprints/${sprint.id}`)}
      className={`relative cursor-grab active:cursor-grabbing ${
        isDragSource ? "opacity-40 scale-[0.98]" : ""
      }`}
    >
      <SprintCardContent sprint={sprint} />
    </div>
  );
}

function FolderSection({
  folder,
  sprints,
  isDropTarget,
  dropRef,
  onRename,
  onDelete,
}: {
  folder: Folder;
  sprints: SprintWithCounts[];
  isDropTarget: boolean;
  dropRef: React.RefCallback<HTMLElement>;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);

  function handleSaveRename() {
    if (editName.trim() && editName !== folder.name) {
      onRename(folder.id, editName.trim());
    }
    setEditing(false);
  }

  return (
    <div
      ref={dropRef}
      className={`rounded-xl border transition-colors ${
        isDropTarget
          ? "border-green-500/40 bg-green-500/5"
          : "border-gray-800/50"
      }`}
    >
      {/* Folder header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          {collapsed ? (
            <ChevronRightIcon className="w-4 h-4" />
          ) : (
            <ChevronDownIcon className="w-4 h-4" />
          )}
        </button>
        {collapsed ? (
          <FolderIcon className="w-4 h-4 text-amber-400/70" />
        ) : (
          <FolderOpenIcon className="w-4 h-4 text-amber-400" />
        )}

        {editing ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveRename();
                if (e.key === "Escape") setEditing(false);
              }}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-green-500/50"
              autoFocus
            />
            <button
              onClick={handleSaveRename}
              className="p-1 text-green-400 hover:bg-green-900/20 rounded"
            >
              <CheckIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="p-1 text-gray-500 hover:bg-gray-800 rounded"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <span className="text-sm font-semibold text-white flex-1">
              {folder.name}
            </span>
            <span className="text-xs text-gray-600 font-mono">
              {sprints.length}
            </span>
            <button
              onClick={() => {
                setEditName(folder.name);
                setEditing(true);
              }}
              className="p-1 text-gray-600 hover:text-blue-400 hover:bg-gray-800 rounded transition-colors"
            >
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(folder.id)}
              className="p-1 text-gray-600 hover:text-red-400 hover:bg-gray-800 rounded transition-colors"
            >
              <Trash2Icon className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Sprint cards */}
      {!collapsed && (
        <div className="px-4 pb-3 space-y-2 min-h-[40px]">
          {sprints.length === 0 && (
            <div
              className={`flex items-center justify-center h-12 border-2 border-dashed rounded-lg transition-colors ${
                isDropTarget ? "border-green-500/30" : "border-gray-800/30"
              }`}
            >
              <p className="text-xs text-gray-600">Drag sprints here</p>
            </div>
          )}
          {sprints.map((sprint, index) => (
            <DraggableSprintCard
              key={sprint.id}
              sprint={sprint}
              groupId={folder.id}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FolderDropZone({
  folder,
  sprints,
  onRename,
  onDelete,
}: {
  folder: Folder;
  sprints: SprintWithCounts[];
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const { ref, isDropTarget } = useDroppable({
    id: folder.id,
    type: "column",
    accept: "sprint",
  });

  return (
    <FolderSection
      folder={folder}
      sprints={sprints}
      isDropTarget={isDropTarget}
      dropRef={ref}
      onRename={onRename}
      onDelete={onDelete}
    />
  );
}

function UnfiledDropZone({ sprints }: { sprints: SprintWithCounts[] }) {
  const { ref, isDropTarget } = useDroppable({
    id: "unfiled",
    type: "column",
    accept: "sprint",
  });

  return (
    <div
      ref={ref}
      className={`space-y-2 rounded-xl p-2 min-h-[48px] transition-colors ${
        isDropTarget ? "bg-green-500/5 ring-1 ring-green-500/30" : ""
      }`}
    >
      {sprints.length === 0 && (
        <div
          className={`flex items-center justify-center h-12 border-2 border-dashed rounded-lg transition-colors ${
            isDropTarget ? "border-green-500/30" : "border-gray-800/30"
          }`}
        >
          <p className="text-xs text-gray-600">
            Drop sprints here to remove from folder
          </p>
        </div>
      )}
      {sprints.map((sprint, index) => (
        <DraggableSprintCard
          key={sprint.id}
          sprint={sprint}
          groupId="unfiled"
          index={index}
        />
      ))}
    </div>
  );
}

export function SprintFolderList({
  initialFolders,
  initialSprints,
}: {
  initialFolders: Folder[];
  initialSprints: SprintWithCounts[];
}) {
  const router = useRouter();
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Build grouped state for dnd-kit move() helper
  const [items, setItems] = useState<Record<string, SprintWithCounts[]>>(() => {
    const grouped: Record<string, SprintWithCounts[]> = { unfiled: [] };
    for (const folder of initialFolders) {
      grouped[folder.id] = [];
    }
    for (const sprint of initialSprints.filter((s) => s.status !== "completed")) {
      const key = sprint.folderId ?? "unfiled";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(sprint);
    }
    return grouped;
  });

  const completedSprints = initialSprints.filter(
    (s) => s.status === "completed"
  );

  async function handleMoveSprint(sprintId: string, folderId: string | null) {
    await fetch(`/api/sprints/${sprintId}/folder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId }),
    });
    router.refresh();
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName.trim() }),
    });
    setNewFolderName("");
    setCreatingFolder(false);
    router.refresh();
  }

  async function handleRenameFolder(id: string, name: string) {
    await fetch(`/api/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    router.refresh();
  }

  async function handleDeleteFolder(id: string) {
    await fetch(`/api/folders/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <DragDropProvider
      onDragOver={(event) => {
        setItems((prev) => move(prev, event));
      }}
      onDragEnd={(event) => {
        setItems((prev) => {
          const next = move(prev, event);

          // Find which folder the dragged sprint ended up in
          const draggedId = event.operation.source?.id;
          if (draggedId) {
            const sprint = initialSprints.find((s) => s.id === draggedId);
            const originalFolder = sprint?.folderId ?? "unfiled";

            for (const [groupId, groupSprints] of Object.entries(next)) {
              const found = groupSprints.find((s) => s.id === draggedId);
              if (found && groupId !== originalFolder) {
                const newFolderId = groupId === "unfiled" ? null : groupId;
                handleMoveSprint(String(draggedId), newFolderId);
                break;
              }
            }
          }

          return next;
        });
      }}
    >
      <div className="space-y-4">
        {/* Create folder button */}
        <div className="flex items-center gap-2">
          {creatingFolder ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                  if (e.key === "Escape") setCreatingFolder(false);
                }}
                placeholder="Folder name"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
                autoFocus
              />
              <button
                onClick={handleCreateFolder}
                className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => setCreatingFolder(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreatingFolder(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 hover:text-gray-200 transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              New Folder
            </button>
          )}
        </div>

        {/* Folders */}
        {initialFolders.map((folder) => (
          <FolderDropZone
            key={folder.id}
            folder={folder}
            sprints={items[folder.id] ?? []}
            onRename={handleRenameFolder}
            onDelete={handleDeleteFolder}
          />
        ))}

        {/* Unfiled sprints */}
        {initialFolders.length > 0 && (items.unfiled?.length ?? 0) > 0 && (
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Unfiled
          </h3>
        )}
        <UnfiledDropZone sprints={items.unfiled ?? []} />

        {/* Completed sprints (not draggable) */}
        {completedSprints.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Completed
            </h3>
            <div className="space-y-3 opacity-60">
              {completedSprints.map((sprint) => (
                <SprintCard key={sprint.id} sprint={sprint} />
              ))}
            </div>
          </div>
        )}
      </div>
    </DragDropProvider>
  );
}
