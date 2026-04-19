"use client";
import { useEffect } from "react";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";
export function ManagerLiveFeed({ restaurantId }) {
    useEffect(() => {
        const socket = getSocket();
        socket.emit("join:restaurant", restaurantId);
        socket.on("order:new", (payload) => {
            toast.success(`New order at table ${payload.tableNumber} for Rs ${payload.totalAmount}`);
        });
        socket.on("order:updated", (payload) => {
            toast.message(`Order ${payload.orderId.slice(-5)} is now ${payload.status}`);
        });
        return () => {
            socket.off("order:new");
            socket.off("order:updated");
        };
    }, [restaurantId]);
    return null;
}
