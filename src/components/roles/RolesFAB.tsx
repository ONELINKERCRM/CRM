import { useState, useRef } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";

interface RolesFABProps {
  className?: string;
  onAddUser: () => void;
}

interface RippleStyle {
  left: number;
  top: number;
  id: number;
}

// Haptic feedback utility
const triggerHaptic = (style: "light" | "medium" | "heavy" = "light") => {
  if ("vibrate" in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 30 };
    navigator.vibrate(patterns[style]);
  }
};

export function RolesFAB({ className, onAddUser }: RolesFABProps) {
  const [ripples, setRipples] = useState<RippleStyle[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const left = e.clientX - rect.left - 28;
    const top = e.clientY - rect.top - 28;
    const id = Date.now();

    setRipples((prev) => [...prev, { left, top, id }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e);
    triggerHaptic("medium");
    onAddUser();
  };

  return (
    <>
      <motion.button
        ref={buttonRef}
        onClick={handleClick}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.85 }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 20,
          delay: 0.2
        }}
        className={cn(
          "fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center overflow-hidden",
          className
        )}
      >
        {/* Ripple effects */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute w-14 h-14 rounded-full bg-white/30 animate-[ripple_0.6s_ease-out]"
            style={{ left: ripple.left, top: ripple.top }}
          />
        ))}
        <motion.div
          whileTap={{ rotate: 90 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
          className="relative z-10"
        >
          <Plus className="h-6 w-6" />
        </motion.div>
      </motion.button>

      <style>{`
        @keyframes ripple {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
