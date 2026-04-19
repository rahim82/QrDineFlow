import "./globals.css";
import { AppToaster } from "@/components/providers/toaster";
export const metadata = {
    title: "QR DineFlow",
    description: "Smart QR restaurant ordering, billing, and analytics platform"
};
export default function RootLayout({ children }) {
    return (<html lang="en">
      <body>
        {children}
        <AppToaster />
      </body>
    </html>);
}
