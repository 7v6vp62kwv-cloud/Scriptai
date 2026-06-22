import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const config = { api: { bodyParser: false } }

async function buffer(readable) {
  const chunks = []
  for await (const chunk of readable) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const sig    = req.headers['stripe-signature']
  const buf    = await buffer(req)

  let event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { user_id, credits } = session.metadata

    if (!user_id || !credits) {
      console.error('Missing metadata:', session.metadata)
      return res.status(400).json({ error: 'Missing metadata' })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    const { error } = await supabase.rpc('add_credits', {
      uid:     user_id,
      amount:  parseInt(credits, 10),
    })

    if (error) {
      console.error('Credit add error:', error)
      return res.status(500).json({ error: 'Failed to add credits' })
    }

    console.log(`Added ${credits} credits to user ${user_id}`)
  }

  return res.json({ received: true })
}
