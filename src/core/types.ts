export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type SideEffectType =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'external_communication'
  | 'financial'
  | 'permission_change'
  | 'execution'
  | 'unknown';

export type ParameterLocation = 'path' | 'query' | 'header' | 'cookie' | 'body';

/**
 * ToolSafe's flattened view of an OpenAPI parameter or simple body field.
 *
 * The `body` location is reserved for later schema expansion; Milestone 2 only
 * emits OpenAPI path/query/header/cookie parameters.
 */
export type NormalizedParameter = {
  name: string;
  in: ParameterLocation;
  required: boolean;
  schema?: unknown;
  description?: string | undefined;
};

/**
 * Minimal response shape used by rules.
 *
 * Rules only need status, description, and the selected response schema in v0;
 * media-type details remain available from `NormalizedTool.operation`.
 */
export type NormalizedResponse = {
  statusCode: string;
  description?: string | undefined;
  schema?: unknown;
};

/**
 * The central operation model consumed by risk classification, rules, reports,
 * eval generation, and policy generation.
 *
 * Keep this type small and deterministic. It should represent the parts of
 * OpenAPI that make an operation useful or risky as an agent-callable tool.
 */
export type NormalizedTool = {
  id: string;
  operationId?: string | undefined;
  name: string;
  method: HttpMethod;
  path: string;
  summary?: string | undefined;
  description?: string | undefined;
  tags: string[];
  parameters: NormalizedParameter[];
  requestBodySchema?: unknown;
  responses: NormalizedResponse[];
  security?: unknown[] | undefined;
  /** The operation subtree from the dereferenced document, including vendor extensions. */
  operation: unknown;
};

export type FindingSeverity = 'info' | 'warning' | 'error';

export type FindingCategory = 'safety' | 'schema' | 'docs' | 'errors' | 'agent_usability' | 'auth';

/**
 * A single actionable rule result.
 *
 * Findings are intentionally verbose because both humans and downstream agents
 * need stable evidence and recommendations, not just pass/fail status.
 */
export type Finding = {
  ruleId: string;
  severity: FindingSeverity;
  category: FindingCategory;
  toolId: string;
  toolName: string;
  method: HttpMethod;
  path: string;
  message: string;
  recommendation: string;
  evidence?: string[] | undefined;
};

/**
 * Context passed to every rule.
 *
 * `allTools` allows later cross-operation checks while keeping single-operation
 * rules easy to test.
 */
export type RuleContext = {
  tool: NormalizedTool;
  allTools: NormalizedTool[];
};

/**
 * Deterministic lint rule contract.
 *
 * Rules must not mutate tools, read files, call networks, or depend on time.
 */
export type Rule = {
  id: string;
  name: string;
  description: string;
  category: FindingCategory;
  defaultSeverity: FindingSeverity;
  check: (ctx: RuleContext) => Finding[];
};

export type ToolRiskSummary = {
  toolId: string;
  toolName: string;
  method: HttpMethod;
  path: string;
  risk: RiskLevel;
  reasons: string[];
};

export type AnalysisResult = {
  input: {
    filePath: string;
    title?: string | undefined;
    version?: string | undefined;
  };
  summary: {
    totalTools: number;
    readOnlyTools: number;
    mutatingTools: number;
    destructiveTools: number;
    highRiskTools: number;
    findingCounts: {
      info: number;
      warning: number;
      error: number;
    };
  };
  scores: {
    overall: number;
    safety: number;
    schema: number;
    docs: number;
    errors: number;
    agentUsability: number;
    auth: number;
  };
  tools: ToolRiskSummary[];
  findings: Finding[];
};
