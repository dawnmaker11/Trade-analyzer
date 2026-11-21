# Implementation roadmap

Verified foundations: E01–E03 and fixture-backed E04 reconciliation.

Implemented Phase A building blocks include a real manual portfolio MVP with unresolved-symbol handling, FIFO holdings, owner-labelled manual marks and restart-persistence coverage; permission-gated market observations; manual evidence; a versioned manual research export/import contract; risk-limit configuration; synthetic paper orders/fills; reminders; and outcome tracking. Kite live connection code is ready for local credentials but awaits owner acceptance testing.

Next integration priorities: finish portfolio/research/reminder UI flows and research-card presentation; add manual factor/ownership context where source data exists; complete supplied-data chart comparison/marker views; complete paper market-mark, exits and performance views; broaden browser coverage; implement remaining evidence/event views; add operational recovery checks. Live broker, provider, model, and device-push acceptance remain blocked on external credentials/services.

See `docs/story-status.md` for story-level evidence and blockers.
