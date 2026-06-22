import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // ── Auth ──
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Invalid session. Please log in again.' })

  // ── Check credits + fetch creator profile in parallel ──
  const [{ data: account, error: accountError }, { data: creatorProfile }] = await Promise.all([
    supabase.from('profiles').select('credits').eq('id', user.id).single(),
    supabase.from('creator_profiles').select('series, goal, whoami, struggles, motivation').eq('id', user.id).single()
  ])

  if (accountError || !account) return res.status(500).json({ error: 'Could not load your account.' })
  if (account.credits < 1) return res.status(402).json({ error: 'insufficient_credits' })

  // ── Validate input ──
  const { topic, details, series, goal, whoami, struggles, motivation } = req.body
  if (!topic?.trim()) return res.status(400).json({ error: 'Topic is required.' })

  // Use saved profile if available, fall back to request body
  const p = {
    series:    creatorProfile?.series    || series    || '',
    goal:      creatorProfile?.goal      || goal      || '',
    whoami:    creatorProfile?.whoami    || whoami    || '',
    struggles: creatorProfile?.struggles || struggles || '',
    motivation:       creatorProfile?.motivation       || motivation       || '',
  }

  // ── System prompt ──
  const systemPrompt = `You are a short-form video script writer specialising in cinematic, personal storytelling for Gen-Z creators.

TONE & VOICE:
- Youthful, raw, and real — write exactly how young people speak
- Use natural Gen-Z language: gonna, wanna, 'cause, kinda, ngl, lowkey
- Short punchy lines — like spoken word, not paragraphs
- No filler openers: never start with "Hey guys", "So today", "In this video"
- Write TO one person watching, not a crowd
- Every single line must earn its place — cut anything that doesn't pull the viewer forward

SCRIPT STYLE:
- Cinematic storytelling — paint a picture, make it feel like a movie moment
- Hook in the first 2 seconds: a bold statement, a personal truth, or a cliffhanger
- Build tension through the body — stakes, conflict, vulnerability
- CTA should feel natural, not salesy — like a friend inviting you along
- Keep it 15–40 seconds max (roughly 40–90 words total)
- Break lines for rhythm — each line is almost its own beat

FORMAT EXACTLY LIKE THIS:

🎣 HOOK:
[1-2 lines max — the scroll-stopper]

📽️ BODY:
[short cinematic lines, one idea per line, build the story and tension]

📣 CTA:
[natural, personal close — not a hard sell]

---
🎙️ DELIVERY NOTES:
[2-3 notes on pace, pauses, energy — how to actually say it on camera]`

  // ── User prompt — inject their saved profile ──
  const userPrompt = `Write a 15–40 second cinematic short-form video script.

ABOUT THE CREATOR:
${p.whoami ? `Who they are: ${p.whoami}` : ''}
${p.struggles ? `Current struggles: ${p.struggles}` : ''}
${p.motivation ? `Their deeper motivation: ${p.motivation}` : ''}
${p.series ? `Content series: ${p.series}` : ''}
${p.goal ? `Series goal: ${p.goal}` : ''}

THIS VIDEO IS ABOUT: ${topic.trim()}
${details?.trim() ? `EXTRA DETAILS: ${details.trim()}` : ''}

Use their personal story, struggles and personality to make this feel completely authentic to them.`

  // ── Generate ──
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })

    // ── Deduct credit ──
    const { error: deductError } = await supabase.rpc('deduct_credit', { uid: user.id })
    if (deductError) console.error('Credit deduction error:', deductError)

    return res.json({
      script: message.content[0].text,
      credits_remaining: account.credits - 1
    })
  } catch (err) {
    console.error('Anthropic error:', err)
    return res.status(500).json({ error: 'Script generation failed. Please try again.' })
  }
}
