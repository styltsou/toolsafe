import { z } from 'zod';

const RuleConfigSchema = z.union([
  z.literal('off'),
  z.literal('info'),
  z.literal('warning'),
  z.literal('error'),
]);

const FetchConfigSchema = z.object({
  proxy: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

export const ToolSafeConfigSchema = z.object({
  rules: z.record(z.string(), RuleConfigSchema).optional(),
  lint: z
    .object({
      failOn: z.enum(['warning', 'error']).optional(),
    })
    .optional(),
  report: z
    .object({
      format: z.enum(['html', 'json', 'markdown', 'sarif']).optional(),
      out: z.string().optional(),
    })
    .optional(),
  fetch: FetchConfigSchema.optional(),
});

export type ToolSafeConfig = z.infer<typeof ToolSafeConfigSchema>;
