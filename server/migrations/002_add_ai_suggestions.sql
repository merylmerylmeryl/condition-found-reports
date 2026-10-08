-- AI-suggested triage values, stored apart from the reporter's own severity so the
-- human's input is never overwritten and the two can be compared (or audited) later.
-- All nullable: a report is valid without suggestions (AI disabled, failed or timed out),
-- and every row created before this migration simply has none.
ALTER TABLE cfrs
    ADD COLUMN ai_severity text CHECK (ai_severity IN ('low', 'medium', 'high', 'critical')),
    -- Closed set so the UI/filters can rely on it; 'other' is the model's escape hatch.
    ADD COLUMN ai_category text CHECK (ai_category IN
        ('structural', 'electrical', 'piping', 'corrosion', 'safety', 'mechanical', 'other')),
    ADD COLUMN ai_summary  text CHECK (char_length(ai_summary) <= 300),
    -- Provenance: which model produced it, so suggestions stay interpretable after model changes.
    ADD COLUMN ai_model    text,
    -- Suggestions are all-or-nothing: never a severity without a category/summary.
    ADD CONSTRAINT cfrs_ai_all_or_nothing CHECK (
        (ai_severity IS NULL AND ai_category IS NULL AND ai_summary IS NULL AND ai_model IS NULL)
        OR (ai_severity IS NOT NULL AND ai_category IS NOT NULL AND ai_summary IS NOT NULL AND ai_model IS NOT NULL)
    );
