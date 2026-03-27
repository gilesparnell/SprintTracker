export type ClickUpWorkspace = {
  id: string;
  name: string;
};

export type ClickUpSpace = {
  id: string;
  name: string;
};

export type ClickUpFolder = {
  id: string;
  name: string;
};

export type ClickUpList = {
  id: string;
  name: string;
  start_date?: string | null;
  due_date?: string | null;
  statuses?: { status: string; type: string; orderindex: number }[];
};

export type ClickUpTask = {
  id: string;
  name: string;
  description?: string;
  status: { status: string };
  priority?: { id: string; priority: string };
};

export type CreateTaskParams = {
  name: string;
  description?: string;
  status?: string;
  priority?: number;
};

export type CreateListParams = {
  name: string;
  content?: string;
  due_date?: number;
  start_date?: number;
};
