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
  saveClickUpToken,
} from "@/lib/actions/clickup-config";
import {
  CheckCircle2Icon,
  EyeIcon,
  EyeOffIcon,
  KeyIcon,
  LinkIcon,
  Loader2Icon,
  XCircleIcon,
} from "lucide-react";

type Workspace = { id: string; name: string };
type Space = { id: string; name: string };
type Folder = { id: string; name: string };

export function ClickUpHierarchyBrowser({
  savedConfig,
  hasToken,
}: {
  savedConfig?: {
    spaceId: string;
    spaceName: string;
    folderId: string;
    folderName: string;
  } | null;
  hasToken: boolean;
}) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(hasToken);
  const [savingToken, setSavingToken] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [selectedSpace, setSelectedSpace] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [selectedWorkspaceName, setSelectedWorkspaceName] = useState("");
  const [selectedSpaceName, setSelectedSpaceName] = useState("");
  const [selectedFolderName, setSelectedFolderName] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSaveToken() {
    if (!token.trim()) return;
    setSavingToken(true);
    setError("");
    await saveClickUpToken(token.trim());
    setTokenSaved(true);
    setSavingToken(false);
    setToken("");
  }

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
    setSelectedWorkspaceName(workspaces.find((w) => w.id === workspaceId)?.name ?? workspaceId);
    setSpaces([]);
    setFolders([]);
    setSelectedSpace("");
    setSelectedFolder("");
    setSelectedSpaceName("");
    setSelectedFolderName("");
    setSaved(false);

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
    setSelectedSpaceName(spaces.find((s) => s.id === spaceId)?.name ?? spaceId);
    setFolders([]);
    setSelectedFolder("");
    setSelectedFolderName("");
    setSaved(false);

    const result = await getClickUpFolders(spaceId);
    if (result.success && result.folders) {
      setFolders(result.folders);
    } else {
      setError(result.error ?? "Failed to load folders");
    }
  }

  function handleFolderSelect(folderId: string | null) {
    if (!folderId) return;
    setSelectedFolder(folderId);
    setSelectedFolderName(folders.find((f) => f.id === folderId)?.name ?? folderId);
    setSaved(false);
  }

  async function handleSave() {
    const space = spaces.find((s) => s.id === selectedSpace);
    const folder = folders.find((f) => f.id === selectedFolder);
    if (!space || !folder) return;

    setSaving(true);
    await saveClickUpConfig({
      spaceId: space.id,
      spaceName: space.name,
      folderId: folder.id,
      folderName: folder.name,
    });
    setSaving(false);
    setSaved(true);
    setStatus("");
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

      {/* Step 1: API Token */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-1">Step 1: Enter your API token</h4>
        <p className="text-sm text-gray-400 mb-3">
          You can generate a token in ClickUp under Settings &rarr; Apps.
        </p>

        {tokenSaved ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-green-900/20 border border-green-500/30 rounded-xl px-4 py-2.5 flex-1">
              <KeyIcon className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">API token saved</span>
            </div>
            <button
              onClick={() => setTokenSaved(false)}
              className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-2.5"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="pk_..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showToken ? (
                  <EyeOffIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            </div>
            <button
              onClick={handleSaveToken}
              disabled={!token.trim() || savingToken}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {savingToken ? (
                <Loader2Icon className="w-4 h-4 animate-spin" />
              ) : (
                "Save"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Step 2: Test Connection */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-1">Step 2: Test connection</h4>
        <p className="text-sm text-gray-400 mb-3">
          Verify the token works and load your workspaces.
        </p>
        <button
          onClick={handleTestConnection}
          disabled={loading || !tokenSaved}
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
          <h4 className="text-sm font-medium text-gray-300">Step 3: Choose your root folder</h4>
          <p className="text-sm text-gray-500">
            Navigate to the folder where you want sprint Lists to live. In ClickUp, this maps to Workspace &rarr; Space &rarr; Folder.
          </p>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Workspace
            </label>
            <Select onValueChange={handleWorkspaceSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select workspace">
                  {selectedWorkspaceName || "Select workspace"}
                </SelectValue>
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
                  <SelectValue placeholder="Select space">
                    {selectedSpaceName || "Select space"}
                  </SelectValue>
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
              <Select onValueChange={handleFolderSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select folder">
                    {selectedFolderName || "Select folder"}
                  </SelectValue>
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

          {selectedFolder && !saved && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors"
            >
              {saving ? (
                <>
                  <Loader2Icon className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Root Folder"
              )}
            </button>
          )}

          {saved && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
              <CheckCircle2Icon className="w-4 h-4 text-green-400 shrink-0" />
              <p className="text-sm text-green-400">
                Saved! Sprints will sync to{" "}
                <span className="font-medium text-white">{selectedSpaceName}</span>
                {" / "}
                <span className="font-medium text-white">{selectedFolderName}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
