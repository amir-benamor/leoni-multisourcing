import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

export type TaskStatus = "TODO" | "ONGOING" | "DONE";
export type TaskOwner = "Engineering" | "Procurement" | "Program" | "Quality" | "Customer";

export type TaskItem = {
  id: number;
  title: string;
  note?: string;
  dueDate?: string;
  status: TaskStatus;
  owner: TaskOwner;
};

type StatusFilter = "all" | "todo" | "ongoing" | "done";

interface ActionTodoListProps {
  msNumber: string;
  initialTasks?: TaskItem[];
  onTasksChange?: (tasks: TaskItem[]) => void;
}

const STATUS_ORDER: TaskStatus[] = ["TODO", "ONGOING", "DONE"];
const OWNERS: TaskOwner[] = ["Engineering", "Procurement", "Program", "Quality", "Customer"];

function readTasks(msNumber: string): TaskItem[] {
  if (typeof window === "undefined") return [];
  const key = `ASAP_BC_TASKS_${msNumber}`;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => typeof entry === "object" && entry !== null)
      .map((entry: any) => ({
        id: typeof entry.id === "number" ? entry.id : Date.now(),
        title: entry.title || "",
        note: entry.note || undefined,
        dueDate: entry.dueDate || entry.due_date || undefined,
        status: (entry.status && STATUS_ORDER.includes(entry.status) ? entry.status : "TODO") as TaskStatus,
        owner: (entry.owner && OWNERS.includes(entry.owner) ? entry.owner : "Engineering") as TaskOwner,
      }));
  } catch {
    return [];
  }
}

function statusClasses(active: boolean, status: TaskStatus) {
  if (!active) return "border-border bg-surface text-muted";
  if (status === "TODO") return "border-amber-500/45 bg-amber-500/15 text-amber-300";
  if (status === "ONGOING") return "border-blue-500/40 bg-blue-500/15 text-blue-300";
  return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
}

export function ActionTodoList({ msNumber, initialTasks, onTasksChange }: ActionTodoListProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [editingNoteTaskId, setEditingNoteTaskId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [addingAction, setAddingAction] = useState(false);
  const [editingActionId, setEditingActionId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newOwner, setNewOwner] = useState<TaskOwner>("Engineering");
  const [newStatus, setNewStatus] = useState<TaskStatus>("TODO");
  const [newDueDate, setNewDueDate] = useState("");
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    if (initialTasks && initialTasks.length > 0) {
      setTasks(initialTasks);
    } else {
      setTasks(readTasks(msNumber));
    }
  }, [msNumber]);

  useEffect(() => {
    if (initialTasks !== undefined && initialTasks.length > 0) {
      setTasks(initialTasks);
    }
  }, [initialTasks]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`ASAP_BC_TASKS_${msNumber}`, JSON.stringify(tasks));
    }
    if (onTasksChange) {
      onTasksChange(tasks);
    }
  }, [tasks]);

  const counters = useMemo(() => ({
    all: tasks.length,
    todo: tasks.filter(t => t.status === "TODO").length,
    ongoing: tasks.filter(t => t.status === "ONGOING").length,
    done: tasks.filter(t => t.status === "DONE").length,
  }), [tasks]);

  const filteredTasks = useMemo(() => {
    if (filter === "all") return tasks;
    if (filter === "todo") return tasks.filter(t => t.status === "TODO");
    if (filter === "ongoing") return tasks.filter(t => t.status === "ONGOING");
    return tasks.filter(t => t.status === "DONE");
  }, [filter, tasks]);

  const activeNoteTask = editingNoteTaskId !== null ? tasks.find(t => t.id === editingNoteTaskId) ?? null : null;
  const canAddAction = newTitle.trim().length > 0;

  const resetAddActionForm = () => {
    setNewTitle("");
    setNewOwner("Engineering");
    setNewStatus("TODO");
    setNewDueDate("");
    setNewNote("");
    setEditingActionId(null);
  };

  const handleAddAction = () => {
    if (!canAddAction) return;
    if (editingActionId !== null) {
      setTasks(current => current.map(row =>
        row.id === editingActionId
          ? { ...row, title: newTitle.trim(), owner: newOwner, status: newStatus, dueDate: newDueDate || undefined, note: newNote.trim() || undefined }
          : row
      ));
      setAddingAction(false);
      resetAddActionForm();
      return;
    }
    const nextTask: TaskItem = {
      id: Date.now(),
      title: newTitle.trim(),
      status: "TODO",
      owner: newOwner,
      dueDate: newDueDate || undefined,
      note: newNote.trim() || undefined,
    };
    setTasks(current => [nextTask, ...current]);
    setAddingAction(false);
    resetAddActionForm();
  };

  const openAddModal = () => {
    resetAddActionForm();
    setAddingAction(true);
  };

  const openEditModal = (task: TaskItem) => {
    setEditingActionId(task.id);
    setNewTitle(task.title);
    setNewOwner(task.owner);
    setNewStatus(task.status);
    setNewDueDate(task.dueDate ?? "");
    setNewNote(task.note ?? "");
    setAddingAction(true);
  };

  const deleteTask = (taskId: number) => {
    if (!window.confirm("Delete this action?")) return;
    setTasks(current => current.filter(row => row.id !== taskId));
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-text">Action To Do list</h3>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={openAddModal} className="rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/15">+ Add action</button>
          {[{ id: "all", label: `All (${counters.all})` }, { id: "todo", label: `Todo (${counters.todo})` }, { id: "ongoing", label: `Ongoing (${counters.ongoing})` }, { id: "done", label: `Done (${counters.done})` }].map(item => (
            <button key={item.id} type="button" onClick={() => setFilter(item.id as StatusFilter)} className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === item.id ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted"}`}>{item.label}</button>
          ))}
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="mt-4 text-sm text-muted text-center py-4">No actions yet. Click "+ Add action" to create one.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {filteredTasks.map(task => (
            <div key={task.id} className="grid gap-2 rounded-xl border border-border bg-bg/50 px-3 py-2 lg:grid-cols-[1.2fr_1fr_1fr] lg:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">{task.title}</p>
                {task.note && <button type="button" onClick={() => { setEditingNoteTaskId(task.id); setNoteDraft(task.note ?? ""); }} className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary hover:underline">Note • View</button>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_ORDER.map(status => (
                  <button key={`${task.id}-${status}`} type="button" onClick={() => setTasks(current => current.map(row => row.id === task.id ? { ...row, status } : row))} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${statusClasses(task.status === status, status)}`}>{status}</button>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2">
                <label className="text-[11px] text-muted">Owner</label>
                <select value={task.owner} onChange={e => setTasks(current => current.map(row => row.id === task.id ? { ...row, owner: e.target.value as TaskOwner } : row))} className="h-8 rounded-lg border border-border bg-surface px-2 text-xs text-text">{OWNERS.map(o => <option key={`${task.id}-${o}`} value={o}>{o}</option>)}</select>
                <input type="date" value={task.dueDate ?? ""} onChange={e => setTasks(current => current.map(row => row.id === task.id ? { ...row, dueDate: e.target.value || undefined } : row))} className="h-8 rounded-lg border border-border bg-surface px-2 text-xs text-text" />
                <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-bg hover:text-text" title="Edit action" onClick={() => openEditModal(task)}><Pencil className="h-3.5 w-3.5" /></button>
                <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-rose-500 hover:bg-rose-500/10" title="Delete action" onClick={() => deleteTask(task.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => { setEditingNoteTaskId(task.id); setNoteDraft(task.note ?? ""); }} className="text-[11px] font-medium text-primary hover:underline">{task.note ? "Edit note" : "Add note"}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeNoteTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-4 shadow-panel">
            <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold">Note - {activeNoteTask.title}</h4><button onClick={() => setEditingNoteTaskId(null)} className="rounded-md border px-2 py-1 text-xs">Close</button></div>
            <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)} rows={5} placeholder="Write note..." className="mt-3 w-full rounded-xl border bg-bg px-3 py-2 text-sm" />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => { setEditingNoteTaskId(null); setNoteDraft(""); }} className="rounded-lg border px-3 py-1.5 text-xs">Cancel</button>
              <button onClick={() => { setTasks(current => current.map(row => row.id === activeNoteTask.id ? { ...row, note: noteDraft.trim() || undefined } : row)); setEditingNoteTaskId(null); setNoteDraft(""); }} className="rounded-lg border border-primary/35 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">Save</button>
            </div>
          </div>
        </div>
      )}

      {addingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-4 shadow-panel">
            <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold">{editingActionId !== null ? "Edit action" : "Add action"}</h4><button onClick={() => { setAddingAction(false); resetAddActionForm(); }} className="rounded-md border px-2 py-1 text-xs">Close</button></div>
            <div className="mt-3 space-y-3">
              <label className="block space-y-1"><span className="text-xs text-muted">Title</span><input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Enter action title" className="h-10 w-full rounded-xl border bg-bg px-3 text-sm" /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1"><span className="text-xs text-muted">Owner</span><select value={newOwner} onChange={e => setNewOwner(e.target.value as TaskOwner)} className="h-10 w-full rounded-xl border bg-bg px-2 text-sm">{OWNERS.map(o => <option key={`new-${o}`} value={o}>{o}</option>)}</select></label>
                {editingActionId !== null && <label className="block space-y-1"><span className="text-xs text-muted">Status</span><select value={newStatus} onChange={e => setNewStatus(e.target.value as TaskStatus)} className="h-10 w-full rounded-xl border bg-bg px-2 text-sm">{STATUS_ORDER.map(s => <option key={`new-${s}`} value={s}>{s}</option>)}</select></label>}
                <label className="block space-y-1"><span className="text-xs text-muted">Due date</span><input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="h-10 w-full rounded-xl border bg-bg px-2 text-sm" /></label>
              </div>
              <label className="block space-y-1"><span className="text-xs text-muted">Note</span><textarea rows={4} value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Write note..." className="w-full rounded-xl border bg-bg px-3 py-2 text-sm" /></label>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => { setAddingAction(false); resetAddActionForm(); }} className="rounded-lg border px-3 py-1.5 text-xs">Cancel</button>
              <button disabled={!canAddAction} onClick={handleAddAction} className="rounded-lg border border-primary/35 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-50">{editingActionId !== null ? "Save" : "Add"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}