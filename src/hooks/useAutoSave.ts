import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Custom hook for debouncing a value
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Custom hook for auto-save functionality
 * @param data - The data to auto-save
 * @param saveFunction - Function to call for saving
 * @param options - Configuration options
 */
interface UseAutoSaveOptions {
    enabled?: boolean;
    debounceMs?: number;
    intervalMs?: number;
    onSaveStart?: () => void;
    onSaveSuccess?: () => void;
    onSaveError?: (error: any) => void;
}

export function useAutoSave<T>(
    data: T,
    saveFunction: (data: T) => Promise<void>,
    options: UseAutoSaveOptions = {}
) {
    const {
        enabled = true,
        debounceMs = 3000,
        intervalMs = 30000,
        onSaveStart,
        onSaveSuccess,
        onSaveError,
    } = options;

    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout>();
    const intervalRef = useRef<NodeJS.Timeout>();
    const lastDataRef = useRef<T>(data);
    const isFirstRender = useRef(true);

    const save = useCallback(async () => {
        if (!enabled) return;

        try {
            setIsSaving(true);
            onSaveStart?.();
            await saveFunction(data);
            setLastSaved(new Date());
            onSaveSuccess?.();
        } catch (error) {
            console.error('Auto-save error:', error);
            onSaveError?.(error);
        } finally {
            setIsSaving(false);
        }
    }, [data, saveFunction, enabled, onSaveStart, onSaveSuccess, onSaveError]);

    // Debounced save on data change
    useEffect(() => {
        if (!enabled) return;

        // Skip first render
        if (isFirstRender.current) {
            isFirstRender.current = false;
            lastDataRef.current = data;
            return;
        }

        // Check if data actually changed
        if (JSON.stringify(data) === JSON.stringify(lastDataRef.current)) {
            return;
        }

        lastDataRef.current = data;

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout for debounced save
        saveTimeoutRef.current = setTimeout(() => {
            save();
        }, debounceMs);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [data, enabled, debounceMs, save]);

    // Interval-based save
    useEffect(() => {
        if (!enabled || !intervalMs) return;

        intervalRef.current = setInterval(() => {
            save();
        }, intervalMs);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [enabled, intervalMs, save]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return {
        isSaving,
        lastSaved,
        forceSave: save,
    };
}
