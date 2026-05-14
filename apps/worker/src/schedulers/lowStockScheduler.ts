// apps/worker/src/schedulers/lowStockScheduler.ts
import { PrismaService } from "../../../../libs/db/src/prisma";
import { schedulerLogger } from "../telemetry/logger";

let _prisma: PrismaService;

export function initLowStockScheduler(prisma: PrismaService): void {
  _prisma = prisma;
}

function formatRupiah(v: number): string {
  return new Intl.NumberFormat("id-ID").format(Number(v) || 0);
}

function getConfig() {
  return {
    enabled:
      (process.env["LOW_STOCK_ALERTS_ENABLED"] ?? "true").toLowerCase() ===
      "true",
    threshold: Number(process.env["LOW_STOCK_THRESHOLD"] ?? 5),
    intervalMs: Number(process.env["LOW_STOCK_CHECK_INTERVAL_MS"] ?? 60000),
    targets: (process.env["LOW_STOCK_ALERT_TARGETS"] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    token: process.env["FONNTE_TOKEN"] ?? "",
  };
}

async function sendWhatsappMessage(
  target: string,
  message: string,
  token: string,
): Promise<void> {
  const form = new URLSearchParams();
  form.append("target", target);
  form.append("message", message);
  await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
    signal: AbortSignal.timeout(10000),
  });
}

function buildLowStockMessage(product: {
  id: number;
  name: string;
  stock: number;
  price: number;
}): string {
  return [
    "Halo 👋",
    `Barang *${product.name}* sisa stok ${product.stock}.`,
    "Stok sudah <= batas minimum.",
    "Mungkin kamu bisa perbarui stoknya ya.",
    `Harga saat ini: Rp${formatRupiah(product.price)}`,
    `ID Produk: ${product.id}`,
  ].join("\n");
}

function dedupKey(product: {
  id: number;
  stock: number;
  price: number;
}): string {
  return `low_stock_alerted:${product.id}:${product.stock}:${product.price}`;
}

export async function checkAndNotifyLowStock(): Promise<void> {
  const { enabled, threshold, targets, token } = getConfig();
  if (!enabled || !targets.length || !token) return;

  const products = await _prisma.menu.findMany({
    where: { stock: { lte: threshold } },
    orderBy: [{ stock: "asc" }, { name: "asc" }],
    select: { id: true, name: true, stock: true, price: true },
  });

  for (const product of products) {
    const key = dedupKey(product as any);
    const alreadySent = await _prisma.store_settings.findUnique({
      where: { key },
    });
    if (alreadySent) continue;

    const message = buildLowStockMessage(product as any);
    for (const target of targets) {
      try {
        await sendWhatsappMessage(target, message, token);
      } catch (err: any) {
        schedulerLogger.warn(
          `Low stock send failed for ${target}: ${err.message}`,
        );
      }
    }

    await _prisma.store_settings.upsert({
      where: { key },
      update: { value: "1", updated_at: new Date().toISOString() },
      create: { key, value: "1", updated_at: new Date().toISOString() },
    });

    schedulerLogger.info(
      `Low stock alert sent: ${product.name} (stock: ${product.stock})`,
    );
  }
}

export function startLowStockScheduler(): void {
  const { enabled, threshold, intervalMs, targets } = getConfig();

  if (!enabled) {
    schedulerLogger.info(
      "LowStockScheduler disabled (LOW_STOCK_ALERTS_ENABLED=false)",
    );
    return;
  }
  if (!targets.length) {
    schedulerLogger.info("LowStockScheduler: no targets configured");
    return;
  }

  const safeInterval = intervalMs > 0 ? intervalMs : 60000;
  const run = async () => {
    try {
      await checkAndNotifyLowStock();
    } catch (err: any) {
      schedulerLogger.exception(err, { context: "low stock check" });
    }
  };

  run();
  setInterval(run, safeInterval);
  schedulerLogger.info(
    `LowStockScheduler running every ${safeInterval}ms. Threshold <= ${threshold}. Targets: ${targets.join(", ")}`,
  );
}
