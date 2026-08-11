# Current State

_Last updated: 2026-08-11 07:55 · mid-session checkpoint_

## Handoff (auto-summary — no explicit block found)


**Key points / decisions:**
- Verified rendering, not assumed
- Tracking retuned
- Mono was about to ship for nothing
- One thing I found and can't fix
- Verification

**Last assistant note:**
and can't fix

reCAPTCHA Enterprise pulls a **Roboto file from gstatic** at runtime. Not from our stylesheets — it's the App Check widget. Recorded in the commit; removing it means dropping App Check, which isn't a trade worth making for one font request.

## Verification

All visual checks pass at 1440/1024/390. 35 unit tests pass. I read the rendered screenshots rather than inferring from the build.

**C4 (spacing rhythm) is now unblocked** — it had to follow C1 because the new metrics change what correct spacing looks like. That's the last item in the spec, roughly half a day. Say the word.
