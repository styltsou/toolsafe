# Publishing Notes

ToolSafe has a working CLI entrypoint, but the package is still marked private. Do not publish until the project owner explicitly decides the first public release scope.

## Current Package Shape

- Package name: `toolsafe`
- Runtime: Bun
- CLI bin: `toolsafe -> ./src/cli/index.ts`
- Package is currently private.

## Before Publishing

Complete this checklist before removing `private: true`:

- Confirm the package name and npm ownership.
- Decide the first public version.
- Confirm whether source TypeScript files are the intended published artifact.
- Add package metadata such as description, license, repository, and keywords.
- Run `bun run check`.
- Run `bun test`.
- Test the CLI through the package bin path.
- Review generated sample outputs for stale data.

## Release Notes

Initial release notes should clearly say ToolSafe is a static analyzer. Policy and eval outputs are advisory drafts and require runtime integration before they can enforce behavior or execute tests.
