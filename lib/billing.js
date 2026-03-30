export function calculateBill(lines, gstRate = 0.05) {
    const subtotal = lines.reduce((sum, line) => sum + line.totalPrice, 0);
    const gstAmount = Number((subtotal * gstRate).toFixed(2));
    const total = Number((subtotal + gstAmount).toFixed(2));
    return {
        subtotal,
        gstRate,
        gstAmount,
        total
    };
}
export function splitBill(lines, participants) {
    if (!participants.length)
        return [];
    const total = lines.reduce((sum, line) => sum + line.totalPrice, 0);
    const perPerson = Number((total / participants.length).toFixed(2));
    return participants.map((name) => ({
        name,
        amount: perPerson,
        items: lines.map((line) => line.name)
    }));
}
