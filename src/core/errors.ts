export type ToolsmithErrorCode =
  | "FILE_NOT_FOUND"
  | "UNSUPPORTED_FILE_TYPE"
  | "OPENAPI_PARSE_ERROR"
  | "OPENAPI_UNSUPPORTED_VERSION";

/**
 * User-facing Toolsmith failure with a stable machine-readable code.
 *
 * CLI commands should catch this type and render concise messages instead of
 * leaking parser or filesystem stack traces.
 */
export class ToolsmithError extends Error {
  constructor(
    public readonly code: ToolsmithErrorCode,
    message: string,
    public readonly filePath?: string,
  ) {
    super(message);
    this.name = "ToolsmithError";
  }
}
