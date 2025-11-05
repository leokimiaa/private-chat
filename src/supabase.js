// src/supabase.js
import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your own Supabase URL and Key
const supabaseUrl = 'https://yxzskaycstjhgwiiftmi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4enNrYXljc3RqaGd3aWlmdG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MDE1NzAsImV4cCI6MjA3MDQ3NzU3MH0.lKdaFJ4ACVzgK1kaPDBnyFuyu2EmCSUG1TrWZRCQVxs';

export const supabase = createClient(supabaseUrl, supabaseKey);