import { io } from "socket.io-client";
let socket = null;
export function getSocket() {
    if (!socket) {
        socket = io(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", {
            path: "/socket.io",
            transports: ["websocket"]
        });
    }
    return socket;
}
