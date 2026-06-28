import type { Rule } from '@/core/types';
import { hasAnyQueryParameter } from '@/core/schema';
import { createFinding } from '@/rules/findings';
import { hasOperationIntentKeyword } from '@/rules/helpers';

const LIST_KEYWORDS = [
  'list',
  'search',
  'query',
  'all',
  'records',
  'customers',
  'users',
  'items',
  'events',
];

const PAGINATION_PARAMETERS = [
  'limit',
  'page',
  'pageSize',
  'page_size',
  'perPage',
  'per_page',
  'cursor',
  'offset',
  'next',
  'nextCursor',
];

/**
 * Flags likely collection reads that can return unbounded output.
 *
 * Agents need bounded result sets so context use, latency, and accidental data
 * exposure stay predictable.
 */
export const listRequiresPaginationRule: Rule = {
  id: 'schema/list-requires-pagination',
  name: 'List/search requires pagination or limit',
  description: 'Flags likely list/search GET operations that lack pagination or limit parameters.',
  category: 'agent_usability',
  defaultSeverity: 'warning',
  check: ({ tool }) => {
    const isLikelyList =
      tool.method === 'GET' &&
      !pathEndsWithParameter(tool.path) &&
      hasOperationIntentKeyword(tool, LIST_KEYWORDS);

    if (!isLikelyList || hasAnyQueryParameter(tool, PAGINATION_PARAMETERS)) {
      return [];
    }

    return [
      createFinding(listRequiresPaginationRule, tool, {
        message: 'List/search operation has no pagination or limit query parameter.',
        recommendation:
          'Expose limit, page, pageSize, cursor, or offset parameters to prevent unbounded agent outputs.',
        evidence: ['GET operation appears to return a collection'],
      }),
    ];
  },
};

function pathEndsWithParameter(path: string): boolean {
  const segments = path.split('/').filter(Boolean);
  const finalSegment = segments.at(-1);

  return finalSegment !== undefined && /^\{[^}]+\}$/.test(finalSegment);
}
