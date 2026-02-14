import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();
  const visibleToasts = toasts.filter((toast) => toast.open !== false);
  const viewportRef = useRef(null);

  useEffect(() => {
    if (visibleToasts.length === 0) return;

    const handleOutsideDismiss = (event) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      if (!viewport.contains(event.target)) {
        dismiss();
      }
    };

    document.addEventListener("mousedown", handleOutsideDismiss, true);
    document.addEventListener("touchstart", handleOutsideDismiss, true);
    return () => {
      document.removeEventListener("mousedown", handleOutsideDismiss, true);
      document.removeEventListener("touchstart", handleOutsideDismiss, true);
    };
  }, [dismiss, visibleToasts.length]);

  return (
    <ToastProvider>
      <ToastViewport ref={viewportRef}>
        {visibleToasts.map(function ({
          id,
          title,
          description,
          action,
          ...props
        }) {
          return (
            <Toast key={id} {...props}>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action}
              <ToastClose onClick={() => dismiss(id)} />
            </Toast>
          );
        })}
      </ToastViewport>
    </ToastProvider>
  );
} 
