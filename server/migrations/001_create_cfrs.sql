-- Condition Found Reports.
CREATE TABLE cfrs (
    -- Client-generated UUID (no DEFAULT on purpose): the client owns identity, so a retried
    -- POST hits the primary key instead of creating a duplicate.
    id            uuid PRIMARY KEY,
    title         text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    description   text        NOT NULL DEFAULT '',
    ship_location text        NOT NULL CHECK (char_length(ship_location) BETWEEN 1 AND 200),
    -- text + CHECK instead of CREATE TYPE ... ENUM: adding a value later is a simple
    -- constraint swap, whereas enum types are awkward to alter/remove values from.
    severity      text        NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status        text        NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    -- timestamptz, set by the DB: one trusted clock, unaffected by client clock skew/timezones.
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- The list endpoint is "newest first"; this index serves that ORDER BY.
CREATE INDEX cfrs_created_at_idx ON cfrs (created_at DESC);
