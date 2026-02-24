-- Run this in your Supabase SQL Editor to create the semantic search RPC

CREATE OR REPLACE FUNCTION app.match_memories(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ltm.id,
    ltm.content,
    1 - (ltm.embedding <=> query_embedding) AS similarity
  FROM app.long_term_memory ltm
  WHERE ltm.owner_id = auth.uid()
    AND 1 - (ltm.embedding <=> query_embedding) > match_threshold
  ORDER BY ltm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION app.match_memories(vector, float, int) TO authenticated;
