import { clsx } from "clsx";
export function cn(...inputs) {
    return clsx(inputs);
}
export function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(amount);
}
