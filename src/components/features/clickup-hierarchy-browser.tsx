"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  testClickUpConnection,
  getClickUpSpaces,
  getClickUpFolders,
  saveClickUpConfig,
} from "@/lib/actions/clickup-config";

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

  async function handleWorkspaceSelect(workspaceId: string) {
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

  async function handleSpaceSelect(spaceId: string) {
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
    <Card>
      <CardHeader>
        <CardTitle>ClickUp Integration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {savedConfig && (
          <div className="p-3 rounded-md bg-muted text-sm">
            <strong>Current config:</strong> {savedConfig.spaceName} /{" "}
            {savedConfig.folderName}
          </div>
        )}

        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Set your CLICKUP_API_TOKEN in .env.local, then test the connection.
          </p>
          <Button onClick={handleTestConnection} disabled={loading}>
            {loading ? "Testing..." : "Test Connection"}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {status && (
          <p className="text-sm text-green-600">{status}</p>
        )}

        {workspaces.length > 0 && (
          <div>
            <Label>Workspace</Label>
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
        )}

        {spaces.length > 0 && (
          <div>
            <Label>Space</Label>
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
          <div>
            <Label>Folder (Sprint Folder)</Label>
            <Select onValueChange={setSelectedFolder}>
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
          <Button onClick={handleSave}>Save Configuration</Button>
        )}
      </CardContent>
    </Card>
  );
}
