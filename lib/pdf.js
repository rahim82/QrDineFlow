import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
export async function createBillPdf(input) {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    page.drawText(input.restaurantName, {
        x: 50,
        y: 780,
        size: 22,
        font: bold,
        color: rgb(0.1, 0.1, 0.1)
    });
    page.drawText(`Bill ID: ${input.orderId}`, { x: 50, y: 750, size: 11, font });
    page.drawText(`Table: ${input.tableNumber}`, { x: 50, y: 734, size: 11, font });
    page.drawText(`Customer: ${input.customerName}`, { x: 50, y: 718, size: 11, font });
    page.drawText(`Date: ${new Date(input.createdAt).toLocaleString("en-IN")}`, { x: 50, y: 702, size: 11, font });
    let y = 660;
    for (const line of input.lines) {
        page.drawText(`${line.name} x${line.quantity}`, { x: 50, y, size: 11, font });
        page.drawText(`Rs ${line.totalPrice.toFixed(2)}`, { x: 460, y, size: 11, font });
        y -= 22;
    }
    y -= 10;
    page.drawText(`Subtotal: Rs ${input.subtotal.toFixed(2)}`, { x: 360, y, size: 12, font });
    y -= 20;
    page.drawText(`GST: Rs ${input.gstAmount.toFixed(2)}`, { x: 360, y, size: 12, font });
    y -= 24;
    page.drawText(`Total: Rs ${input.totalAmount.toFixed(2)}`, { x: 360, y, size: 14, font: bold });
    return Buffer.from(await pdf.save());
}
