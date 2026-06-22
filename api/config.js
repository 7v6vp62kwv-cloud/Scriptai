export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.json({
    supabaseUrl:  process.env.SUPABASE_URL,
    supabaseAnon: process.env.SUPABASE_ANON_KEY,
  })
}
