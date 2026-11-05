#!/bin/sh
# Claude Code status line wrapper for Herdr's Minecraft HUD.
#
#   "statusLine": { "type": "command", "command": "~/.config/herdr-app/mods/mc/claude-usage.sh bun x ccusage statusline" }
#
# Saves the plan usage Claude Code passes to status lines (rate_limits: the
# 5-hour and weekly windows) to ~/.cache/herdr-mc/claude-usage.json, and each
# session's context window and cost to ~/.cache/herdr-mc/sessions/<terminal>.json
# (the Herdr terminal it runs in), then runs
# the real status line command (the arguments) on the same input. With no
# arguments it prints nothing.
input=$(cat)
dir="${XDG_CACHE_HOME:-$HOME/.cache}/herdr-mc"
mkdir -p "$dir"
# Only when this payload has rate limits (they come after a session's first
# response), so the last good numbers stay.
if printf '%s' "$input" | jq -e '.rate_limits.five_hour // .rate_limits.seven_day' >/dev/null 2>&1; then
  printf '%s' "$input" | jq -c '{at: (now | floor), rate_limits}' > "$dir/claude-usage.json.tmp" 2>/dev/null \
    && mv "$dir/claude-usage.json.tmp" "$dir/claude-usage.json"
fi
# Per session, under the Herdr terminal it runs in (HC_TERMINAL_ID): its
# context window and cost, for the XP bar.
if [ -n "$HC_TERMINAL_ID" ]; then
  mkdir -p "$dir/sessions"
  f="$dir/sessions/$(printf '%s' "$HC_TERMINAL_ID" | tr -c 'A-Za-z0-9_-' '_').json"
  printf '%s' "$input" | jq -c '{at: (now | floor), session: .session_id, model: .model.display_name,
      context: .context_window.used_percentage, size: .context_window.context_window_size,
      tokens: ((.context_window.current_usage // {}) | ((.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0))),
      cost: .cost.total_cost_usd}' > "$f.tmp" 2>/dev/null && mv "$f.tmp" "$f"
fi
[ $# -gt 0 ] && printf '%s' "$input" | exec "$@"
exit 0
