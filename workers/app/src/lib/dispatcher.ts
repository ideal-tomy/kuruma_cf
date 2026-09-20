import { quoteSectionAmounts, quoteTotalsForDisplay } from '@kuruma-cf/quote';
import type { AppEnv } from '../env';
import { buildIdempotencyKey, isNotificationIdempotencyDisabled } from './idempotency';
import type { CustomerOverview } from './extraction';
import { sendLineMessage } from './line';
import { parseQuoteRow } from './quote-db';
import { renderNotificationTemplate } from './template';
import { buildCustomerPortalToken, buildOptOutToken, buildQuoteShareToken } from './tokens';
import { computeEstimatedMileage, daysUntil, nextOilTargetKm } from './mileage';
import { newId } from './ids';
import { nowIso, todayDate } from './time';
import type { ConsentRow, CustomerRow, QuoteRow, TemplateVersionRow, VehicleRow } from '../types';

export type DispatchResult = {
  customerId: string;
  channel: string;
  jobId: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  message: string;
  errorCode?: string;
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${y}/${m}/${d}` : iso.slice(0, 10);
}

function formatYen(n: number): string {
  return `¥${n.toLocaleString('ja-JP')}`;
}

export async function loadActiveTemplate(
  db: D1Database,
  templateKey: string,
  channel: string,
): Promise<TemplateVersionRow | null> {
  return db
    .prepare(
      `SELECT * FROM template_versions
       WHERE template_key = ? AND channel = ? AND active = 1
       ORDER BY version DESC LIMIT 1`,
    )
    .bind(templateKey, channel)
    .first<TemplateVersionRow>();
}

export async function buildMessageVariables(
  env: AppEnv['Bindings'],
  db: D1Database,
  overview: CustomerOverview,
): Promise<Record<string, string>> {
  const siteUrl = (env.SITE_URL ?? 'http://localhost:8788').replace(/\/$/, '');
  const estimated =
    overview.estimatedMileage ??
    computeEstimatedMileage(
      overview.initialMileage,
      overview.initialMileageRecordedAt,
      overview.monthlyAvgKm,
    ) ??
    0;
  const oilInterval = overview.oilIntervalKm ?? 4000;
  const oilTarget = nextOilTargetKm(
    overview.lastOilChangeMileage,
    overview.initialMileage,
    oilInterval,
  );
  const days = overview.daysUntilInspection ?? daysUntil(overview.inspectionExpireDate) ?? 0;

  let portalUrl = siteUrl;
  let quoteUrl = siteUrl;
  let grandTotal = '（見積未発行）';
  let legalFeesTotal = '—';
  let baseInspectionFee = '—';
  let minimumTotal = '—';
  let additionalTotal = '—';
  let legalFeesBreakdown = '（見積発行後に表示されます）';
  let validUntil = '—';

  if (env.CUSTOMER_PORTAL_SECRET) {
    const token = await buildCustomerPortalToken(env.CUSTOMER_PORTAL_SECRET, overview.customerId);
    portalUrl = `${siteUrl}/p/${token}#quote`;
  }

  const quoteRow = await db
    .prepare(
      `SELECT * FROM quotes WHERE vehicle_id = ? AND status = 'ISSUED'
       ORDER BY issued_at DESC LIMIT 1`,
    )
    .bind(overview.vehicleId)
    .first<QuoteRow>();

  if (quoteRow) {
    const parsed = parseQuoteRow(quoteRow);
    const totals = quoteTotalsForDisplay({
      legal_items: parsed.legalItems,
      service_items: parsed.serviceItems,
      grand_total: parsed.grandTotal,
      total_amount: parsed.totalAmount,
    });
    const amounts = quoteSectionAmounts(totals.legal, totals.service);
    grandTotal = formatYen(totals.grand_total);
    legalFeesTotal = amounts.legalTotal.toLocaleString('ja-JP');
    baseInspectionFee = amounts.baseInspectionFee.toLocaleString('ja-JP');
    minimumTotal = amounts.minimumTotal.toLocaleString('ja-JP');
    additionalTotal = amounts.additionalTotal.toLocaleString('ja-JP');
    legalFeesBreakdown = totals.legal.map((i) => `・${i.label} ${i.amount.toLocaleString('ja-JP')}円`).join('\n');
    validUntil = formatDate(quoteRow.valid_until) || '—';
    if (env.QUOTE_SHARE_SECRET) {
      const token = await buildQuoteShareToken(env.QUOTE_SHARE_SECRET, quoteRow.id);
      quoteUrl = `${siteUrl}/q/${token}`;
    }
  }

  let unsubscribeUrl = siteUrl;
  if (env.OPT_OUT_SECRET) {
    const token = await buildOptOutToken(env.OPT_OUT_SECRET, overview.customerId, 'LINE');
    unsubscribeUrl = `${siteUrl}/u/${token}`;
  }

  const vehicleName = `${overview.maker} ${overview.model}`.trim() || 'お車';

  return {
    name: overview.name,
    carName: vehicleName,
    vehicleName,
    plate: overview.plate ?? '',
    expireDate: formatDate(overview.inspectionExpireDate),
    daysLeft: String(days),
    mileage: estimated.toLocaleString('ja-JP'),
    nextOilTargetKm: oilTarget.toLocaleString('ja-JP'),
    oilIntervalKm: oilInterval.toLocaleString('ja-JP'),
    portalUrl,
    quoteUrl,
    bookingUrl: `${portalUrl}#booking`,
    unsubscribeUrl,
    maintenanceInfoUrl: `${siteUrl}/info/maintenance`,
    oilInfoUrl: `${siteUrl}/info/oil`,
    legalFeesTotal,
    baseInspectionFee,
    minimumTotal,
    additionalTotal,
    legalFeesBreakdown,
    grandTotal,
    validUntil,
  };
}

export async function dispatchNotification(
  env: AppEnv['Bindings'],
  db: D1Database,
  args: {
    customerId: string;
    vehicleId: string;
    channel: 'LINE';
    ruleKey: string;
    templateKey: string;
    requestedBy?: string | null;
    contentOverride?: string;
  },
): Promise<DispatchResult> {
  const customer = await db.prepare('SELECT * FROM customers WHERE id = ?')
    .bind(args.customerId)
    .first<CustomerRow>();
  if (!customer) {
    return {
      customerId: args.customerId,
      channel: args.channel,
      jobId: null,
      status: 'FAILED',
      message: '顧客が見つかりません',
      errorCode: 'NOT_FOUND',
    };
  }

  const consent = await db
    .prepare('SELECT * FROM consents WHERE customer_id = ? AND channel = ?')
    .bind(args.customerId, args.channel)
    .first<ConsentRow>();
  if (consent && consent.opt_in === 0) {
    return {
      customerId: args.customerId,
      channel: args.channel,
      jobId: null,
      status: 'CANCELLED',
      message: '配信停止 (opt-out)',
      errorCode: 'OPT_OUT',
    };
  }

  const vehicle = await db.prepare('SELECT * FROM vehicles WHERE id = ?')
    .bind(args.vehicleId)
    .first<VehicleRow>();

  const overview: CustomerOverview = {
    customerId: customer.id,
    name: customer.name,
    furigana: customer.furigana,
    phone: customer.phone,
    email: customer.email,
    lineUserId: customer.line_user_id,
    status: customer.status,
    vehicleId: args.vehicleId,
    maker: vehicle?.maker ?? '',
    model: vehicle?.model ?? '',
    plate: vehicle?.plate ?? '',
    inspectionExpireDate: vehicle?.inspection_expire_date ?? '',
    initialMileage: vehicle?.initial_mileage ?? 0,
    initialMileageRecordedAt: vehicle?.initial_mileage_recorded_at ?? todayDate(),
    monthlyAvgKm: vehicle?.monthly_avg_km ?? null,
    lastOilChangeMileage: vehicle?.last_oil_change_mileage ?? null,
    lastOilChangeAt: vehicle?.last_oil_change_at ?? null,
    oilIntervalKm: vehicle?.oil_interval_km ?? 4000,
    estimatedMileage: vehicle
      ? computeEstimatedMileage(
          vehicle.initial_mileage,
          vehicle.initial_mileage_recorded_at,
          vehicle.monthly_avg_km,
        )
      : null,
    daysUntilInspection: vehicle ? daysUntil(vehicle.inspection_expire_date) : null,
    hasLine: Boolean(customer.line_user_id),
    hasConsent: true,
  };

  const template = await loadActiveTemplate(db, args.templateKey, args.channel);
  if (!template) {
    return {
      customerId: args.customerId,
      channel: args.channel,
      jobId: null,
      status: 'FAILED',
      message: 'テンプレートが見つかりません',
      errorCode: 'NO_TEMPLATE',
    };
  }

  const vars = await buildMessageVariables(env, db, overview);
  let content: string;
  try {
    content =
      args.contentOverride?.trim() ?
        args.contentOverride
      : renderNotificationTemplate(template.content, vars);
    if (/\{\{[\s\S]*?\}\}/.test(content)) {
      throw new Error('文面に未解決の差し込み項目があります');
    }
  } catch (error) {
    return {
      customerId: args.customerId,
      channel: args.channel,
      jobId: null,
      status: 'FAILED',
      message: error instanceof Error ? error.message : '文面を確認してください',
      errorCode: 'INVALID_TEMPLATE',
    };
  }

  const idempotencyDisabled = isNotificationIdempotencyDisabled(env);
  const idempotencyKey = await buildIdempotencyKey({
    customerId: args.customerId,
    ruleKey: args.ruleKey,
    channel: args.channel,
    nonce: idempotencyDisabled ? String(Date.now()) : undefined,
  });

  if (!idempotencyDisabled) {
    const existing = await db
      .prepare('SELECT id, status FROM notification_jobs WHERE idempotency_key = ?')
      .bind(idempotencyKey)
      .first<{ id: string; status: string }>();
    if (existing?.status === 'SENT') {
      return {
        customerId: args.customerId,
        channel: args.channel,
        jobId: existing.id,
        status: 'SENT',
        message: '本日同じルールで送信済み（冪等キーヒット）',
      };
    }
  }

  const jobId = newId();
  const ts = nowIso();
  const payload = JSON.stringify({ content, ruleKey: args.ruleKey });

  try {
    await db
      .prepare(
        `INSERT INTO notification_jobs (
          id, customer_id, vehicle_id, rule_key, channel, template_key,
          scheduled_at, status, attempts, idempotency_key, payload,
          requested_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, ?, ?, ?, ?)`,
      )
      .bind(
        jobId,
        args.customerId,
        args.vehicleId,
        args.ruleKey,
        args.channel,
        args.templateKey,
        ts,
        idempotencyKey,
        payload,
        args.requestedBy ?? null,
        ts,
        ts,
      )
      .run();
  } catch {
    const existing = await db
      .prepare('SELECT id, status FROM notification_jobs WHERE idempotency_key = ?')
      .bind(idempotencyKey)
      .first<{ id: string; status: string }>();
    if (existing?.status === 'SENT') {
      return {
        customerId: args.customerId,
        channel: args.channel,
        jobId: existing.id,
        status: 'SENT',
        message: '本日同じルールで送信済み（冪等キーヒット）',
      };
    }
    return {
      customerId: args.customerId,
      channel: args.channel,
      jobId: null,
      status: 'FAILED',
      message: 'ジョブ登録に失敗',
      errorCode: 'JOB_INSERT',
    };
  }

  const providerResult = await sendLineMessage(
    env.LINE_CHANNEL_ACCESS_TOKEN,
    customer.line_user_id ?? '',
    content,
    false,
  );

  const finalStatus = providerResult.success ? 'SENT' : 'FAILED';
  await db
    .prepare(
      `UPDATE notification_jobs SET status = ?, attempts = 1, last_error = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(
      finalStatus,
      providerResult.success ? null : providerResult.errorMessage ?? null,
      nowIso(),
      jobId,
    )
    .run();

  await db
    .prepare(
      `INSERT INTO notification_logs (
        id, job_id, provider, provider_message_id, result, error_code, error_message, payload, sent_at
      ) VALUES (?, ?, 'line', ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      newId(),
      jobId,
      providerResult.providerMessageId ?? null,
      providerResult.success ? 'SUCCESS' : 'FAILED',
      providerResult.errorCode ?? null,
      providerResult.errorMessage ?? null,
      JSON.stringify({ preview: content.slice(0, 200) }),
      nowIso(),
    )
    .run();

  return {
    customerId: args.customerId,
    channel: args.channel,
    jobId,
    status: finalStatus,
    message: providerResult.success ? '送信しました' : providerResult.errorMessage ?? '送信失敗',
    errorCode: providerResult.errorCode,
  };
}

export async function retryNotificationJob(
  env: AppEnv['Bindings'],
  db: D1Database,
  jobId: string,
): Promise<DispatchResult> {
  const job = await db.prepare('SELECT * FROM notification_jobs WHERE id = ?')
    .bind(jobId)
    .first<{
      id: string;
      customer_id: string;
      vehicle_id: string | null;
      rule_key: string;
      channel: string;
      template_key: string;
      payload: string;
      status: string;
    }>();
  if (!job) {
    return {
      customerId: '',
      channel: 'LINE',
      jobId: null,
      status: 'FAILED',
      message: 'ジョブが見つかりません',
      errorCode: 'NOT_FOUND',
    };
  }

  const payload = JSON.parse(job.payload || '{}') as { content?: string };
  const customer = await db.prepare('SELECT line_user_id FROM customers WHERE id = ?')
    .bind(job.customer_id)
    .first<{ line_user_id: string | null }>();

  const providerResult = await sendLineMessage(
    env.LINE_CHANNEL_ACCESS_TOKEN,
    customer?.line_user_id ?? '',
    payload.content ?? '',
    false,
  );

  const finalStatus = providerResult.success ? 'SENT' : 'FAILED';
  await db
    .prepare(
      `UPDATE notification_jobs SET status = ?, attempts = attempts + 1, last_error = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(
      finalStatus,
      providerResult.success ? null : providerResult.errorMessage ?? null,
      nowIso(),
      jobId,
    )
    .run();

  await db
    .prepare(
      `INSERT INTO notification_logs (
        id, job_id, provider, provider_message_id, result, error_code, error_message, payload, sent_at
      ) VALUES (?, ?, 'line', ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      newId(),
      jobId,
      providerResult.providerMessageId ?? null,
      providerResult.success ? 'SUCCESS' : 'FAILED',
      providerResult.errorCode ?? null,
      providerResult.errorMessage ?? null,
      JSON.stringify({ retry: true }),
      nowIso(),
    )
    .run();

  return {
    customerId: job.customer_id,
    channel: job.channel,
    jobId,
    status: finalStatus,
    message: providerResult.success ? '再送しました' : providerResult.errorMessage ?? '再送失敗',
    errorCode: providerResult.errorCode,
  };
}
