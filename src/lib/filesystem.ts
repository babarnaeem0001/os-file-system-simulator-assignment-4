export type AllocationMethod = "contiguous" | "linked" | "indexed";
export type AccessMode = "read" | "write";
export type RequestStatus = "granted" | "waiting" | "completed" | "resolved";

export type ProcessEntry = {
  id: string;
  name: string;
  studentId: string;
  priority: number;
  color: string;
};

export type FileEntry = {
  id: string;
  name: string;
  ownerProcessId: string;
  sizeKb: number;
  allocation: AllocationMethod;
  blocks: number[];
  indexBlock?: number;
  content: string;
  color: string;
  createdAt: number;
  modifiedAt: number;
  accessCount: number;
  averageAccessMs: number;
};

export type LockRecord = {
  fileId: string;
  mode: AccessMode;
  holders: string[];
  since: number;
};

export type AccessRequest = {
  id: string;
  processId: string;
  fileId: string;
  mode: AccessMode;
  status: RequestStatus;
  tick: number;
  waitingFor: string[];
  accessTimeMs: number;
  note: string;
};

export type EventLogEntry = {
  id: string;
  tick: number;
  type: "file" | "disk" | "lock" | "deadlock" | "system";
  message: string;
};

export type DeadlockCycle = {
  id: string;
  processes: string[];
  files: string[];
};

export type SimulationMetrics = {
  usedBlocks: number;
  freeBlocks: number;
  diskUsagePercent: number;
  largestFreeRun: number;
  freeRuns: number;
  fragmentationPercent: number;
  averageAccessMs: number;
  activeLocks: number;
  waitingRequests: number;
  completedRequests: number;
};

export type SimulationState = {
  diskSize: number;
  blockSizeKb: number;
  tick: number;
  processes: ProcessEntry[];
  files: FileEntry[];
  locks: LockRecord[];
  requests: AccessRequest[];
  eventLog: EventLogEntry[];
  deadlocks: DeadlockCycle[];
  metrics: SimulationMetrics;
};

export type SimulationAction =
  | { type: "reset" }
  | {
      type: "createFile";
      name: string;
      sizeKb: number;
      allocation: AllocationMethod;
      ownerProcessId: string;
      content: string;
    }
  | { type: "deleteFile"; fileId: string }
  | {
      type: "requestAccess";
      fileId: string;
      processId: string;
      mode: AccessMode;
      content?: string;
    }
  | { type: "releaseLocks"; processId: string }
  | { type: "resolveDeadlocks" }
  | { type: "compactDisk" }
  | { type: "loadConflictScenario" };

export type DiskCell = {
  index: number;
  fileId?: string;
  fileName?: string;
  color?: string;
  kind: "free" | "data" | "index";
};

const FILE_COLORS = [
  "#9333ea",
  "#10b981",
  "#f59e0b",
  "#0ea5e9",
  "#ef4444",
  "#14b8a6",
  "#6366f1",
  "#f97316",
];

export const PROCESS_LIST: ProcessEntry[] = [
  {
    id: "p-9061",
    name: "Hamid Saleem",
    studentId: "9061",
    priority: 1,
    color: "#9333ea",
  },
  {
    id: "p-8963",
    name: "Babar Naeem",
    studentId: "8963",
    priority: 2,
    color: "#0ea5e9",
  },
  {
    id: "p-8926",
    name: "Muhammad Sabeel Khan",
    studentId: "8926",
    priority: 3,
    color: "#10b981",
  },
  {
    id: "p-8929",
    name: "Abdul Sami",
    studentId: "8929",
    priority: 4,
    color: "#f59e0b",
  },
];

function makeId(prefix: string, tick: number) {
  return `${prefix}-${tick}-${Math.random().toString(36).slice(2, 8)}`;
}

function baseState(): SimulationState {
  return {
    diskSize: 48,
    blockSizeKb: 4,
    tick: 0,
    processes: PROCESS_LIST,
    files: [],
    locks: [],
    requests: [],
    eventLog: [],
    deadlocks: [],
    metrics: {
      usedBlocks: 0,
      freeBlocks: 48,
      diskUsagePercent: 0,
      largestFreeRun: 48,
      freeRuns: 1,
      fragmentationPercent: 0,
      averageAccessMs: 0,
      activeLocks: 0,
      waitingRequests: 0,
      completedRequests: 0,
    },
  };
}

export function createInitialState(): SimulationState {
  let state = baseState();
  state = applySimulationAction(state, {
    type: "createFile",
    name: "kernel.log",
    sizeKb: 12,
    allocation: "contiguous",
    ownerProcessId: "p-9061",
    content: "Boot sequence and file table checkpoints.",
  });
  state = applySimulationAction(state, {
    type: "createFile",
    name: "shared.cfg",
    sizeKb: 16,
    allocation: "indexed",
    ownerProcessId: "p-8963",
    content: "Shared process permissions and allocation mode.",
  });
  state = applySimulationAction(state, {
    type: "createFile",
    name: "audit.bin",
    sizeKb: 8,
    allocation: "linked",
    ownerProcessId: "p-8926",
    content: "Binary audit trail for simulated write requests.",
  });
  state.eventLog = [
    {
      id: "event-0",
      tick: state.tick,
      type: "system",
      message: "Assignment 4 file system simulator initialized.",
    },
    ...state.eventLog.slice(0, 7),
  ];
  return recalculate(state);
}

export function applySimulationAction(
  incoming: SimulationState,
  action: SimulationAction,
): SimulationState {
  if (action.type === "reset") {
    return createInitialState();
  }

  if (action.type === "loadConflictScenario") {
    return createConflictScenario();
  }

  const state = cloneState(incoming);
  state.tick += 1;

  switch (action.type) {
    case "createFile":
      return createFile(state, action);
    case "deleteFile":
      return deleteFile(state, action.fileId);
    case "requestAccess":
      return requestAccess(state, action);
    case "releaseLocks":
      return releaseLocks(state, action.processId);
    case "resolveDeadlocks":
      return resolveDeadlocks(state);
    case "compactDisk":
      return compactDisk(state);
    default:
      return recalculate(state);
  }
}

export function getDiskCells(state: SimulationState): DiskCell[] {
  const cells: DiskCell[] = Array.from({ length: state.diskSize }, (_, index) => ({
    index,
    kind: "free",
  }));

  for (const file of state.files) {
    for (const block of file.blocks) {
      cells[block] = {
        index: block,
        fileId: file.id,
        fileName: file.name,
        color: file.color,
        kind: "data",
      };
    }
    if (typeof file.indexBlock === "number") {
      cells[file.indexBlock] = {
        index: file.indexBlock,
        fileId: file.id,
        fileName: file.name,
        color: file.color,
        kind: "index",
      };
    }
  }

  return cells;
}

export function getProcessName(state: SimulationState, processId: string) {
  return state.processes.find((process) => process.id === processId)?.name ?? processId;
}

export function getFileName(state: SimulationState, fileId: string) {
  return state.files.find((file) => file.id === fileId)?.name ?? fileId;
}

function cloneState(state: SimulationState): SimulationState {
  return JSON.parse(JSON.stringify(state)) as SimulationState;
}

function createFile(
  state: SimulationState,
  action: Extract<SimulationAction, { type: "createFile" }>,
) {
  const name = sanitizeFileName(action.name);
  if (!name) {
    return withEvent(state, "file", "File creation skipped: a file name is required.");
  }

  if (state.files.some((file) => file.name.toLowerCase() === name.toLowerCase())) {
    return withEvent(state, "file", `${name} already exists in the file table.`);
  }

  const sizeKb = Math.max(1, Math.min(96, Math.round(action.sizeKb)));
  const allocation = allocateBlocks(state, sizeKb, action.allocation);
  if (!allocation) {
    return withEvent(
      state,
      "disk",
      `${name} could not be allocated with ${formatAllocation(action.allocation)}.`,
    );
  }

  const file: FileEntry = {
    id: makeId("file", state.tick),
    name,
    ownerProcessId: action.ownerProcessId,
    sizeKb,
    allocation: action.allocation,
    blocks: allocation.blocks,
    indexBlock: allocation.indexBlock,
    content: action.content || "Empty file.",
    color: FILE_COLORS[state.files.length % FILE_COLORS.length],
    createdAt: state.tick,
    modifiedAt: state.tick,
    accessCount: 0,
    averageAccessMs: 0,
  };

  state.files.push(file);
  return withEvent(
    state,
    "file",
    `${file.name} created using ${formatAllocation(file.allocation)} across ${allocation.totalBlocks} block(s).`,
  );
}

function deleteFile(state: SimulationState, fileId: string) {
  const file = state.files.find((entry) => entry.id === fileId);
  if (!file) {
    return withEvent(state, "file", "Delete skipped: file was not found.");
  }

  state.files = state.files.filter((entry) => entry.id !== fileId);
  state.locks = state.locks.filter((lock) => lock.fileId !== fileId);
  state.requests = state.requests.filter((request) => request.fileId !== fileId);

  return withEvent(state, "file", `${file.name} deleted and its disk blocks were released.`);
}

function requestAccess(
  state: SimulationState,
  action: Extract<SimulationAction, { type: "requestAccess" }>,
) {
  const file = state.files.find((entry) => entry.id === action.fileId);
  const process = state.processes.find((entry) => entry.id === action.processId);

  if (!file || !process) {
    return withEvent(state, "lock", "Access request skipped: file or process was not found.");
  }

  const blockers = getBlockingProcesses(state, action.fileId, action.processId, action.mode);
  const accessTimeMs = estimateAccessTime(state, file, action.mode);
  const request: AccessRequest = {
    id: makeId("req", state.tick),
    processId: action.processId,
    fileId: action.fileId,
    mode: action.mode,
    status: blockers.length > 0 ? "waiting" : "granted",
    tick: state.tick,
    waitingFor: blockers,
    accessTimeMs,
    note:
      blockers.length > 0
        ? `Waiting for ${blockers.map((id) => getProcessName(state, id)).join(", ")}.`
        : "Lock granted and held until release.",
  };

  state.requests.unshift(request);

  if (blockers.length > 0) {
    state = withEvent(
      state,
      "lock",
      `${process.name} is waiting to ${action.mode} ${file.name}.`,
    );
    return recalculate(state);
  }

  grantLock(state, action.fileId, action.processId, action.mode);
  touchFile(state, file.id, accessTimeMs, action.content, action.mode);

  return withEvent(
    state,
    "lock",
    `${process.name} received ${action.mode} access to ${file.name} in ${accessTimeMs} ms.`,
  );
}

function releaseLocks(state: SimulationState, processId: string) {
  const process = state.processes.find((entry) => entry.id === processId);
  if (!process) {
    return withEvent(state, "lock", "Release skipped: process was not found.");
  }

  const before = state.locks.length;
  state.locks = state.locks
    .map((lock) => ({
      ...lock,
      holders: lock.holders.filter((holder) => holder !== processId),
    }))
    .filter((lock) => lock.holders.length > 0);

  state.requests = state.requests.map((request) =>
    request.processId === processId && request.status === "granted"
      ? { ...request, status: "completed", note: "Lock released after access." }
      : request,
  );

  state = retryWaitingRequests(state);
  const released = before - state.locks.length;
  return withEvent(
    state,
    "lock",
    released > 0
      ? `${process.name} released active file lock(s).`
      : `${process.name} had no active file locks.`,
  );
}

function resolveDeadlocks(state: SimulationState) {
  state.deadlocks = detectDeadlocks(state);
  if (state.deadlocks.length === 0) {
    return withEvent(state, "deadlock", "No deadlock cycle is active.");
  }

  const cycle = state.deadlocks[0];
  const victimId = cycle.processes[cycle.processes.length - 1];
  const victim = getProcessName(state, victimId);

  state.locks = state.locks
    .map((lock) => ({
      ...lock,
      holders: lock.holders.filter((holder) => holder !== victimId),
    }))
    .filter((lock) => lock.holders.length > 0);

  state.requests = state.requests.map((request) =>
    request.processId === victimId && request.status !== "completed"
      ? {
          ...request,
          status: "resolved",
          waitingFor: [],
          note: "Preempted by deadlock recovery.",
        }
      : request,
  );

  state = retryWaitingRequests(state);
  state.deadlocks = detectDeadlocks(state);

  return withEvent(
    state,
    "deadlock",
    `Deadlock resolved by preempting ${victim} and retrying waiting requests.`,
  );
}

function compactDisk(state: SimulationState) {
  const originalFiles = [...state.files].sort((a, b) => a.createdAt - b.createdAt);
  state.files = [];
  state.locks = [];
  state.requests = state.requests.map((request) =>
    request.status === "granted" ? { ...request, status: "completed" } : request,
  );

  for (const file of originalFiles) {
    const allocation = allocateBlocks(state, file.sizeKb, file.allocation);
    if (allocation) {
      state.files.push({
        ...file,
        blocks: allocation.blocks,
        indexBlock: allocation.indexBlock,
        modifiedAt: state.tick,
      });
    }
  }

  return withEvent(state, "disk", "Disk compacted and all active locks were cleared.");
}

function createConflictScenario() {
  let state = baseState();
  state.tick = 1;

  state = createFile(state, {
    type: "createFile",
    name: "ledger.db",
    sizeKb: 12,
    allocation: "contiguous",
    ownerProcessId: "p-9061",
    content: "Ledger records owned by Hamid Saleem.",
  });
  state.tick += 1;
  state = createFile(state, {
    type: "createFile",
    name: "shared.cfg",
    sizeKb: 12,
    allocation: "indexed",
    ownerProcessId: "p-8963",
    content: "Shared configuration owned by Babar Naeem.",
  });

  const ledger = state.files.find((file) => file.name === "ledger.db");
  const shared = state.files.find((file) => file.name === "shared.cfg");

  if (ledger && shared) {
    state.tick += 1;
    state = requestAccess(state, {
      type: "requestAccess",
      fileId: ledger.id,
      processId: "p-9061",
      mode: "write",
      content: "Hamid writes ledger first.",
    });
    state.tick += 1;
    state = requestAccess(state, {
      type: "requestAccess",
      fileId: shared.id,
      processId: "p-8963",
      mode: "write",
      content: "Babar writes config first.",
    });
    state.tick += 1;
    state = requestAccess(state, {
      type: "requestAccess",
      fileId: shared.id,
      processId: "p-9061",
      mode: "write",
    });
    state.tick += 1;
    state = requestAccess(state, {
      type: "requestAccess",
      fileId: ledger.id,
      processId: "p-8963",
      mode: "write",
    });
  }

  return withEvent(
    state,
    "deadlock",
    "Two-process file access conflict scenario loaded.",
  );
}

function allocateBlocks(
  state: Pick<SimulationState, "diskSize" | "blockSizeKb" | "files">,
  sizeKb: number,
  method: AllocationMethod,
): { blocks: number[]; indexBlock?: number; totalBlocks: number } | null {
  const dataBlocks = Math.ceil(sizeKb / state.blockSizeKb);
  const occupied = new Set<number>();
  for (const file of state.files) {
    file.blocks.forEach((block) => occupied.add(block));
    if (typeof file.indexBlock === "number") {
      occupied.add(file.indexBlock);
    }
  }

  const free = Array.from({ length: state.diskSize }, (_, index) => index).filter(
    (block) => !occupied.has(block),
  );

  if (method === "contiguous") {
    const run = findFreeRun(state.diskSize, occupied, dataBlocks);
    return run ? { blocks: run, totalBlocks: run.length } : null;
  }

  if (method === "linked") {
    if (free.length < dataBlocks) {
      return null;
    }
    const spread = free.filter((_, index) => index % 2 === 0).concat(
      free.filter((_, index) => index % 2 !== 0),
    );
    return { blocks: spread.slice(0, dataBlocks), totalBlocks: dataBlocks };
  }

  if (free.length < dataBlocks + 1) {
    return null;
  }

  return {
    indexBlock: free[0],
    blocks: free.slice(1, dataBlocks + 1),
    totalBlocks: dataBlocks + 1,
  };
}

function findFreeRun(diskSize: number, occupied: Set<number>, length: number) {
  let start = 0;
  let runLength = 0;

  for (let block = 0; block < diskSize; block += 1) {
    if (occupied.has(block)) {
      runLength = 0;
      start = block + 1;
      continue;
    }

    runLength += 1;
    if (runLength === length) {
      return Array.from({ length }, (_, offset) => start + offset);
    }
  }

  return null;
}

function getBlockingProcesses(
  state: SimulationState,
  fileId: string,
  processId: string,
  mode: AccessMode,
) {
  const lock = state.locks.find((entry) => entry.fileId === fileId);
  if (!lock) {
    return [];
  }

  const otherHolders = lock.holders.filter((holder) => holder !== processId);
  if (otherHolders.length === 0 && lock.holders.includes(processId)) {
    return [];
  }

  if (mode === "read" && lock.mode === "read") {
    return [];
  }

  return otherHolders.length > 0 ? otherHolders : lock.holders;
}

function grantLock(
  state: SimulationState,
  fileId: string,
  processId: string,
  mode: AccessMode,
) {
  const existing = state.locks.find((lock) => lock.fileId === fileId);
  if (!existing) {
    state.locks.push({ fileId, mode, holders: [processId], since: state.tick });
    return;
  }

  if (!existing.holders.includes(processId)) {
    existing.holders.push(processId);
  }

  if (mode === "write") {
    existing.mode = "write";
  }
}

function touchFile(
  state: SimulationState,
  fileId: string,
  accessTimeMs: number,
  content: string | undefined,
  mode: AccessMode,
) {
  const file = state.files.find((entry) => entry.id === fileId);
  if (!file) {
    return;
  }

  file.accessCount += 1;
  file.averageAccessMs = Math.round(
    (file.averageAccessMs * (file.accessCount - 1) + accessTimeMs) / file.accessCount,
  );

  if (mode === "write") {
    file.content = content || `${file.content}\nUpdated at tick ${state.tick}.`;
    file.modifiedAt = state.tick;
  }
}

function retryWaitingRequests(state: SimulationState) {
  const waiting = [...state.requests]
    .filter((request) => request.status === "waiting")
    .sort((a, b) => a.tick - b.tick);

  for (const request of waiting) {
    const blockers = getBlockingProcesses(state, request.fileId, request.processId, request.mode);
    const original = state.requests.find((entry) => entry.id === request.id);
    if (!original) {
      continue;
    }

    if (blockers.length === 0) {
      original.status = "granted";
      original.waitingFor = [];
      original.note = "Granted after lock release.";
      grantLock(state, request.fileId, request.processId, request.mode);
      const file = state.files.find((entry) => entry.id === request.fileId);
      if (file) {
        touchFile(state, file.id, request.accessTimeMs, undefined, request.mode);
      }
    } else {
      original.waitingFor = blockers;
      original.note = `Waiting for ${blockers
        .map((id) => getProcessName(state, id))
        .join(", ")}.`;
    }
  }

  return recalculate(state);
}

function detectDeadlocks(state: SimulationState): DeadlockCycle[] {
  const edges = new Map<string, Set<string>>();
  const filesByProcess = new Map<string, Set<string>>();

  for (const request of state.requests.filter((entry) => entry.status === "waiting")) {
    if (!edges.has(request.processId)) {
      edges.set(request.processId, new Set());
    }
    if (!filesByProcess.has(request.processId)) {
      filesByProcess.set(request.processId, new Set());
    }
    filesByProcess.get(request.processId)?.add(request.fileId);

    for (const blocker of request.waitingFor) {
      edges.get(request.processId)?.add(blocker);
    }
  }

  const cycles: DeadlockCycle[] = [];
  const stack: string[] = [];
  const visited = new Set<string>();

  function visit(processId: string) {
    if (stack.includes(processId)) {
      const cycle = stack.slice(stack.indexOf(processId));
      const key = cycle.sort().join("|");
      if (!cycles.some((entry) => entry.id === key)) {
        const files = Array.from(
          new Set(cycle.flatMap((id) => Array.from(filesByProcess.get(id) ?? []))),
        );
        cycles.push({ id: key, processes: cycle, files });
      }
      return;
    }

    if (visited.has(processId)) {
      return;
    }

    visited.add(processId);
    stack.push(processId);
    for (const next of edges.get(processId) ?? []) {
      visit(next);
    }
    stack.pop();
  }

  for (const processId of edges.keys()) {
    visit(processId);
  }

  return cycles;
}

function estimateAccessTime(state: SimulationState, file: FileEntry, mode: AccessMode) {
  const base = file.allocation === "contiguous" ? 8 : file.allocation === "indexed" ? 13 : 18;
  const traversal = file.allocation === "linked" ? file.blocks.length * 4 : file.blocks.length * 2;
  const writePenalty = mode === "write" ? 7 : 0;
  const fragmentationPenalty = Math.round(state.metrics.fragmentationPercent / 8);
  return base + traversal + writePenalty + fragmentationPenalty;
}

function withEvent(
  state: SimulationState,
  type: EventLogEntry["type"],
  message: string,
) {
  state.eventLog = [
    { id: makeId("event", state.tick), tick: state.tick, type, message },
    ...state.eventLog,
  ].slice(0, 12);
  return recalculate(state);
}

function recalculate(state: SimulationState): SimulationState {
  const cells = getDiskCells(state);
  const usedBlocks = cells.filter((cell) => cell.kind !== "free").length;
  const freeBlocks = state.diskSize - usedBlocks;
  const freeRunsData = getFreeRuns(cells);
  const largestFreeRun = freeRunsData.length > 0 ? Math.max(...freeRunsData) : 0;
  const fragmentationPercent =
    freeBlocks === 0 ? 0 : Math.round((1 - largestFreeRun / freeBlocks) * 100);
  const completedRequests = state.requests.filter(
    (request) => request.status === "completed" || request.status === "granted",
  ).length;
  const accessTimes = state.requests
    .filter((request) => request.status !== "waiting")
    .map((request) => request.accessTimeMs);

  state.deadlocks = detectDeadlocks(state);
  state.metrics = {
    usedBlocks,
    freeBlocks,
    diskUsagePercent: Math.round((usedBlocks / state.diskSize) * 100),
    largestFreeRun,
    freeRuns: freeRunsData.length,
    fragmentationPercent,
    averageAccessMs:
      accessTimes.length === 0
        ? 0
        : Math.round(accessTimes.reduce((sum, value) => sum + value, 0) / accessTimes.length),
    activeLocks: state.locks.reduce((sum, lock) => sum + lock.holders.length, 0),
    waitingRequests: state.requests.filter((request) => request.status === "waiting").length,
    completedRequests,
  };

  return state;
}

function getFreeRuns(cells: DiskCell[]) {
  const runs: number[] = [];
  let length = 0;

  for (const cell of cells) {
    if (cell.kind === "free") {
      length += 1;
    } else if (length > 0) {
      runs.push(length);
      length = 0;
    }
  }

  if (length > 0) {
    runs.push(length);
  }

  return runs;
}

function sanitizeFileName(name: string) {
  return name.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 32);
}

function formatAllocation(method: AllocationMethod) {
  if (method === "contiguous") {
    return "Contiguous Allocation";
  }
  if (method === "linked") {
    return "Linked Allocation";
  }
  return "Indexed Allocation";
}
