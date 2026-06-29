import type { Rule } from '@/core/types';
import { hasAnyQueryParameter } from '@/core/schema';
import { isObject } from '@/core/objects';
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
  'getAll',
  'browse',
  'index',
  'scan',
  'paginate',
  'enumerate',
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
  'startingAfter',
  'starting_after',
  'endingBefore',
  'ending_before',
  'pageToken',
  'page_token',
  'nextPageToken',
  'next_page_token',
  'previousPageToken',
  'previous_page_token',
  'take',
  'skip',
  'first',
  'last',
  'maxResults',
  'max_results',
];

/**
 * Flags likely collection reads that can return unbounded output.
 *
 * Agents need bounded result sets so context use, latency, and accidental data
 * exposure stay predictable.
 *
 * Detects:
 * - page-based pagination (page, pageSize, limit, offset, take/skip)
 * - cursor-based pagination (cursor, next, after, startingAfter, pageToken)
 * - hybrid patterns
 * - array responses as a secondary list signal
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
      (hasOperationIntentKeyword(tool, LIST_KEYWORDS) || hasArrayResponse(tool));

    if (!isLikelyList || hasAnyQueryParameter(tool, PAGINATION_PARAMETERS)) {
      return [];
    }

    return [
      createFinding(listRequiresPaginationRule, tool, {
        message: 'List/search operation has no pagination or limit query parameter.',
        recommendation:
          'Expose limit, page, pageSize, cursor, offset, take, startingAfter, or pageToken parameters to prevent unbounded agent outputs.',
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

function hasArrayResponse(tool: { responses: { schema?: unknown }[] }): boolean {
  return tool.responses.some(
    (response) => isObject(response.schema) && response.schema.type === 'array',
  );
}
