import type { Rule } from '@/core/types';
import { hasAnyInputField } from '@/core/schema';
import { includesAny } from '@/core/strings';
import { createFinding } from '@/rules/findings';
import { getOperationSearchText } from '@/rules/helpers';

const BATCH_KEYWORDS = ['batch', 'bulk', 'mass', 'bulk-update', 'bulk-delete', 'batch-create'];

const LIMIT_FIELDS = [
  'limit',
  'maxItems',
  'max_items',
  'batchSize',
  'batch_size',
  'maxRecords',
  'max_records',
  'count',
];

/**
 * Flags batch/bulk operations that do not accept a limit parameter,
 * which could let agents operate on unbounded sets of items.
 */
export const batchOperationRequiresLimitRule: Rule = {
  id: 'safety/batch-operation-requires-limit',
  name: 'Batch operation requires limit',
  description: 'Flags batch or bulk operations that do not expose a limit or max items parameter.',
  category: 'safety',
  defaultSeverity: 'warning',
  check: ({ tool }) => {
    const isBatch = includesAny(getOperationSearchText(tool), BATCH_KEYWORDS);

    if (!isBatch) {
      return [];
    }

    if (hasAnyInputField(tool, LIMIT_FIELDS)) {
      return [];
    }

    return [
      createFinding(batchOperationRequiresLimitRule, tool, {
        message: 'Batch operation does not expose a limit or max items parameter.',
        recommendation:
          'Add a limit, maxItems, or batchSize parameter so agents do not operate on unbounded item sets.',
        evidence: ['Batch/bulk keyword detected'],
      }),
    ];
  },
};
