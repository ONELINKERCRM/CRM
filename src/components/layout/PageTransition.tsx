import { motion, Transition, Variants } from "framer-motion";
import { ReactNode, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

interface PageTransitionProps {
  children: ReactNode;
}

// Track navigation direction for slide animations
let previousPath = "/";

// Desktop: subtle fade and scale
const desktopVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -8,
  },
};

// Mobile: iOS-like slide with fade
const mobileVariants: Variants = {
  initial: {
    opacity: 0,
    x: 30,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  exit: {
    opacity: 0,
    x: -20,
    scale: 0.98,
  },
};

const desktopTransition: Transition = {
  type: "tween",
  ease: "easeOut",
  duration: 0.2,
};

const mobileTransition: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 35,
  mass: 0.8,
};

export function PageTransition({ children }: PageTransitionProps) {
  const isMobile = useIsMobile();
  const location = useLocation();

  useEffect(() => {
    previousPath = location.pathname;
  }, [location.pathname]);

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={isMobile ? mobileVariants : desktopVariants}
      transition={isMobile ? mobileTransition : desktopTransition}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}
