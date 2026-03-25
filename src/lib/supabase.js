import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rlpvggeflleiyehzglvz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJscHZnZ2VmbGxlaXllaHpnbHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjQwNjEsImV4cCI6MjA5MDAwMDA2MX0.LQcGo5LwGeb9TZTXFtZkOvLJrHaglJAmcqStncFhO2c'

export const supabase = createClient(supabaseUrl, supabaseKey)