import type { ScanResult } from '../types.js';

export const formatJson = (result: ScanResult): string => `${JSON.stringify(result, null, 2)}\n`;
