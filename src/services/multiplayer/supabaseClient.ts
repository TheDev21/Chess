import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Play Online needs these to be set at build time. Both are meant to be
// public (the anon key only grants what Row Level Security allows - here,
// reading a room if you know its code; every write goes through an Edge
// Function using a service-role key that never reaches the browser).
export const HAS_BACKEND = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = HAS_BACKEND ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export const FUNCTIONS_BASE = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : "";
export const SUPABASE_KEY = SUPABASE_ANON_KEY ?? "";
