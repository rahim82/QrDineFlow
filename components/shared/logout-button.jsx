"use client";

import { useState } from "react";
import { toast } from "sonner";

export function LogoutButton({ className = "" }) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST"
      });

      if (!response.ok) {
        toast.error("Logout could not be completed");
        return;
      }

      window.location.href = "/login";
    } catch (error) {
      console.error("logout error", error);
      toast.error("Logout request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleLogout} disabled={loading} className={className}>
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}
