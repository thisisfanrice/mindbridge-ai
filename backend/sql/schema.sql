CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE daily_checkins (
    checkin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    mood_score SMALLINT NOT NULL
        CHECK (mood_score BETWEEN 1 AND 5),

    stress_score SMALLINT NOT NULL
        CHECK (stress_score BETWEEN 1 AND 5),

    sleep_score SMALLINT NOT NULL
        CHECK (sleep_score BETWEEN 1 AND 5),

    note TEXT,

    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_daily_checkins_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT unique_daily_checkin
        UNIQUE (user_id, checkin_date)
);