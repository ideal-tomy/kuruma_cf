import type {
  Customer,
  CustomerInput,
  LineUnmatchedItem,
  ListResponse,
  NotificationJob,
  Quote,
  QuoteLineItem,
  ServiceHistory,
  Vehicle,
  VehicleInput,
} from './types';

export type HealthResponse = {
  ok: boolean;
  service: string;
  db: boolean;
  phase: number;
  ts: string;
};

export type HomeResponse = {
  needsAction: {
    lineUnmatched: number;
    sendFailed: number;
  };
  lists: { rule: string; count: number }[];
  phase: number;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/api/health');
}

export async function fetchHome(): Promise<HomeResponse> {
  return request<HomeResponse>('/api/home');
}

export async function fetchList(rule: string): Promise<ListResponse> {
  return request<ListResponse>(`/api/lists/${encodeURIComponent(rule)}`);
}

export async function fetchMe(): Promise<{ authenticated: boolean; email?: string } | null> {
  const res = await fetch('/api/auth/me', { credentials: 'include' });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error('Failed to fetch session');
  return res.json();
}

export async function login(email: string, password: string): Promise<void> {
  await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<void> {
  await request('/api/auth/logout', { method: 'POST' });
}

export async function listCustomers(q?: string): Promise<Customer[]> {
  const query = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
  const data = await request<{ customers: Customer[] }>(`/api/customers${query}`);
  return data.customers;
}

export async function getCustomer(id: string): Promise<Customer> {
  return request<Customer>(`/api/customers/${id}`);
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  return request<Customer>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateCustomer(id: string, input: Partial<CustomerInput>): Promise<Customer> {
  return request<Customer>(`/api/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function createVehicle(customerId: string, input: VehicleInput): Promise<Vehicle> {
  return request<Vehicle>(`/api/customers/${customerId}/vehicles`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateVehicle(id: string, input: Partial<VehicleInput>): Promise<Vehicle> {
  return request<Vehicle>(`/api/vehicles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function fetchVehicleQuotes(vehicleId: string): Promise<{
  vehicle: {
    id: string;
    customerId: string;
    maker: string;
    model: string;
    plate: string;
    inspectionExpireDate: string;
  };
  quotes: Quote[];
  shareUrlsByQuoteId: Record<string, string | null>;
  portalUrl: string | null;
  optOutUrl: string | null;
}> {
  return request(`/api/quotes/vehicle/${vehicleId}`);
}

export async function generateQuote(
  vehicleId: string,
  opts?: { includeOil?: boolean; notesAppend?: string },
): Promise<{ id: string; grandTotal: number }> {
  return request('/api/quotes/generate', {
    method: 'POST',
    body: JSON.stringify({
      vehicleId,
      includeOil: opts?.includeOil,
      notesAppend: opts?.notesAppend,
    }),
  });
}

export async function updateQuote(
  id: string,
  input: {
    legalItems: QuoteLineItem[];
    serviceItems: QuoteLineItem[];
    notes?: string | null;
    status?: string;
  },
): Promise<{ ok: boolean; grandTotal: number }> {
  return request(`/api/quotes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      legal_items: input.legalItems,
      service_items: input.serviceItems,
      notes: input.notes,
      status: input.status,
    }),
  });
}

export async function listServiceHistories(vehicleId: string): Promise<ServiceHistory[]> {
  const data = await request<{ histories: ServiceHistory[] }>(
    `/api/vehicles/${vehicleId}/service-histories`,
  );
  return data.histories;
}

export async function previewNotification(input: {
  customerId: string;
  vehicleId: string;
  rule: string;
}): Promise<{ content: string; templateKey: string; ruleKey: string }> {
  return request('/api/notifications/preview', {
    method: 'POST',
    body: JSON.stringify({
      customerId: input.customerId,
      vehicleId: input.vehicleId,
      rule: input.rule,
      channel: 'LINE',
    }),
  });
}

export async function sendNotification(input: {
  rule: string;
  customerIds: { customerId: string; vehicleId: string }[];
  contentOverride?: string;
}): Promise<{ sent: number; failed: number }> {
  return request('/api/notifications/send', {
    method: 'POST',
    body: JSON.stringify({ ...input, channel: 'LINE' }),
  });
}

export async function fetchNotificationLogs(opts?: {
  status?: string;
  q?: string;
  unresolved?: boolean;
}): Promise<NotificationJob[]> {
  const params = new URLSearchParams();
  if (opts?.status) params.set('status', opts.status);
  if (opts?.q) params.set('q', opts.q);
  if (opts?.unresolved) params.set('unresolved', '1');
  const data = await request<{ jobs: NotificationJob[] }>(
    `/api/notifications/logs?${params}`,
  );
  return data.jobs;
}

export async function retryNotifications(jobIds: string[]): Promise<void> {
  await request('/api/notifications/retry', {
    method: 'POST',
    body: JSON.stringify({ jobIds }),
  });
}

export async function fetchLineUnmatched(): Promise<LineUnmatchedItem[]> {
  const data = await request<{ items: LineUnmatchedItem[] }>('/api/line/unmatched');
  return data.items;
}

export async function linkLineUser(lineUserId: string, customerId: string): Promise<void> {
  await request(`/api/line/unmatched/${encodeURIComponent(lineUserId)}/link`, {
    method: 'POST',
    body: JSON.stringify({ customerId }),
  });
}
