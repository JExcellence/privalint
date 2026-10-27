export const REPORT_SCHEMA_VERSION = '1.1.0';
export const SUPPORTED_REPORT_SCHEMAS = ['1.0.0', REPORT_SCHEMA_VERSION] as const;

export type ReportSchemaIdentity =
  | { kind: 'legacy' }
  | { kind: 'supported'; version: string }
  | { kind: 'unsupported'; version?: string };

/** Classification only, not structural validation. Never upgrades legacy data to success. */
export function identifyReportSchema(value: unknown): ReportSchemaIdentity {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return { kind: 'unsupported' };
  if (!Object.hasOwn(value, 'schemaVersion')) return { kind: 'legacy' };
  const version = Reflect.get(value, 'schemaVersion');
  if (typeof version !== 'string') return { kind: 'unsupported' };
  return SUPPORTED_REPORT_SCHEMAS.some((supported) => supported === version)
    ? { kind: 'supported', version }
    : { kind: 'unsupported', version };
}
