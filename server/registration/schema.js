// Migrations du module d'inscription. 100 % additives : uniquement
// CREATE ... IF NOT EXISTS. Aucune table existante (candidates, transactions,
// settings, ...) n'est modifiee, vidée ou supprimee.
async function initRegistrationSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS registration_applications (
      id SERIAL PRIMARY KEY,
      reference TEXT UNIQUE NOT NULL,
      tracking_code_hash TEXT NOT NULL,
      edition TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL,
      first_names TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('Miss','Mister')),
      birth_date DATE NOT NULL,
      nationality TEXT NOT NULL,
      city TEXT NOT NULL,
      phone TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      field_of_study TEXT NOT NULL,
      study_level TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      answers JSONB NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'submitted',
      public_message TEXT NOT NULL DEFAULT '',
      is_complete BOOLEAN NOT NULL DEFAULT FALSE,
      track_failed_attempts INTEGER NOT NULL DEFAULT 0,
      track_locked_until TIMESTAMPTZ,
      submitted_ip_hash TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_reg_app_status ON registration_applications(status);
    CREATE INDEX IF NOT EXISTS idx_reg_app_category ON registration_applications(category);
    CREATE INDEX IF NOT EXISTS idx_reg_app_created ON registration_applications(created_at DESC);
    -- Un meme numero de telephone ne peut deposer qu'un dossier actif.
    CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_app_phone_active
      ON registration_applications(phone) WHERE status <> 'withdrawn';

    CREATE TABLE IF NOT EXISTS registration_documents (
      id SERIAL PRIMARY KEY,
      application_id INTEGER NOT NULL REFERENCES registration_applications(id) ON DELETE CASCADE,
      doc_type TEXT NOT NULL,
      storage_key TEXT UNIQUE NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      sha256 TEXT NOT NULL,
      data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (application_id, doc_type)
    );

    CREATE TABLE IF NOT EXISTS registration_status_history (
      id SERIAL PRIMARY KEY,
      application_id INTEGER NOT NULL REFERENCES registration_applications(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL DEFAULT 'status',
      old_status TEXT,
      new_status TEXT,
      note TEXT NOT NULL DEFAULT '',
      visible_to_candidate BOOLEAN NOT NULL DEFAULT FALSE,
      changed_by TEXT NOT NULL DEFAULT 'system',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_reg_hist_app ON registration_status_history(application_id, created_at);

    CREATE TABLE IF NOT EXISTS registration_consents (
      id SERIAL PRIMARY KEY,
      application_id INTEGER NOT NULL REFERENCES registration_applications(id) ON DELETE CASCADE,
      consent_type TEXT NOT NULL,
      accepted BOOLEAN NOT NULL,
      rules_version TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS registration_notifications (
      id SERIAL PRIMARY KEY,
      application_id INTEGER REFERENCES registration_applications(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'email',
      recipient TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ
    );
  `);
}

module.exports = { initRegistrationSchema };
