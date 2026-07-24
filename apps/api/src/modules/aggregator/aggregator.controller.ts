// apps/api/src/modules/aggregator/aggregator.controller.ts
//
// Aggregator Webhook Controller — Phase 2
//
// Exposes one webhook endpoint per aggregator platform:
//   POST /api/aggregator/gofood/webhook
//   POST /api/aggregator/grabfood/webhook
//   POST /api/aggregator/shopeefood/webhook
//
// Security note:
//   Each endpoint should validate the platform's HMAC-SHA256 signature in
//   production. Signature keys are stored in .env:
//     GOFOOD_WEBHOOK_SECRET, GRABFOOD_WEBHOOK_SECRET, SHOPEEFOOD_WEBHOOK_SECRET
//   The validation is marked as TODO for now; the current implementation
//   accepts all requests from any IP — safe only behind a VPC/proxy allow-list.

import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { AggregatorService } from './aggregator.service';

@Controller('aggregator')
export class AggregatorController {
  private readonly logger = new Logger(AggregatorController.name);

  constructor(private readonly aggregatorService: AggregatorService) {}

  // ── GoFood Webhook ─────────────────────────────────────────────────────────

  /**
   * POST /api/aggregator/gofood/webhook
   *
   * Receives new-order events from GoFood's Order Push API.
   * GoFood sends JSON with order_id, customer_name, order_items, total_price.
   */
  @Post('gofood/webhook')
  @HttpCode(HttpStatus.OK)
  async goFoodWebhook(@Body() payload: any) {
    this.logger.log(
      `GoFood webhook received: order_id=${payload?.order_id}`,
    );

    if (!payload?.order_id) {
      throw new BadRequestException('Missing order_id in GoFood webhook payload');
    }

    try {
      const normalized = this.aggregatorService.normalizeGoFood(payload);
      const result = await this.aggregatorService.ingestOrder(normalized);
      return {
        ok: true,
        channel: 'gofood',
        orderId: result.orderId,
        message: result.receiptMessage,
      };
    } catch (err: any) {
      if (err instanceof ConflictException) {
        // Idempotent — GoFood retries; return 200 with already-processed message
        return { ok: true, channel: 'gofood', message: err.message };
      }
      throw err;
    }
  }

  // ── GrabFood Webhook ───────────────────────────────────────────────────────

  /**
   * POST /api/aggregator/grabfood/webhook
   *
   * Receives order notifications from GrabFood's Order Webhook.
   * GrabFood sends JSON with orderID, buyer, cartItems, payment.
   */
  @Post('grabfood/webhook')
  @HttpCode(HttpStatus.OK)
  async grabFoodWebhook(@Body() payload: any) {
    this.logger.log(
      `GrabFood webhook received: orderID=${payload?.orderID}`,
    );

    if (!payload?.orderID) {
      throw new BadRequestException('Missing orderID in GrabFood webhook payload');
    }

    try {
      const normalized = this.aggregatorService.normalizeGrabFood(payload);
      const result = await this.aggregatorService.ingestOrder(normalized);
      return {
        ok: true,
        channel: 'grabfood',
        orderId: result.orderId,
        message: result.receiptMessage,
      };
    } catch (err: any) {
      if (err instanceof ConflictException) {
        return { ok: true, channel: 'grabfood', message: err.message };
      }
      throw err;
    }
  }

  // ── ShopeeFood Webhook ─────────────────────────────────────────────────────

  /**
   * POST /api/aggregator/shopeefood/webhook
   *
   * Receives order push events from ShopeeFood's Open API.
   * ShopeeFood sends JSON with order_sn, buyer_username, item_list, total_amount.
   */
  @Post('shopeefood/webhook')
  @HttpCode(HttpStatus.OK)
  async shopeeFoodWebhook(@Body() payload: any) {
    this.logger.log(
      `ShopeeFood webhook received: order_sn=${payload?.order_sn}`,
    );

    if (!payload?.order_sn) {
      throw new BadRequestException('Missing order_sn in ShopeeFood webhook payload');
    }

    try {
      const normalized = this.aggregatorService.normalizeShopeeFood(payload);
      const result = await this.aggregatorService.ingestOrder(normalized);
      return {
        ok: true,
        channel: 'shopeefood',
        orderId: result.orderId,
        message: result.receiptMessage,
      };
    } catch (err: any) {
      if (err instanceof ConflictException) {
        return { ok: true, channel: 'shopeefood', message: err.message };
      }
      throw err;
    }
  }
}
