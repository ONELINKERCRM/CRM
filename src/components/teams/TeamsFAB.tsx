import { useState, useRef } from "react";
import { Plus, Users, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";

interface TeamsFABProps {
  className?: string;
  onAddAgent: () => void;
  onCreateTeam: () => void;
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

export function TeamsFAB({ className, onAddAgent, onCreateTeam }: TeamsFABProps) {
  const [isFabOpen, setIsFabOpen] = useState(false);
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

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(e);
    triggerHaptic("medium");
    setIsFabOpen(!isFabOpen);
  };

  const handleOption = (action: "agent" | "team") => {
    triggerHaptic("light");
    setIsFabOpen(false);
    if (action === "agent") {
      onAddAgent();
    } else {
      onCreateTeam();
    }
  };

  const menuItemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.8 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.05,
        type: "spring" as const,
        stiffness: 400,
        damping: 25,
      },
    }),
    exit: { opacity: 0, y: 10, scale: 0.9, transition: { duration: 0.15 } },
  };

  return (
    <>
      {/* FAB Menu Overlay */}
      <AnimatePresence>
        {isFabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => {
              triggerHaptic("light");
              setIsFabOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* FAB Options */}
      <AnimatePresence>
        {isFabOpen && (
          <div className={cn("fixed bottom-36 right-4 z-50 flex flex-col gap-2", className)}>
            <motion.button
              custom={1}
              variants={menuItemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => handleOption("team")}
              whileHover={{ scale: 1.02, x: -4 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-3 bg-card text-card-foreground px-4 py-3 rounded-full shadow-lg border"
            >
              <motion.div
                initial={{ rotate: -90 }}
                animate={{ rotate: 0 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
              >
                <Users className="h-5 w-5 text-blue-600" />
              </motion.div>
              <span className="text-sm font-medium">Create Team</span>
            </motion.button>
            <motion.button
              custom={0}
              variants={menuItemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => handleOption("agent")}
              whileHover={{ scale: 1.02, x: -4 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-3 bg-card text-card-foreground px-4 py-3 rounded-full shadow-lg border"
            >
              <motion.div
                initial={{ rotate: -90 }}
                animate={{ rotate: 0 }}
                transition={{ delay: 0.05, type: "spring", stiffness: 300 }}
              >
                <UserPlus className="h-5 w-5 text-primary" />
              </motion.div>
              <span className="text-sm font-medium">Add Agent</span>
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        ref={buttonRef}
        onClick={handleToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{ 
          rotate: isFabOpen ? 45 : 0,
          boxShadow: isFabOpen 
            ? "0 8px 30px -4px rgba(0, 0, 0, 0.3)" 
            : "0 4px 15px -2px rgba(0, 0, 0, 0.2)"
        }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
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
        <Plus className="h-6 w-6 relative z-10" />
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
