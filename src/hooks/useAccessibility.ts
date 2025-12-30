import { useEffect, useRef } from "react";

/**
 * Hook to announce messages to screen readers
 */
export function useScreenReader() {
    const announceRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Create live region for announcements if it doesn't exist
        if (!announceRef.current) {
            const liveRegion = document.createElement("div");
            liveRegion.setAttribute("role", "status");
            liveRegion.setAttribute("aria-live", "polite");
            liveRegion.setAttribute("aria-atomic", "true");
            liveRegion.className = "sr-only";
            document.body.appendChild(liveRegion);
            announceRef.current = liveRegion;
        }

        return () => {
            if (announceRef.current && document.body.contains(announceRef.current)) {
                document.body.removeChild(announceRef.current);
            }
        };
    }, []);

    const announce = (message: string, priority: "polite" | "assertive" = "polite") => {
        if (announceRef.current) {
            announceRef.current.setAttribute("aria-live", priority);
            announceRef.current.textContent = message;

            // Clear after announcement
            setTimeout(() => {
                if (announceRef.current) {
                    announceRef.current.textContent = "";
                }
            }, 1000);
        }
    };

    return { announce };
}

/**
 * Hook to manage focus trap within a container
 */
export function useFocusTrap(isActive: boolean) {
    const containerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (!isActive || !containerRef.current) return;

        const container = containerRef.current;
        const focusableElements = container.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleTabKey = (e: KeyboardEvent) => {
            if (e.key !== "Tab") return;

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        container.addEventListener("keydown", handleTabKey);
        firstElement?.focus();

        return () => {
            container.removeEventListener("keydown", handleTabKey);
        };
    }, [isActive]);

    return containerRef;
}

/**
 * Hook to handle keyboard navigation in lists
 */
export function useKeyboardNavigation<T extends HTMLElement = HTMLElement>(
    itemCount: number,
    onSelect?: (index: number) => void
) {
    const currentIndex = useRef(0);
    const containerRef = useRef<T>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                currentIndex.current = Math.min(currentIndex.current + 1, itemCount - 1);
                onSelect?.(currentIndex.current);
                break;
            case "ArrowUp":
                e.preventDefault();
                currentIndex.current = Math.max(currentIndex.current - 1, 0);
                onSelect?.(currentIndex.current);
                break;
            case "Home":
                e.preventDefault();
                currentIndex.current = 0;
                onSelect?.(currentIndex.current);
                break;
            case "End":
                e.preventDefault();
                currentIndex.current = itemCount - 1;
                onSelect?.(currentIndex.current);
                break;
            case "Enter":
            case " ":
                e.preventDefault();
                onSelect?.(currentIndex.current);
                break;
        }
    };

    return {
        containerRef,
        handleKeyDown,
        currentIndex: currentIndex.current,
    };
}

/**
 * Generate accessible IDs for form fields
 */
export function useAccessibleId(prefix: string) {
    const id = useRef(`${prefix}-${Math.random().toString(36).substr(2, 9)}`);
    return {
        id: id.current,
        labelId: `${id.current}-label`,
        descriptionId: `${id.current}-description`,
        errorId: `${id.current}-error`,
    };
}
