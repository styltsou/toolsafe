export type ToolSafeErrorCode =
  | 'FILE_NOT_FOUND'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'OPENAPI_PARSE_ERROR'
  | 'OPENAPI_UNSUPPORTED_VERSION'
  | 'FETCH_ERROR';

/**
 * User-facing ToolSafe failure with a stable machine-readable code.
 *
 * CLI commands should catch this type and render concise messages instead of
 * leaking parser or filesystem stack traces.
 */
export class ToolSafeError extends Error {
  constructor(
    public readonly code: ToolSafeErrorCode,
    message: string,
    public readonly filePath?: string,
  ) {
    super(message);
    this.name = 'ToolSafeError';
  }
}
