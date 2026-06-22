import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Invalid session' })

  // ── GET: fetch saved creator profile ──
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('creator_profiles')
      .select('series, goal, whoami, struggles, motivation')
      .eq('id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Could not load profile' })
    }

    return res.json({ profile: data || null })
  }

  // ── POST: save creator profile ──
  if (req.method === 'POST') {
    const { series, goal, whoami, struggles, motivation } = req.body

    const { error } = await supabase
      .from('creator_profiles')
      .upsert({
        id: user.id,
        series:    series    || null,
        goal:      goal      || null,
        whoami:    whoami    || null,
        struggles: struggles || null,
        motivation:       motivation       || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (error) return res.status(500).json({ error: 'Could not save profile' })

    return res.json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
