"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  FilePlus2,
  FileText,
  HardDrive,
  LockKeyhole,
  Play,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UnlockKeyhole,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  getDiskCells,
  getFileName,
  getProcessName,
  type AccessMode,
  type AllocationMethod,
  type SimulationAction,
  type SimulationState,
} from "@/lib/filesystem";

type Props = {
  initialState: SimulationState;
};

const allocationLabels: Record<AllocationMethod, string> = {
  contiguous: "Contiguous",
  linked: "Linked",
  indexed: "Indexed",
};

const methodNotes: Record<AllocationMethod, string> = {
  contiguous: "Fast sequential reads; needs one free run.",
  linked: "Flexible placement; pointer traversal cost.",
  indexed: "Direct lookup through an index block.",
};

const navItems = [
  { id: "overview", label: "Overview" },
  { id: "disk", label: "Disk" },
  { id: "files", label: "Files" },
  { id: "conflicts", label: "Conflicts" },
] as const;

export default function FileSystemDashboard({ initialState }: Props) {
  const [state, setState] = useState(initialState);
  const [activeView, setActiveView] = useState<(typeof navItems)[number]["id"]>("overview");
  const [pending, setPending] = useState(false);
  const [backendStatus, setBackendStatus] = useState("Backend ready");

  const [newFileName, setNewFileName] = useState("trace.log");
  const [newFileSize, setNewFileSize] = useState(12);
  const [newFileMethod, setNewFileMethod] = useState<AllocationMethod>("contiguous");
  const [newFileOwner, setNewFileOwner] = useState(initialState.processes[0]?.id ?? "");
  const [newFileContent, setNewFileContent] = useState("Process trace payload.");

  const [selectedFile, setSelectedFile] = useState(initialState.files[0]?.id ?? "");
  const [selectedProcess, setSelectedProcess] = useState(initialState.processes[0]?.id ?? "");
  const [accessMode, setAccessMode] = useState<AccessMode>("read");
  const [writeContent, setWriteContent] = useState("Updated through a synchronized write lock.");

  const diskCells = useMemo(() => getDiskCells(state), [state]);
  const selectedFileEntry = state.files.find((file) => file.id === selectedFile) ?? state.files[0];

  async function dispatch(action: SimulationAction) {
    setPending(true);
    setBackendStatus("Syncing with Vercel route handler");

    try {
      const response = await fetch("/api/filesystem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, action }),
      });

      if (!response.ok) {
        throw new Error("Simulation request failed");
      }

      const nextState = (await response.json()) as SimulationState;
      setState(nextState);
      setSelectedFile((current) => nextState.files.find((file) => file.id === current)?.id ?? nextState.files[0]?.id ?? "");
      setBackendStatus("Backend applied operation");
    } catch {
      setBackendStatus("Backend request failed");
    } finally {
      setPending(false);
    }
  }

  function createFile() {
    dispatch({
      type: "createFile",
      name: newFileName,
      sizeKb: newFileSize,
      allocation: newFileMethod,
      ownerProcessId: newFileOwner,
      content: newFileContent,
    });
  }

  function requestAccess(modeOverride?: AccessMode) {
    const fileId = selectedFileEntry?.id;
    if (!fileId) {
      return;
    }

    const mode = modeOverride ?? accessMode;
    dispatch({
      type: "requestAccess",
      fileId,
      processId: selectedProcess,
      mode,
      content: mode === "write" ? writeContent : undefined,
    });
  }

  const waitingList = state.requests.filter((request) => request.status === "waiting");
  const activeLocks = state.locks;

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-white/86 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-lg shadow-purple-200">
              <HardDrive size={22} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--muted)]">
                CS313 Assignment 4
              </p>
              <h1 className="text-xl font-bold sm:text-2xl">OS File System Simulator</h1>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2" aria-label="Dashboard views">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeView === item.id
                    ? "bg-[var(--primary)] text-white shadow-md shadow-purple-200"
                    : "border border-[var(--line)] bg-white text-[var(--muted)] hover:border-purple-200 hover:text-[var(--primary)]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-2xl border border-[var(--line)] bg-white/88 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--primary)]">
                  File operations, allocation, and synchronization
                </p>
                <h2 className="mt-1 max-w-3xl text-2xl font-bold leading-tight sm:text-3xl">
                  Assignment 4 simulator with process-controlled file access
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => dispatch({ type: "loadConflictScenario" })}
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
                >
                  <Zap size={16} aria-hidden="true" />
                  Load conflict
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "reset" })}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:border-purple-200"
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  Reset
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Disk used" value={`${state.metrics.diskUsagePercent}%`} tone="purple" />
              <MetricCard label="Free blocks" value={state.metrics.freeBlocks} tone="green" />
              <MetricCard label="Fragmentation" value={`${state.metrics.fragmentationPercent}%`} tone="amber" />
              <MetricCard label="Waiting requests" value={state.metrics.waitingRequests} tone="red" />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-white/88 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--muted)]">Backend</p>
                <h2 className="mt-1 text-xl font-bold">Vercel route</h2>
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                  backendStatus.includes("failed")
                    ? "bg-red-50 text-red-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {backendStatus.includes("failed") ? (
                  <AlertTriangle size={14} aria-hidden="true" />
                ) : (
                  <CheckCircle2 size={14} aria-hidden="true" />
                )}
                {pending ? "Working" : backendStatus}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <StatusLine label="API path" value="/api/filesystem" />
              <StatusLine label="Tick" value={state.tick} />
              <StatusLine label="Active locks" value={state.metrics.activeLocks} />
              <StatusLine label="Avg access" value={`${state.metrics.averageAccessMs} ms`} />
            </div>
          </div>
        </section>

        {activeView === "overview" && (
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel title="Create File" icon={<FilePlus2 size={18} aria-hidden="true" />}>
              <div className="grid gap-4 sm:grid-cols-2">
                <LabelledInput label="Name">
                  <input
                    value={newFileName}
                    onChange={(event) => setNewFileName(event.target.value)}
                    className="field"
                  />
                </LabelledInput>
                <LabelledInput label="Size KB">
                  <input
                    type="number"
                    min={1}
                    max={96}
                    value={newFileSize}
                    onChange={(event) => setNewFileSize(Number(event.target.value))}
                    className="field"
                  />
                </LabelledInput>
                <LabelledInput label="Owner process">
                  <select
                    value={newFileOwner}
                    onChange={(event) => setNewFileOwner(event.target.value)}
                    className="field"
                  >
                    {state.processes.map((process) => (
                      <option key={process.id} value={process.id}>
                        {process.name} ({process.studentId})
                      </option>
                    ))}
                  </select>
                </LabelledInput>
                <LabelledInput label="Allocation">
                  <select
                    value={newFileMethod}
                    onChange={(event) => setNewFileMethod(event.target.value as AllocationMethod)}
                    className="field"
                  >
                    {Object.entries(allocationLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </LabelledInput>
              </div>
              <LabelledInput label="Content">
                <textarea
                  value={newFileContent}
                  onChange={(event) => setNewFileContent(event.target.value)}
                  className="field min-h-24 resize-none"
                />
              </LabelledInput>
              <button
                type="button"
                onClick={createFile}
                disabled={pending}
                className="action-primary"
              >
                <FilePlus2 size={17} aria-hidden="true" />
                Create file
              </button>
            </Panel>

            <Panel title="Process File Access" icon={<LockKeyhole size={18} aria-hidden="true" />}>
              <div className="grid gap-4 sm:grid-cols-3">
                <LabelledInput label="Process">
                  <select
                    value={selectedProcess}
                    onChange={(event) => setSelectedProcess(event.target.value)}
                    className="field"
                  >
                    {state.processes.map((process) => (
                      <option key={process.id} value={process.id}>
                        {process.name}
                      </option>
                    ))}
                  </select>
                </LabelledInput>
                <LabelledInput label="File">
                  <select
                    value={selectedFileEntry?.id ?? ""}
                    onChange={(event) => setSelectedFile(event.target.value)}
                    className="field"
                  >
                    {state.files.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.name}
                      </option>
                    ))}
                  </select>
                </LabelledInput>
                <LabelledInput label="Mode">
                  <select
                    value={accessMode}
                    onChange={(event) => setAccessMode(event.target.value as AccessMode)}
                    className="field"
                  >
                    <option value="read">Read</option>
                    <option value="write">Write</option>
                  </select>
                </LabelledInput>
              </div>
              <LabelledInput label="Write payload">
                <textarea
                  value={writeContent}
                  onChange={(event) => setWriteContent(event.target.value)}
                  className="field min-h-20 resize-none"
                />
              </LabelledInput>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => requestAccess("read")}
                  disabled={pending || !selectedFileEntry}
                  className="action-secondary"
                >
                  <FileText size={17} aria-hidden="true" />
                  Read
                </button>
                <button
                  type="button"
                  onClick={() => requestAccess("write")}
                  disabled={pending || !selectedFileEntry}
                  className="action-primary"
                >
                  <Play size={17} aria-hidden="true" />
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "releaseLocks", processId: selectedProcess })}
                  disabled={pending}
                  className="action-secondary"
                >
                  <UnlockKeyhole size={17} aria-hidden="true" />
                  Release locks
                </button>
              </div>
            </Panel>
          </section>
        )}

        {activeView === "disk" && (
          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Panel title="Disk Block Map" icon={<HardDrive size={18} aria-hidden="true" />}>
              <div className="disk-grid" aria-label="Disk block allocation map">
                {diskCells.map((cell) => (
                  <div
                    key={cell.index}
                    className={`disk-cell ${cell.kind === "free" ? "disk-free" : ""}`}
                    style={cell.color ? { "--cell-color": cell.color } as React.CSSProperties : undefined}
                    title={
                      cell.kind === "free"
                        ? `Block ${cell.index}: free`
                        : `Block ${cell.index}: ${cell.fileName} ${cell.kind}`
                    }
                  >
                    <span>{cell.index}</span>
                    {cell.kind === "index" && <strong>I</strong>}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => dispatch({ type: "compactDisk" })}
                  disabled={pending}
                  className="action-primary"
                >
                  <Database size={17} aria-hidden="true" />
                  Compact disk
                </button>
              </div>
            </Panel>

            <Panel title="Allocation Techniques" icon={<Database size={18} aria-hidden="true" />}>
              <div className="grid gap-3">
                {(Object.keys(allocationLabels) as AllocationMethod[]).map((method) => {
                  const files = state.files.filter((file) => file.allocation === method);
                  return (
                    <div key={method} className="rounded-xl border border-[var(--line)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-bold">{allocationLabels[method]}</h3>
                        <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-[var(--primary)]">
                          {files.length} file{files.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--muted)]">{methodNotes[method]}</p>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </section>
        )}

        {activeView === "files" && (
          <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <Panel title="File Table" icon={<FileText size={18} aria-hidden="true" />}>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Owner</th>
                      <th>Allocation</th>
                      <th>Blocks</th>
                      <th>Avg access</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.files.map((file) => (
                      <tr key={file.id}>
                        <td>
                          <span className="inline-flex items-center gap-2 font-semibold">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: file.color }} />
                            {file.name}
                          </span>
                        </td>
                        <td>{getProcessName(state, file.ownerProcessId)}</td>
                        <td>{allocationLabels[file.allocation]}</td>
                        <td>
                          {typeof file.indexBlock === "number" ? `I:${file.indexBlock} ` : ""}
                          {file.blocks.join(", ")}
                        </td>
                        <td>{file.averageAccessMs} ms</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => dispatch({ type: "deleteFile", fileId: file.id })}
                            className="icon-button"
                            title={`Delete ${file.name}`}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Selected Content" icon={<FileText size={18} aria-hidden="true" />}>
              {selectedFileEntry ? (
                <div className="rounded-xl border border-[var(--line)] bg-zinc-50 p-4">
                  <p className="font-semibold">{selectedFileEntry.name}</p>
                  <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-3 font-mono text-sm text-zinc-700">
                    {selectedFileEntry.content}
                  </pre>
                </div>
              ) : (
                <EmptyState label="No file selected" />
              )}
            </Panel>
          </section>
        )}

        {activeView === "conflicts" && (
          <section className="grid gap-6 xl:grid-cols-2">
            <Panel title="Locks and Waiting Queue" icon={<LockKeyhole size={18} aria-hidden="true" />}>
              <div className="grid gap-4">
                <div>
                  <h3 className="text-sm font-bold uppercase text-[var(--muted)]">Active locks</h3>
                  <div className="mt-2 grid gap-2">
                    {activeLocks.length > 0 ? (
                      activeLocks.map((lock) => (
                        <div key={lock.fileId} className="rounded-xl border border-[var(--line)] p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold">{getFileName(state, lock.fileId)}</span>
                            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold uppercase">
                              {lock.mode}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-[var(--muted)]">
                            Held by {lock.holders.map((id) => getProcessName(state, id)).join(", ")}
                          </p>
                        </div>
                      ))
                    ) : (
                      <EmptyState label="No active locks" />
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase text-[var(--muted)]">Waiting requests</h3>
                  <div className="mt-2 grid gap-2">
                    {waitingList.length > 0 ? (
                      waitingList.map((request) => (
                        <div key={request.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="font-semibold">
                            {getProcessName(state, request.processId)} waits for {getFileName(state, request.fileId)}
                          </p>
                          <p className="mt-1 text-sm text-amber-800">{request.note}</p>
                        </div>
                      ))
                    ) : (
                      <EmptyState label="Queue is clear" />
                    )}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Deadlock Resolution" icon={<ShieldCheck size={18} aria-hidden="true" />}>
              <div
                className={`rounded-2xl border p-5 ${
                  state.deadlocks.length > 0
                    ? "border-red-200 bg-red-50"
                    : "border-emerald-200 bg-emerald-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {state.deadlocks.length > 0 ? (
                    <AlertTriangle className="text-red-600" size={24} aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="text-emerald-600" size={24} aria-hidden="true" />
                  )}
                  <div>
                    <p className="font-bold">
                      {state.deadlocks.length > 0 ? "Deadlock detected" : "No deadlock detected"}
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {state.deadlocks.length > 0
                        ? state.deadlocks
                            .map((cycle) => cycle.processes.map((id) => getProcessName(state, id)).join(" -> "))
                            .join(", ")
                        : "Wait-for graph has no cycle."}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => dispatch({ type: "resolveDeadlocks" })}
                disabled={pending}
                className="action-primary"
              >
                <ShieldCheck size={17} aria-hidden="true" />
                Resolve deadlock
              </button>
            </Panel>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Panel title="Team Processes" icon={<Activity size={18} aria-hidden="true" />}>
            <div className="grid gap-3 sm:grid-cols-2">
              {state.processes.map((process) => (
                <div key={process.id} className="rounded-xl border border-[var(--line)] p-4">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: process.color }} />
                    <div>
                      <p className="font-bold">{process.name}</p>
                      <p className="text-sm text-[var(--muted)]">ID {process.studentId}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Event Log" icon={<Activity size={18} aria-hidden="true" />}>
            <div className="grid gap-2">
              {state.eventLog.map((event) => (
                <div key={event.id} className="flex gap-3 rounded-xl border border-[var(--line)] p-3">
                  <span className="mt-0.5 rounded-full bg-purple-50 px-2 py-1 font-mono text-xs font-bold text-[var(--primary)]">
                    T{event.tick}
                  </span>
                  <p className="text-sm text-zinc-700">{event.message}</p>
                </div>
              ))}
            </div>
          </Panel>
        </section>
      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "purple" | "green" | "amber" | "red";
}) {
  return (
    <div className={`metric-card metric-${tone}`}>
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-zinc-50 p-3">
      <p className="text-xs font-semibold uppercase text-[var(--muted)]">{label}</p>
      <p className="mt-1 truncate font-mono text-sm font-bold">{value}</p>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white/90 p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-[var(--primary)]">
          {icon}
        </span>
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function LabelledInput({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-zinc-700">
      {label}
      {children}
    </label>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--line)] bg-zinc-50 p-4 text-sm font-semibold text-[var(--muted)]">
      {label}
    </div>
  );
}
