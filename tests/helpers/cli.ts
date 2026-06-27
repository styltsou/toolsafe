export type CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export async function runCli(args: string[]): Promise<CliResult> {
  const proc = Bun.spawn([process.execPath, "run", "src/cli/index.ts", ...args], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NO_COLOR: "1",
    },
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return {
    exitCode,
    stdout,
    stderr,
  };
}
