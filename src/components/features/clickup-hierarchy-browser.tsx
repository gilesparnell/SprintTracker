"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  testClickUpConnection,
  getClickUpSpaces,
  getClickUpFolders,
  saveClickUpConfig,
} from "@/lib/actions/clickup-config";
import {
  CheckCircle2Icon,
  LinkIcon,
  Loader2Icon,
  XCircleIcon,
} from "lucide-react";

type Workspace = { id: string; name: string };
type Space = { id: string; name: string };
type Folder = { id: string; name: string };

export function ClickUpHierarchyBrowser({
  savedConfig,
}: {
  savedConfig?: {
    spaceId: string;
    spaceName: string;
    folderId: string;
    folderName: string;
  } | null;
}) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [selectedSpace, setSelectedSpace] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleTestConnection() {
    setLoading(true);
    setError("");
    const result = await testClickUpConnection();
    setLoading(false);

    if (result.success && result.workspaces) {
      setWorkspaces(result.workspaces);
      setStatus(
        `Connected! Found ${result.workspaces.length} workspace(s).`
      );
    } else {
      setError(result.error ?? "Connection failed");
    }
  }

  async function handleWorkspaceSelect(workspaceId: string | null) {
    if (!workspaceId) return;
    setSelectedWorkspace(workspaceId);
    setSpaces([]);
    setFolders([]);
    setSelectedSpace("");
    setSelectedFolder("");

    const result = await getClickUpSpaces(workspaceId);
    if (result.success && result.spaces) {
      setSpaces(result.spaces);
    } else {
      setError(result.error ?? "Failed to load spaces");
    }
  }

  async function handleSpaceSelect(spaceId: string | null) {
    if (!spaceId) return;
    setSelectedSpace(spaceId);
    setFolders([]);
    setSelectedFolder("");

    const result = await getClickUpFolders(spaceId);
    if (result.success && result.folders) {
      setFolders(result.folders);
    } else {
      setError(result.error ?? "Failed to load folders");
    }
  }

  async function handleSave() {
    const space = spaces.find((s) => s.id === selectedSpace);
    const folder = folders.find((f) => f.id === selectedFolder);
    if (!space || !folder) return;

    await saveClickUpConfig({
      spaceId: space.id,
      spaceName: space.name,
      folderId: folder.id,
      folderName: folder.name,
    });
    setStatus("Configuration saved!");
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-green-900/20 rounded-xl flex items-center justify-center">
          <LinkIcon className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">ClickUp Connection</h3>
          <p className="text-sm text-gray-400">
            Choose the root folder where sprint Lists will be created
          </p>
        </div>
      </div>

      {savedConfig && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2Icon className="w-4 h-4 text-green-400 shrink-0" />
            <p className="text-sm text-green-400">
              Sprints will sync to{" "}
              <span className="font-medium text-white">{savedConfig.spaceName}</span>
              {" / "}
              <span className="font-medium text-white">{savedConfig.folderName}</span>
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Each sprint you link will appear as a new List inside this folder.
          </p>
        </div>
      )}

      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-1">Step 1: Connect to ClickUp</h4>
        <p className="text-sm text-gray-400 mb-3">
          Add your{" "}
          <code className="text-xs bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded-lg font-mono text-green-400">
            CLICKUP_API_TOKEN
          </code>{" "}
          to{" "}
          <code className="text-xs bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded-lg font-mono text-gray-300">
            .env.local
          </code>
          , then test the connection. You can generate a token in ClickUp under Settings &rarr; Apps.
        </p>
        <button
          onClick={handleTestConnection}
          disabled={loading}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          {loading ? (
            <>
              <Loader2Icon className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : savedConfig ? (
            "Reconnect"
          ) : (
            "Test Connection"
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
          <XCircleIcon className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      {status && !error && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle2Icon className="w-4 h-4 text-green-400 shrink-0" />
          <p className="text-sm text-green-400">{status}</p>
        </div>
      )}

      {workspaces.length > 0 && (
        <div className="space-y-4 border-t border-gray-800 pt-6">
          <h4 className="text-sm font-medium text-gray-300">Step 2: Choose your root folder</h4>
          <p className="text-sm text-gray-500">
            Navigate to the folder where you want sprint Lists to live. In ClickUp, this maps to Workspace &rarr; Space &rarr; Folder.
          </p>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Workspace
            </label>
            <Select onValueChange={handleWorkspaceSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {spaces.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Space
              </label>
              <Select onValueChange={handleSpaceSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select space" />
                </SelectTrigger>
                <SelectContent>
                  {spaces.map((space) => (
                    <SelectItem key={space.id} value={space.id}>
                      {space.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {folders.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Root Folder
              </label>
              <p className="text-xs text-gray-500">
                This is the parent folder. Each sprint you link will create a new List inside it.
              </p>
              <Select onValueChange={(v: string | null) => v && setSelectedFolder(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedFolder && (
            <button
              onClick={handleSave}
              className="w-full bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors"
            >
              Save Root Folder
            </button>
          )}
        </div>
      )}
    </div>
  );
}
