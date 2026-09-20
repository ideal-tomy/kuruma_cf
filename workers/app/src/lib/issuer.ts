export type IssuerProfile = {
  companyName: string;
  representative?: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  registrationNumber?: string;
};

export function parseIssuerFromJson(raw: string | undefined): IssuerProfile | null {
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const companyName = typeof o.companyName === 'string' ? o.companyName : null;
    if (!companyName) return null;
    return {
      companyName,
      representative: typeof o.representative === 'string' ? o.representative : undefined,
      postalCode: typeof o.postalCode === 'string' ? o.postalCode : undefined,
      address: typeof o.address === 'string' ? o.address : undefined,
      phone: typeof o.phone === 'string' ? o.phone : undefined,
      email: typeof o.email === 'string' ? o.email : undefined,
      registrationNumber:
        typeof o.registrationNumber === 'string' ? o.registrationNumber : undefined,
    };
  } catch {
    return null;
  }
}
