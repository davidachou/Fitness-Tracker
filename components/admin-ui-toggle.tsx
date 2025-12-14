"use client";

import { Button } from "@/components/ui/button";
import { Shield, ShieldOff } from "lucide-react";
import { useAdminUIMode } from "@/hooks/use-admin-ui-mode";

interface AdminUIToggleProps {
  isAdmin: boolean;
}

const AdminUIToggle = ({ isAdmin }: AdminUIToggleProps) => {
  const { adminUIMode, toggleAdminUIMode } = useAdminUIMode();

  // Don't render if user is not an admin
  if (!isAdmin) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleAdminUIMode}
      title={adminUIMode ? "Switch to normal user view" : "Switch to admin view"}
      data-tour="admin-toggle"
    >
      {adminUIMode ? (
        <Shield
          size={16}
          className="text-primary"
        />
      ) : (
        <ShieldOff
          size={16}
          className="text-muted-foreground"
        />
      )}
    </Button>
  );
};

export { AdminUIToggle };
