import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sdujobcoycydkmxnbbsq.supabase.co'
const supabaseKey = 'sb_publishable_yvgtRyrtB0nVGuartEtVpw_eJcnWFwH'

export const supabase = createClient(supabaseUrl, supabaseKey)