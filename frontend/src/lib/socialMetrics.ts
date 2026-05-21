const VARIANT_METRIC_SEPARATOR = '-variant-';

function sanitizeMetricPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

export function getVariantMetricId(gameId: string, variantId: string) {
  return `${sanitizeMetricPart(gameId)}${VARIANT_METRIC_SEPARATOR}${sanitizeMetricPart(variantId)}`;
}

export function isVariantMetricId(metricId: string) {
  return metricId.includes(VARIANT_METRIC_SEPARATOR);
}