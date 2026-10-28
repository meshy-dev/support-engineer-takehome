import { readFileSync } from "node:fs";

export type Role = "owner" | "admin" | "member";

export type Team = { id: string; name: string };

export type Member = {
  teamId: string;
  userId: string;
  email: string;
  role: Role;
  status: "active" | "removed";
  removedAt?: string;
};

export type ApiKey = {
  key: string;
  teamId: string;
  createdBy: string;
  createdAt: string;
  revokedAt?: string;
};

export type Task = {
  id: string;
  teamId: string;
  createdBy: string;
  type: "text-to-3d" | "remesh";
  input: Record<string, unknown>;
  createdAt: string;
};

type Seed = { teams: Team[]; members: Member[]; apiKeys: ApiKey[]; tasks: Task[] };

// Raised by the storage layer. Messages come straight from the database driver.
export class DbError extends Error {}

// Columns of the tasks table that the database stores as a 32-bit integer.
const INTEGER_COLUMNS = ["target_polycount"];
const INT32_MAX = 2_147_483_647;

// In-memory stand-in for the production Postgres database.
export class Store {
  teams: Team[];
  members: Member[];
  apiKeys: ApiKey[];
  tasks: Map<string, Task>;

  constructor(seed: Seed) {
    this.teams = seed.teams;
    this.members = seed.members;
    this.apiKeys = seed.apiKeys;
    this.tasks = new Map(seed.tasks.map((task) => [task.id, task]));
  }

  findApiKey(key: string): ApiKey | undefined {
    return this.apiKeys.find((apiKey) => apiKey.key === key);
  }

  findMember(teamId: string, userId: string): Member | undefined {
    return this.members.find((m) => m.teamId === teamId && m.userId === userId);
  }

  listMembers(teamId: string): Member[] {
    return this.members.filter((m) => m.teamId === teamId);
  }

  removeMember(teamId: string, userId: string): void {
    const member = this.findMember(teamId, userId);
    if (member) {
      member.status = "removed";
      member.removedAt = new Date().toISOString();
    }
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  insertTask(task: Task): void {
    for (const column of INTEGER_COLUMNS) {
      const value = task.input[column];
      if (value === undefined) continue;
      const text = String(value);
      if (!/^-?\d+$/.test(text)) {
        throw new DbError(`pq: invalid input syntax for type integer: "${text}"`);
      }
      if (Math.abs(Number(text)) > INT32_MAX) {
        throw new DbError(`pq: value "${text}" is out of range for type integer`);
      }
    }
    this.tasks.set(task.id, task);
  }
}

export function loadSeed(): Store {
  const raw = readFileSync(new URL("../data/seed.json", import.meta.url), "utf8");
  return new Store(JSON.parse(raw) as Seed);
}
