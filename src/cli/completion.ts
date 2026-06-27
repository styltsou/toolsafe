#!/usr/bin/env bun

export function generateBashCompletion(): string {
  return `_toolsafe() {
    local cur prev words cword
    _init_completion || return

    local commands="init lint report generate rules help"
    local global_opts="-V --version -h --help"

    if [[ $cword -eq 1 ]]; then
      COMPREPLY=($(compgen -W "$commands $global_opts" -- "$cur"))
      return
    fi

    case ${words[1]} in
      init)
        case $prev in
          -a|--analyze)
            return
            ;;
          *)
            COMPREPLY=($(compgen -W "-a --analyze" -- "$cur"))
            return
            ;;
        esac
        ;;
      lint)
        if [[ "$cur" == -* ]]; then
          COMPREPLY=($(compgen -W "--format --fail-on --config --proxy --header" -- "$cur"))
          return
        fi
        case $prev in
          --format)
            COMPREPLY=($(compgen -W "pretty json" -- "$cur"))
            return
            ;;
          --fail-on)
            COMPREPLY=($(compgen -W "warning error" -- "$cur"))
            return
            ;;
          --config|--proxy)
            COMPREPLY=($(compgen -f -- "$cur"))
            return
            ;;
          --header)
            return
            ;;
          *)
            COMPREPLY=($(compgen -f -- "$cur"))
            return
            ;;
        esac
        ;;
      report)
        if [[ "$cur" == -* ]]; then
          COMPREPLY=($(compgen -W "--format --out --config --proxy --header" -- "$cur"))
          return
        fi
        case $prev in
          --format)
            COMPREPLY=($(compgen -W "html json markdown sarif" -- "$cur"))
            return
            ;;
          --out|--config|--proxy)
            COMPREPLY=($(compgen -f -- "$cur"))
            return
            ;;
          --header)
            return
            ;;
          *)
            COMPREPLY=($(compgen -f -- "$cur"))
            return
            ;;
        esac
        ;;
      generate)
        if [[ "$cur" == -* ]]; then
          COMPREPLY=($(compgen -W "--kind --out --config --proxy --header" -- "$cur"))
          return
        fi
        case $prev in
          --kind)
            COMPREPLY=($(compgen -W "policy evals" -- "$cur"))
            return
            ;;
          --out|--config|--proxy)
            COMPREPLY=($(compgen -f -- "$cur"))
            return
            ;;
          --header)
            return
            ;;
          *)
            COMPREPLY=($(compgen -f -- "$cur"))
            return
            ;;
        esac
        ;;
      rules|help)
        return
        ;;
    esac
  } && complete -F _toolsafe toolsafe`;
}

export function generateZshCompletion(): string {
  return `#compdef toolsafe

_toolsafe() {
  local context state state_descr line
  typeset -A opt_args

  _arguments -C \\
    '-V[output version number]' \\
    '--version[output version number]' \\
    '-h[display help]' \\
    '--help[display help]' \\
    '1: :->cmds' \\
    '*:: :->args' && return

  case $state in
    cmds)
      _arguments '1:command:(init lint report generate rules help)'
      ;;
    args)
      case $line[1] in
        init)
          _arguments \\
            '(-a --analyze)'{-a,--analyze}'[Discover and lint OpenAPI specs in the project]'
          ;;
        lint)
          _arguments \\
            '--format[Output format]:format:(pretty json)' \\
            '--fail-on[Exit code threshold]:severity:(warning error)' \\
            '--config[Path to toolsafe.config.json]:config file:_files' \\
            '--proxy[HTTP proxy URL for remote spec fetching]:proxy url' \\
            '--header[Custom headers for remote spec fetching]:header' \\
            '*:file:_files'
          ;;
        report)
          _arguments \\
            '--format[Output format]:format:(html json markdown sarif)' \\
            '--out[Write report to file]:output file:_files' \\
            '--config[Path to toolsafe.config.json]:config file:_files' \\
            '--proxy[HTTP proxy URL for remote spec fetching]:proxy url' \\
            '--header[Custom headers for remote spec fetching]:header' \\
            '*:file:_files'
          ;;
        generate)
          _arguments \\
            '--kind[Output kind]:kind:(policy evals)' \\
            '--out[Write output to file]:output file:_files' \\
            '--config[Path to toolsafe.config.json]:config file:_files' \\
            '--proxy[HTTP proxy URL for remote spec fetching]:proxy url' \\
            '--header[Custom headers for remote spec fetching]:header' \\
            '*:file:_files'
          ;;
        rules|help)
          _arguments '*: :->none'
          ;;
      esac
      ;;
  esac
} && _toolsafe`;
}
