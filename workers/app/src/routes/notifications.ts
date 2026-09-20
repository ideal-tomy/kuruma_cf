import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { badRequest, notFound } from '../lib/errors';
import {
  buildMessageVariables,
  dispatchNotification,
  loadActiveTemplate,
  retryNotificationJob,
} from '../lib/dispatcher';
import { isListRule, loadOverviewFromDb } from '../lib/extraction';
import type { NotificationJobRow } from '../types';
import { LIST_TO_RULE_KEY, resolveTemplateKey } from '../lib/rule-map';
import { renderNotificationTemplate } from '../lib/template';

const notifications = new Hono<AppEnv>();

notifications.post('/preview', async (c) => {
  const body = await c.req.json<{
    customerId?: string;
    vehicleId?: string;
    rule?: string;
    channel?: string;
    templateKey?: string;
  }>();
  if (!body.customerId || !body.vehicleId || !body.rule) {
    return badRequest(c, 'customerId, vehicleId, rule are required');
  }
  const channel = body.channel ?? 'LINE';
  const templateKey = resolveTemplateKey(body.rule, body.templateKey);

  const overview = await loadOverviewFromDb(c.env.DB);
  const target = overview.find(
    (o) => o.customerId === body.customerId && o.vehicleId === body.vehicleId,
  );
  if (!target) return notFound(c, 'customer/vehicle not found');

  const template = await loadActiveTemplate(c.env.DB, templateKey, channel);
  if (!template) return notFound(c, 'template not found');

  const vars = await buildMessageVariables(c.env, c.env.DB, target);
  try {
    const hasQuote = vars.grandTotal !== '（見積未発行）';
    return c.json({
      subject: template.subject ? renderNotificationTemplate(template.subject, vars) : null,
      content: renderNotificationTemplate(template.content, vars),
      templateKey,
      ruleKey: isListRule(body.rule) ? LIST_TO_RULE_KEY[body.rule] : body.rule,
      summary: {
        hasQuote,
        grandTotal: vars.grandTotal,
        legalFeesTotal: vars.legalFeesTotal,
        minimumTotal: vars.minimumTotal,
        baseInspectionFee: vars.baseInspectionFee,
        portalUrl: vars.portalUrl,
        quoteUrl: vars.quoteUrl,
      },
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : '文面を確認してください' },
      422,
    );
  }
});

notifications.post('/send', async (c) => {
  const body = await c.req.json<{
    rule?: string;
    customerIds?: { customerId: string; vehicleId: string }[];
    channel?: string;
    templateKey?: string;
    contentOverride?: string;
  }>();
  if (!body.rule || !body.customerIds?.length) {
    return badRequest(c, 'rule and customerIds are required');
  }
  const channel = (body.channel ?? 'LINE') as 'LINE';
  if (channel !== 'LINE') return badRequest(c, 'v1 supports LINE only');
  const ruleKey = isListRule(body.rule) ? LIST_TO_RULE_KEY[body.rule] : body.rule;
  const templateKey = resolveTemplateKey(body.rule, body.templateKey);

  const results = [];
  for (const item of body.customerIds) {
    const result = await dispatchNotification(c.env, c.env.DB, {
      customerId: item.customerId,
      vehicleId: item.vehicleId,
      channel,
      ruleKey,
      templateKey,
      requestedBy: c.var.sessionEmail,
      contentOverride: body.contentOverride,
    });
    results.push(result);
  }

  const sent = results.filter((r) => r.status === 'SENT').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;
  return c.json({ sent, failed, results });
});

notifications.post('/retry', async (c) => {
  const body = await c.req.json<{ jobIds?: string[] }>();
  if (!body.jobIds?.length) return badRequest(c, 'jobIds are required');

  const results = [];
  for (const jobId of body.jobIds) {
    results.push(await retryNotificationJob(c.env, c.env.DB, jobId));
  }
  return c.json({ results });
});

notifications.get('/logs', async (c) => {
  const status = c.req.query('status');
  const q = c.req.query('q')?.trim();
  const unresolved = c.req.query('unresolved') === '1';

  let sql = `
    SELECT j.*, c.name as customer_name, c.phone as customer_phone, v.plate as vehicle_plate
    FROM notification_jobs j
    JOIN customers c ON c.id = j.customer_id
    LEFT JOIN vehicles v ON v.id = j.vehicle_id
    WHERE 1=1
  `;
  const binds: string[] = [];
  if (status) {
    sql += ' AND j.status = ?';
    binds.push(status);
  }
  if (unresolved) {
    sql += " AND j.status = 'FAILED'";
  }
  if (q) {
    sql += ' AND (c.name LIKE ? OR j.template_key LIKE ? OR j.rule_key LIKE ?)';
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += ` ORDER BY
    CASE j.status WHEN 'FAILED' THEN 0 WHEN 'PENDING' THEN 1 ELSE 2 END,
    j.created_at DESC
    LIMIT 200`;

  const stmt = c.env.DB.prepare(sql);
  const { results } = await (binds.length ? stmt.bind(...binds) : stmt).all<
    NotificationJobRow & {
      customer_name: string;
      customer_phone: string | null;
      vehicle_plate: string | null;
    }
  >();

  return c.json({
    jobs: (results ?? []).map((row) => ({
      id: row.id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      vehicleId: row.vehicle_id,
      vehiclePlate: row.vehicle_plate,
      ruleKey: row.rule_key,
      channel: row.channel,
      templateKey: row.template_key,
      status: row.status,
      attempts: row.attempts,
      lastError: row.last_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  });
});

export { notifications };
