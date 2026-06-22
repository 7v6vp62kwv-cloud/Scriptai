import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const PACKS = {
  starter: { credits: 25,  amount: 500,  label: '25 scripts' },   // £5
  pro:     { credits: 60,  amount: 1000, label: '60 scripts' },   // £10
  max:     { credits: 140, amount: 2000, label: '140 scripts' },  // £20
}

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
  if (authError || !user) return res.status(401).json({ error: 'Invalid session' })

  // ── Validate pack ──
  const { pack } = req.body
  const selected = PACKS[pack]
  if (!selected) return res.status(400).json({ error: 'Invalid pack' })

  // ── Create Stripe session ──
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  const baseUrl = process.env.APP_URL || `https://${req.headers.host}`

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'gbp',
        unit_amount: selected.amount,
        product_data: {
          name: `Scriptwriter — ${selected.label}`,
          description: `${selected.credits} script credits`,
        },
      },
      quantity: 1,
    }],
    metadata: {
      user_id: user.id,
      credits: selected.credits,
      pack,
    },
    success_url: `${baseUrl}?payment=success`,
    cancel_url:  `${baseUrl}?payment=cancelled`,
  })

  return res.json({ url: session.url })
}
