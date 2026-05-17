// apps/api/src/modules/bot/scheduled-reports.service.ts
//
// ScheduledReportsService — Phase 10 WhatsApp scheduled summaries.
//
// Sends automated reports via Fonnte WhatsApp:
//   • Daily close report — sent at 23:00 WIB (UTC+7 = 16:00 UTC)
//   • Low stock alert — sent at 08:00 WIB (01:00 UTC) every day
//   • Hourly sales — sent every hour during business hours (08:00-22:00 WIB)
//
// Design rules:
//   • Uses setInterval + time check instead of @nestjs/schedule to avoid
//     adding a new dependency.
//   • REPORT_RECIPIENT env var controls who receives the reports.
//     If not set, scheduled reports are disabled.
//   • All sends are non-blocking — failures are logged but do not crash.
//   • Reports are only sent if FONNTE_TOKEN is configured.

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PosReportsService } from '../reports/pos-reports.service';
import { AppConfigService } from '../../infrastructure/config/app-config.service';
import { sendFonnteMessage } from '@bot/webhook/fonnteTransport';

// Check interval: every 60 seconds
const CHECK_INTERVAL_MS = 60_000;

// WIB = UTC+7
const WIB_OFFSET_HOURS = 7;

function nowWib(): { hour: number; minute: number } {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const wibHour = (utcHour + WIB_OFFSET_HOURS) % 24;
  return { hour: wibHour, minute: utcMinute };
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class ScheduledReportsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScheduledReportsService.name);
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  // Track which reports have been sent today to avoid duplicates
  private sentToday = new Map<string, string>(); // key → date sent

  constructor(
    private readonly posReports: PosReportsService,
    private readonly config: AppConfigService,
  ) {}

  onModuleInit() {
    const recipient = this.getRecipient();
    if (!recipient) {
      this.logger.log('Scheduled reports disabled — REPORT_RECIPIENT not set');
      return;
    }
    if (!this.config.fonnteToken) {
      this.logger.log('Scheduled reports disabled — FONNTE_TOKEN not set');
      return;
    }

    this.logger.log(`Scheduled reports enabled → recipient: ${recipient}`);
    this.intervalHandle = setInterval(() => this.tick(), CHECK_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private getRecipient(): string | null {
    // REPORT_RECIPIENT can be a single phone number or comma-separated list
    const raw = process.env['REPORT_RECIPIENT'] ?? '';
    return raw.trim() || null;
  }

  private getRecipients(): string[] {
    const raw = process.env['REPORT_RECIPIENT'] ?? '';
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private alreadySentToday(key: string): boolean {
    return this.sentToday.get(key) === todayKey();
  }

  private markSent(key: string) {
    this.sentToday.set(key, todayKey());
    // Clean up old entries (keep only today's)
    for (const [k, date] of this.sentToday.entries()) {
      if (date !== todayKey()) this.sentToday.delete(k);
    }
  }

  private async tick() {
    const { hour, minute } = nowWib();

    // ── Daily close report at 23:00 WIB ──────────────────────────────────────
    if (hour === 23 && minute < 5 && !this.alreadySentToday('daily_close')) {
      this.markSent('daily_close');
      this.sendDailyClose().catch((err) =>
        this.logger.warn(`Daily close report failed: ${err.message}`),
      );
    }

    // ── Low stock alert at 08:00 WIB ──────────────────────────────────────────
    if (hour === 8 && minute < 5 && !this.alreadySentToday('low_stock')) {
      this.markSent('low_stock');
      this.sendLowStockAlert().catch((err) =>
        this.logger.warn(`Low stock alert failed: ${err.message}`),
      );
    }

    // ── Hourly sales during business hours (08:00-22:00 WIB) ─────────────────
    // Send at :00 of each hour
    if (hour >= 8 && hour <= 22 && minute < 5) {
      const hourKey = `hourly_${hour}`;
      if (!this.alreadySentToday(hourKey)) {
        this.markSent(hourKey);
        this.sendHourlySales(hour).catch((err) =>
          this.logger.warn(`Hourly sales report failed: ${err.message}`),
        );
      }
    }
  }

  // ── Report senders ─────────────────────────────────────────────────────────

  async sendDailyClose(): Promise<void> {
    const text = await this.posReports.formatDailyCloseSummary();
    await this.broadcast(text);
    this.logger.log('Daily close report sent');
  }

  async sendLowStockAlert(): Promise<void> {
    const text = await this.posReports.formatLowStockAlert();
    // Only send if there are actually low stock items
    if (text.startsWith('✅')) return;
    await this.broadcast(text);
    this.logger.log('Low stock alert sent');
  }

  async sendHourlySales(hour: number): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const hourly = await this.posReports.getPosHourly({ date: today });
    const thisHour = hourly.find((h) => h.hour === hour);
    if (!thisHour || thisHour.saleCount === 0) return;

    const fmt = (n: number) =>
      new Intl.NumberFormat('id-ID').format(Math.round(n));
    const text = [
      `⏰ *Penjualan Jam ${String(hour).padStart(2, '0')}:00 WIB*`,
      `📦 Transaksi: ${thisHour.saleCount}`,
      `💰 Gross Sales: Rp${fmt(thisHour.grossSales)}`,
    ].join('\n');

    await this.broadcast(text);
  }

  private async broadcast(text: string): Promise<void> {
    const recipients = this.getRecipients();
    const token = this.config.fonnteToken;
    await Promise.allSettled(
      recipients.map((r) => sendFonnteMessage(r, text, token)),
    );
  }

  // ── Manual trigger endpoints (for testing) ─────────────────────────────────

  async triggerDailyClose(): Promise<{ text: string }> {
    const text = await this.posReports.formatDailyCloseSummary();
    await this.broadcast(text);
    return { text };
  }

  async triggerLowStockAlert(): Promise<{ text: string }> {
    const text = await this.posReports.formatLowStockAlert();
    await this.broadcast(text);
    return { text };
  }
}
