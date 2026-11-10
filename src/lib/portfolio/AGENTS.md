# Free portfolio rules

- `/entrepreneurs/realisations` is the only free-portfolio entry: photos stay on-device (IndexedDB, 24 h TTL, localStorage fallback) until UNPRO auth, submission goes only through `submit_portfolio_project`, and optional job preferences reuse the `matching-profile` edge. Why: no anonymous uploads, one server cap/moderation truth, no parallel preference store.
