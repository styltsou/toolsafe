import { z } from 'zod';

const RuleConfigSchema = z.union([
  z.literal('off'),
  z.literal('info'),
  z.literal('warning'),
  z.literal('error'),
]);

export const ToolSafeConfigSchema = z.object({
  rules: z.record(z.string(), RuleConfigSchema).optional(),
  lint: z
    .object({
      failOn: z.enum(['warning', 'error']).optional(),
    })
    .optional(),
  report: z
    .object({
      format: z.enum(['json', 'markdown', 'sarif']).optional(),
      out: z.string().optional(),
    })
    .optional(),
});

export type ToolSafeConfig = z.infer<typeof ToolSafeConfigSchema>;
