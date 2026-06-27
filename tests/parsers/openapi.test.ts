import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ToolsmithError } from "@/core/errors";
import { parseOpenApi } from "@/parsers/openapi";

describe("parseOpenApi", () => {
  test("parses a valid JSON OpenAPI file", async () => {
    const result = await parseOpenApi("tests/fixtures/simple-openapi.json");

    expect(result.metadata.title).toBe("Simple API");
    expect(result.metadata.version).toBe("1.0.0");
    expect(result.metadata.openapiVersion).toBe("3.0.0");
  });

  test("parses a valid YAML OpenAPI file", async () => {
    const result = await parseOpenApi("examples/risky-openapi.yaml");

    expect(result.metadata.title).toBe("Risky Example API");
    expect(result.metadata.version).toBe("1.0.0");
    expect(result.metadata.openapiVersion).toBe("3.0.0");
  });

  test("parses a valid OpenAPI 3.1 file", async () => {
    const result = await parseOpenApi("tests/fixtures/openapi-3-1.json");

    expect(result.metadata.title).toBe("OpenAPI 3.1 API");
    expect(result.metadata.version).toBe("1.0.0");
    expect(result.metadata.openapiVersion).toBe("3.1.0");
  });

  test("throws FILE_NOT_FOUND for missing files", async () => {
    await expect(parseOpenApi("tests/fixtures/missing.yaml")).rejects.toMatchObject({
      code: "FILE_NOT_FOUND",
    });
  });

  test("throws UNSUPPORTED_FILE_TYPE for unsupported extensions", async () => {
    await expect(parseOpenApi("README.md")).rejects.toMatchObject({
      code: "UNSUPPORTED_FILE_TYPE",
    });
  });

  test("throws OPENAPI_PARSE_ERROR for invalid YAML", async () => {
    const directory = await mkdtemp(join(tmpdir(), "toolsmith-invalid-openapi-"));
    const filePath = join(directory, "invalid-openapi.yaml");
    await writeFile(filePath, "openapi: 3.0.0\ninfo:\n  title: [broken\n");

    await expect(parseOpenApi(filePath)).rejects.toBeInstanceOf(ToolsmithError);
    await expect(parseOpenApi(filePath)).rejects.toMatchObject({
      code: "OPENAPI_PARSE_ERROR",
    });
  });

  test("throws OPENAPI_UNSUPPORTED_VERSION for Swagger 2.0", async () => {
    const directory = await mkdtemp(join(tmpdir(), "toolsmith-swagger-2-"));
    const filePath = join(directory, "swagger-2.json");
    await writeFile(
      filePath,
      JSON.stringify({
        swagger: "2.0",
        info: {
          title: "Old API",
          version: "1.0.0",
        },
        paths: {},
      }),
    );

    await expect(parseOpenApi(filePath)).rejects.toMatchObject({
      code: "OPENAPI_UNSUPPORTED_VERSION",
    });
  });
});
