<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Chat assistant: streaming /api/chat route using AI Gateway (openai/gpt-6-astra, Responses); business context lives in src/lib/ai/assistant-context.server.ts; history in sessionStorage only.
- Booking: server fns call Google Calendar via connector gateway (freeBusy + events with Meet, sendUpdates=all so Google emails the invite).
