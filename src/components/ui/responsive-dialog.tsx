import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetFooter,
  BottomSheetClose,
  BottomSheetTrigger,
  BottomSheetBody,
} from "@/components/ui/bottom-sheet";

interface ResponsiveDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const ResponsiveDialog = ({ children, ...props }: ResponsiveDialogProps) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <BottomSheet {...props}>{children}</BottomSheet>;
  }
  
  return <Dialog {...props}>{children}</Dialog>;
};

const ResponsiveDialogTrigger = ({ children, ...props }: React.ComponentProps<typeof DialogTrigger>) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <BottomSheetTrigger {...props}>{children}</BottomSheetTrigger>;
  }
  
  return <DialogTrigger {...props}>{children}</DialogTrigger>;
};

const ResponsiveDialogContent = ({ 
  children, 
  className,
  ...props 
}: React.ComponentProps<typeof DialogContent>) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <BottomSheetContent className={className} {...props}>
        {children}
      </BottomSheetContent>
    );
  }
  
  return (
    <DialogContent className={className} {...props}>
      {children}
    </DialogContent>
  );
};

const ResponsiveDialogHeader = ({ 
  children, 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <BottomSheetHeader className={className} {...props}>
        {children}
      </BottomSheetHeader>
    );
  }
  
  return (
    <DialogHeader className={className} {...props}>
      {children}
    </DialogHeader>
  );
};

const ResponsiveDialogTitle = ({ 
  children, 
  className,
  ...props 
}: React.ComponentProps<typeof DialogTitle>) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <BottomSheetTitle className={className} {...props}>
        {children}
      </BottomSheetTitle>
    );
  }
  
  return (
    <DialogTitle className={className} {...props}>
      {children}
    </DialogTitle>
  );
};

const ResponsiveDialogDescription = ({ 
  children, 
  className,
  ...props 
}: React.ComponentProps<typeof DialogDescription>) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <BottomSheetDescription className={className} {...props}>
        {children}
      </BottomSheetDescription>
    );
  }
  
  return (
    <DialogDescription className={className} {...props}>
      {children}
    </DialogDescription>
  );
};

const ResponsiveDialogBody = ({ 
  children, 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <BottomSheetBody className={className} {...props}>
        {children}
      </BottomSheetBody>
    );
  }
  
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
};

const ResponsiveDialogFooter = ({ 
  children, 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <BottomSheetFooter className={className} {...props}>
        {children}
      </BottomSheetFooter>
    );
  }
  
  return (
    <DialogFooter className={className} {...props}>
      {children}
    </DialogFooter>
  );
};

const ResponsiveDialogClose = ({ children, ...props }: React.ComponentProps<typeof DialogClose>) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <BottomSheetClose {...props}>{children}</BottomSheetClose>;
  }
  
  return <DialogClose {...props}>{children}</DialogClose>;
};

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
};
