import { useEffect, useCallback, useRef } from "react";
import { useBlocker } from "react-router-dom";

interface UseUnsavedChangesOptions {
    hasUnsavedChanges: boolean;
    message?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
}

/**
 * Hook to warn users about unsaved changes when navigating away
 * Handles both browser navigation (refresh, close) and in-app routing
 */
export function useUnsavedChanges({
    hasUnsavedChanges,
    message = "You have unsaved changes. Are you sure you want to leave?",
    onConfirm,
    onCancel,
}: UseUnsavedChangesOptions) {
    const confirmRef = useRef(onConfirm);
    const cancelRef = useRef(onCancel);

    // Keep refs updated
    useEffect(() => {
        confirmRef.current = onConfirm;
        cancelRef.current = onCancel;
    }, [onConfirm, onCancel]);

    // Handle browser navigation (refresh, close tab, back button)
    useEffect(() => {
        if (!hasUnsavedChanges) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            // Modern browsers require returnValue to be set
            e.returnValue = message;
            return message;
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [hasUnsavedChanges, message]);

    // Handle in-app routing with React Router
    const blocker = useBlocker(
        useCallback(
            ({ currentLocation, nextLocation }) => {
                // Only block if there are unsaved changes and we're navigating to a different route
                return hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname;
            },
            [hasUnsavedChanges]
        )
    );

    // Handle blocker state
    useEffect(() => {
        if (blocker.state === "blocked") {
            const confirmed = window.confirm(message);

            if (confirmed) {
                confirmRef.current?.();
                blocker.proceed();
            } else {
                cancelRef.current?.();
                blocker.reset();
            }
        }
    }, [blocker, message]);

    return {
        blocker,
        hasUnsavedChanges,
    };
}
