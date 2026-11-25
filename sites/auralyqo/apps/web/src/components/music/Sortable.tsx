"use client";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useId, type ReactNode } from "react";

/** Drag-to-reorder list (mouse, touch, and keyboard: Space to pick up, arrows to move). */
export function SortableList({ ids, onMove, children }: { ids: string[]; onMove: (from: number, to: number) => void; children: ReactNode }) {
  const id = useId(); // stable across server/client: avoids hydration mismatch in dnd-kit aria ids
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const end = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    onMove(ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
  };
  return (
    <DndContext id={id} sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export function SortableItem({ id, children, label }: { id: string; label: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button type="button" aria-label={`Seret untuk susun: ${label}`} className="grid h-8 w-6 cursor-grab touch-none place-items-center text-faint hover:text-fg active:cursor-grabbing" {...attributes} {...listeners}>
      <GripVertical className="h-4 w-4" />
    </button>
  );
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined, position: "relative" }} className={isDragging ? "opacity-80 shadow-2xl" : ""}>
      {children(handle)}
    </div>
  );
}
