import { useSyncExternalStore } from "react";

let draggedResource = null;
const listeners = new Set();
export const setDraggedResource = (resource) => {
    draggedResource = resource;
    listeners.forEach((listener) => listener());
};
const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};
const getSnapshot = () => draggedResource;
export const useDraggedResource = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
