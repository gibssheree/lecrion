"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_PROJECTION_NAMES = void 0;
exports.buildProjection = buildProjection;
exports.rebuildProjections = rebuildProjections;
const enums_1 = require("../../contracts/src/enums");
const CLOSED_STATUS_SQL = [
    enums_1.OrderStatus.CANCELLED,
    enums_1.OrderStatus.COMPLETED,
    enums_1.OrderStatus.REFUNDED,
]
    .map((s) => `'${s}'`)
    .join(",");
exports.ALL_PROJECTION_NAMES = [
    "daily_revenue",
    "monthly_revenue",
    "top_products",
    "payment_mix",
    "stock_alerts",
    "open_orders",
    "bot_conversation_counts",
];
async function buildProjection(prisma, name) {
    switch (name) {
        case "daily_revenue":
            return prisma.$queryRawUnsafe(`
        SELECT
          DATE(o.created_at) AS date,
          COUNT(o.id)        AS order_count,
          COALESCE(SUM(oi.price * oi.qty), 0) AS revenue
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status NOT IN (${CLOSED_STATUS_SQL})
        GROUP BY DATE(o.created_at)
        ORDER BY date DESC
        LIMIT 30
      `);
        case "monthly_revenue":
            return prisma.$queryRawUnsafe(`
        SELECT
          strftime('%Y-%m', o.created_at) AS month,
          COUNT(o.id)                     AS order_count,
          COALESCE(SUM(oi.price * oi.qty), 0) AS revenue
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status NOT IN (${CLOSED_STATUS_SQL})
        GROUP BY strftime('%Y-%m', o.created_at)
        ORDER BY month DESC
        LIMIT 12
      `);
        case "top_products":
            return prisma.$queryRawUnsafe(`
        SELECT
          m.id, m.name,
          SUM(oi.qty)                         AS units_sold,
          COALESCE(SUM(oi.price * oi.qty), 0) AS revenue
        FROM order_items oi
        JOIN menu m ON m.id = oi.menu_id
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status NOT IN (${CLOSED_STATUS_SQL})
          AND DATE(o.created_at) >= DATE('now', '-30 days')
        GROUP BY m.id
        ORDER BY revenue DESC
        LIMIT 10
      `);
        case "payment_mix":
            return prisma.$queryRawUnsafe(`
        SELECT
          payment_method,
          COUNT(*) AS order_count,
          COALESCE(SUM(oi.price * oi.qty), 0) AS revenue
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status NOT IN (${CLOSED_STATUS_SQL})
          AND DATE(o.created_at) >= DATE('now', '-30 days')
        GROUP BY payment_method
      `);
        case "stock_alerts":
            return prisma.menu.findMany({
                where: { stock: { lte: 5 } },
                orderBy: { stock: "asc" },
                select: { id: true, name: true, stock: true },
            });
        case "open_orders":
            return prisma.$queryRawUnsafe(`
        SELECT o.id, o.name, o.type, o.status, o.created_at,
               COUNT(oi.id) AS item_count,
               COALESCE(SUM(oi.price * oi.qty), 0) AS total
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status NOT IN (${CLOSED_STATUS_SQL})
        GROUP BY o.id
        ORDER BY o.created_at ASC
      `);
        case "bot_conversation_counts":
            return prisma.$queryRawUnsafe(`
        SELECT
          DATE(created_at) AS date,
          COUNT(DISTINCT sender) AS unique_senders,
          COUNT(*) AS message_count
        FROM chat_history
        WHERE DATE(created_at) >= DATE('now', '-7 days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);
        default:
            throw new Error(`Unknown projection: ${name}`);
    }
}
async function rebuildProjections(prisma, targets = exports.ALL_PROJECTION_NAMES, onError) {
    const rebuilt = [];
    const failed = [];
    const now = new Date().toISOString();
    for (const name of targets) {
        try {
            const data = await buildProjection(prisma, name);
            await prisma.report_snapshots.upsert({
                where: { projection: name },
                update: { payload: JSON.stringify(data), built_at: now },
                create: {
                    projection: name,
                    payload: JSON.stringify(data),
                    built_at: now,
                },
            });
            rebuilt.push(name);
        }
        catch (err) {
            failed.push(name);
            if (onError)
                onError(name, err);
        }
    }
    return { rebuilt, failed };
}
//# sourceMappingURL=projections.js.map