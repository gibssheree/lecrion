"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFonnteMessage = sendFonnteMessage;
async function sendFonnteMessage(target, message, token) {
    const form = new URLSearchParams();
    form.append("target", target);
    form.append("message", message);
    const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
            Authorization: token,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
        signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Fonnte API error ${response.status}: ${text.slice(0, 200)}`);
    }
}
//# sourceMappingURL=fonnteTransport.js.map