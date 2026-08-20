CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS user_profiles (
    profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    life_status VARCHAR(30),
    user_identity VARCHAR(30),
    sleep_schedule VARCHAR(30),
    baseline_sleep VARCHAR(20),
    stress_sources TEXT [],
    coping_methods TEXT [],
    companion_style VARCHAR(30),
    preferred_elements TEXT [],
    user_target TEXT,
    allow_profile_personalization BOOLEAN NOT NULL DEFAULT FALSE,
    allow_history_analysis BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
CREATE TABLE daily_checkins (
    checkin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    mood_score SMALLINT CHECK (
        mood_score BETWEEN 1 AND 6
    ),
    stress_score SMALLINT CHECK (
        stress_score BETWEEN 1 AND 10
    ),
    sleep_score SMALLINT CHECK (
        sleep_score BETWEEN 1 AND 10
    ),
    energy_score SMALLINT CHECK (
        energy_score BETWEEN 1 AND 5
    ),
    input_type VARCHAR(20) DEFAULT 'text',
    note TEXT,
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_daily_checkins_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT unique_daily_checkin UNIQUE (user_id, checkin_date)
);