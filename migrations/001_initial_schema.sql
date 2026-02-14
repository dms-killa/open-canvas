-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (simplified - no auth needed)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255),
  username VARCHAR(100) DEFAULT 'local-user',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Documents table (replacing Supabase Storage)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  filename VARCHAR(500),
  content_type VARCHAR(100),
  file_data BYTEA,
  file_size BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vector embeddings for semantic search
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_text TEXT,
  embedding vector(768),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX ON document_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Reflections table (user style rules and memories)
CREATE TABLE reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  reflection_type VARCHAR(50),
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Custom quick actions
CREATE TABLE custom_quick_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(200),
  prompt TEXT,
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default local user
INSERT INTO users (id, email, username)
VALUES ('00000000-0000-0000-0000-000000000001', 'local@local.com', 'local-user');
