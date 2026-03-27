"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type List = { id: string; name: string };

export function SprintClickUpLink({
  sprintId,
  sprintName,
  isLinked,
  onLink,
  onCreateNew,
  fetchLists,
}: {
  sprintId: string;
  sprintName: string;
  isLinked: boolean;
  onLink: (listId: string) => Promise<void>;
  onCreateNew: () => Promise<void>;
  fetchLists: () => Promise<List[]>;
}) {
  const [lists, setLists] = useState<List[]>([]);
  const [selectedList, setSelectedList] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchLists().then(setLists);
    }
  }, [open, fetchLists]);

  async function handleLinkExisting() {
    if (!selectedList) return;
    setLoading(true);
    await onLink(selectedList);
    setLoading(false);
    setOpen(false);
  }

  async function handleCreateNew() {
    setLoading(true);
    await onCreateNew();
    setLoading(false);
    setOpen(false);
  }

  if (isLinked) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Link to ClickUp
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link Sprint to ClickUp</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Select an existing ClickUp List</Label>
            <Select onValueChange={(v: string | null) => v && setSelectedList(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a list" />
              </SelectTrigger>
              <SelectContent>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleLinkExisting}
              disabled={!selectedList || loading}
              className="mt-2 w-full"
            >
              Link to Selected List
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={handleCreateNew}
            disabled={loading}
            className="w-full"
          >
            Create New List &quot;{sprintName}&quot; in ClickUp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
