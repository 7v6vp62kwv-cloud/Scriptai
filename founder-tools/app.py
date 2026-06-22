import os
import anthropic
from flask import Flask, request, jsonify, Response, stream_with_context

app = Flask(__name__)
MODEL = "claude-opus-4-8"

HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Founder Tools</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f13; color: #e2e2e8; min-height: 100vh; }

  .header { padding: 20px 40px; border-bottom: 1px solid #1e1e28; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
  .header-left h1 { font-size: 20px; font-weight: 600; color: #fff; letter-spacing: -0.3px; }
  .header-left p { font-size: 13px; color: #6b6b7f; margin-top: 4px; }
  .api-key-wrap { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .api-key-wrap label { font-size: 12px; color: #6b6b7f; white-space: nowrap; }
  .api-key-input { background: #16161f; border: 1px solid #2a2a38; border-radius: 8px; padding: 8px 12px; font-size: 13px; color: #e2e2e8; outline: none; width: 260px; font-family: inherit; transition: border-color 0.15s; }
  .api-key-input:focus { border-color: #7c5af0; }
  .api-key-save { padding: 8px 14px; background: #2a2a38; border: 1px solid #3a3a50; border-radius: 8px; color: #c4b5fd; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s; white-space: nowrap; }
  .api-key-save:hover { background: #3a3a50; }
  .api-key-status { font-size: 11px; color: #4ade80; display: none; }

  .tabs { display: flex; gap: 4px; padding: 20px 40px 0; border-bottom: 1px solid #1e1e28; }
  .tab { padding: 10px 18px; font-size: 13px; font-weight: 500; color: #6b6b7f; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s; letter-spacing: 0.1px; }
  .tab:hover { color: #c2c2cc; }
  .tab.active { color: #a78bfa; border-color: #a78bfa; }

  .content { padding: 36px 40px; max-width: 860px; }
  .panel { display: none; }
  .panel.active { display: block; }

  .section-title { font-size: 22px; font-weight: 600; color: #fff; margin-bottom: 6px; letter-spacing: -0.4px; }
  .section-desc { font-size: 14px; color: #6b6b7f; margin-bottom: 28px; line-height: 1.5; }

  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px; }
  .form-grid.single { grid-template-columns: 1fr; }

  .field { display: flex; flex-direction: column; gap: 7px; }
  .field label { font-size: 12px; font-weight: 500; color: #9999aa; letter-spacing: 0.5px; text-transform: uppercase; }
  .field input, .field select, .field textarea {
    background: #16161f; border: 1px solid #2a2a38; border-radius: 8px;
    padding: 10px 13px; font-size: 14px; color: #e2e2e8; outline: none;
    transition: border-color 0.15s; font-family: inherit; resize: vertical;
  }
  .field input:focus, .field select:focus, .field textarea:focus { border-color: #7c5af0; }
  .field select option { background: #16161f; }
  .field textarea { min-height: 90px; }
  .field textarea.tall { min-height: 160px; }

  .divider { height: 1px; background: #1e1e28; margin: 24px 0; }
  .sub-title { font-size: 13px; font-weight: 600; color: #9999aa; letter-spacing: 0.6px; text-transform: uppercase; margin-bottom: 16px; }

  .btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 11px 22px; border-radius: 8px; font-size: 14px; font-weight: 500;
    cursor: pointer; border: none; transition: all 0.15s; font-family: inherit;
    background: #7c5af0; color: #fff;
  }
  .btn:hover { background: #6d4de0; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn svg { width: 16px; height: 16px; }

  .output-box {
    margin-top: 28px; background: #16161f; border: 1px solid #2a2a38;
    border-radius: 10px; padding: 22px; display: none;
  }
  .output-box.visible { display: block; }
  .output-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .output-label { font-size: 11px; font-weight: 600; color: #a78bfa; letter-spacing: 0.8px; text-transform: uppercase; }
  .copy-btn {
    font-size: 12px; padding: 5px 12px; background: #1e1e28; border: 1px solid #2a2a38;
    color: #9999aa; border-radius: 6px; cursor: pointer; transition: all 0.15s; font-family: inherit;
  }
  .copy-btn:hover { color: #e2e2e8; border-color: #444; }
  .output-text { font-size: 14px; line-height: 1.7; color: #d0d0dc; white-space: pre-wrap; word-break: break-word; }

  .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .tag-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
  .tag { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; background: #1e1e28; border: 1px solid #2a2a38; border-radius: 20px; font-size: 13px; color: #9999aa; cursor: pointer; transition: all 0.15s; }
  .tag:hover { border-color: #555; color: #e2e2e8; }
  .tag.selected { background: #2d1f5e; border-color: #7c5af0; color: #c4b5fd; }

  .char-count { font-size: 11px; color: #555; text-align: right; margin-top: 3px; }

  @media (max-width: 640px) {
    .header, .tabs, .content { padding-left: 20px; padding-right: 20px; }
    .form-grid { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <h1>Founder Tools</h1>
    <p>AI-powered content & client toolkit</p>
  </div>
  <div class="api-key-wrap">
    <label for="api-key-input">Anthropic API Key</label>
    <input class="api-key-input" id="api-key-input" type="password" placeholder="sk-ant-..." />
    <button class="api-key-save" onclick="saveKey()">Save</button>
    <span class="api-key-status" id="api-key-status">✓ Saved</span>
  </div>
</div>

<div class="tabs">
  <div class="tab active" onclick="switchTab('script')">Video Scripts</div>
  <div class="tab" onclick="switchTab('onboarding')">Client Onboarding</div>
  <div class="tab" onclick="switchTab('summary')">Call Summariser</div>
</div>

<div class="content">

  <!-- SCRIPT BUILDER -->
  <div class="panel active" id="panel-script">
    <div class="section-title">Video Script Builder</div>
    <div class="section-desc">Generate a full video script — hook, body, CTA — in your voice.</div>

    <div class="form-grid">
      <div class="field">
        <label>Topic / Title</label>
        <input id="s-topic" type="text" placeholder="e.g. How I went from 0 to 10k followers in 60 days">
      </div>
      <div class="field">
        <label>Target Audience</label>
        <input id="s-audience" type="text" placeholder="e.g. Coaches & consultants">
      </div>
    </div>

    <div class="form-grid">
      <div class="field">
        <label>Video Length</label>
        <select id="s-length">
          <option>Under 60 seconds (short-form)</option>
          <option>3–5 minutes (YouTube / LinkedIn)</option>
          <option>8–12 minutes (deep dive)</option>
          <option>VSL (sales video, 15–30 min)</option>
        </select>
      </div>
      <div class="field">
        <label>Hook Style</label>
        <select id="s-hook">
          <option>Bold claim / controversial statement</option>
          <option>Story / personal experience</option>
          <option>Question that hits a pain point</option>
          <option>Surprising statistic or result</option>
          <option>Pattern interrupt (unexpected opening)</option>
        </select>
      </div>
    </div>

    <div class="form-grid">
      <div class="field">
        <label>Primary CTA</label>
        <input id="s-cta" type="text" placeholder="e.g. DM me 'SCALE' / book a free call / link in bio">
      </div>
      <div class="field">
        <label>Tone</label>
        <select id="s-tone">
          <option>Conversational & direct</option>
          <option>High energy / motivational</option>
          <option>Educational & calm</option>
          <option>Storytelling / narrative</option>
          <option>Bold & provocative</option>
        </select>
      </div>
    </div>

    <div class="form-grid single">
      <div class="field">
        <label>Key Points to Cover (optional)</label>
        <textarea id="s-points" placeholder="List the main points or steps you want to include..."></textarea>
      </div>
    </div>

    <button class="btn" id="script-btn" onclick="generateScript()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      Generate Script
    </button>

    <div class="output-box" id="script-output">
      <div class="output-header">
        <span class="output-label">Your Script</span>
        <button class="copy-btn" onclick="copyOutput('script-text')">Copy</button>
      </div>
      <div class="output-text" id="script-text"></div>
    </div>
  </div>

  <!-- ONBOARDING FORM -->
  <div class="panel" id="panel-onboarding">
    <div class="section-title">Client Onboarding</div>
    <div class="section-desc">Collect everything you need from a new client and generate a tailored strategy doc.</div>

    <div class="sub-title">Business Basics</div>
    <div class="form-grid">
      <div class="field">
        <label>Client / Business Name</label>
        <input id="o-name" type="text" placeholder="e.g. Sarah's Coaching Co.">
      </div>
      <div class="field">
        <label>Niche / Industry</label>
        <input id="o-niche" type="text" placeholder="e.g. Fitness coaching for busy mums">
      </div>
    </div>
    <div class="form-grid single">
      <div class="field">
        <label>Ideal Client Profile (ICP)</label>
        <textarea id="o-icp" placeholder="Who is their perfect customer? Age, situation, pain points, goals..."></textarea>
      </div>
    </div>
    <div class="form-grid single">
      <div class="field">
        <label>Core Offer(s)</label>
        <textarea id="o-offer" placeholder="What do they sell? Price point, format, transformation..."></textarea>
      </div>
    </div>
    <div class="form-grid single">
      <div class="field">
        <label>Business Goals (next 90 days)</label>
        <textarea id="o-goals" placeholder="Revenue target, number of clients, launch plans..."></textarea>
      </div>
    </div>

    <div class="divider"></div>
    <div class="sub-title">Content Preferences</div>

    <div class="field" style="margin-bottom:18px">
      <label>Platforms</label>
      <div class="tag-row" id="platforms-tags">
        <div class="tag" onclick="toggleTag(this)">Instagram</div>
        <div class="tag" onclick="toggleTag(this)">TikTok</div>
        <div class="tag" onclick="toggleTag(this)">YouTube</div>
        <div class="tag" onclick="toggleTag(this)">LinkedIn</div>
        <div class="tag" onclick="toggleTag(this)">Facebook</div>
        <div class="tag" onclick="toggleTag(this)">Email</div>
        <div class="tag" onclick="toggleTag(this)">Podcast</div>
        <div class="tag" onclick="toggleTag(this)">Twitter / X</div>
      </div>
    </div>

    <div class="form-grid">
      <div class="field">
        <label>Posting Frequency</label>
        <select id="o-freq">
          <option>Daily</option>
          <option>3–5x per week</option>
          <option>1–2x per week</option>
          <option>Occasional / ad hoc</option>
        </select>
      </div>
      <div class="field">
        <label>Brand Voice / Tone</label>
        <select id="o-voice">
          <option>Warm & relatable</option>
          <option>Authoritative & direct</option>
          <option>Inspirational / motivational</option>
          <option>Educational & professional</option>
          <option>Bold & edgy</option>
          <option>Playful & fun</option>
        </select>
      </div>
    </div>

    <div class="divider"></div>
    <div class="sub-title">Funnel Details</div>

    <div class="form-grid single">
      <div class="field">
        <label>Current Funnel (if any)</label>
        <textarea id="o-funnel" placeholder="How do leads find them? What's the journey to purchase? What's converting / not converting?"></textarea>
      </div>
    </div>
    <div class="form-grid">
      <div class="field">
        <label>Primary Traffic Source</label>
        <select id="o-traffic">
          <option>Organic social</option>
          <option>Paid ads</option>
          <option>SEO / Blog</option>
          <option>Referrals / word of mouth</option>
          <option>Email list</option>
          <option>Partnerships / affiliates</option>
          <option>None yet</option>
        </select>
      </div>
      <div class="field">
        <label>Conversion Goal</label>
        <select id="o-conversion">
          <option>Book a discovery call</option>
          <option>Buy a product / course</option>
          <option>Join a membership</option>
          <option>Download a lead magnet</option>
          <option>Join a group / community</option>
          <option>Apply to a programme</option>
        </select>
      </div>
    </div>
    <div class="form-grid single">
      <div class="field">
        <label>Anything Else We Should Know</label>
        <textarea id="o-extra" placeholder="Past experience, what's worked, what hasn't, upcoming launches..."></textarea>
      </div>
    </div>

    <button class="btn" id="onboarding-btn" onclick="generateOnboarding()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
      Generate Strategy Doc
    </button>

    <div class="output-box" id="onboarding-output">
      <div class="output-header">
        <span class="output-label">Strategy Document</span>
        <button class="copy-btn" onclick="copyOutput('onboarding-text')">Copy</button>
      </div>
      <div class="output-text" id="onboarding-text"></div>
    </div>
  </div>

  <!-- CALL SUMMARISER -->
  <div class="panel" id="panel-summary">
    <div class="section-title">Call Summariser</div>
    <div class="section-desc">Paste a call transcript and get a structured summary with action items and a follow-up email draft.</div>

    <div class="form-grid">
      <div class="field">
        <label>Call Type</label>
        <select id="c-type">
          <option>Discovery / sales call</option>
          <option>Onboarding call</option>
          <option>Strategy session</option>
          <option>Check-in / progress call</option>
          <option>Team / internal meeting</option>
        </select>
      </div>
      <div class="field">
        <label>Participants (optional)</label>
        <input id="c-participants" type="text" placeholder="e.g. Me (Stan), Client (Sarah)">
      </div>
    </div>

    <div class="form-grid single">
      <div class="field">
        <label>Transcript</label>
        <textarea id="c-transcript" class="tall" placeholder="Paste your call transcript here...&#10;&#10;(Works with Zoom, Otter.ai, Fireflies, Fathom — any plain text transcript)"></textarea>
        <div class="char-count" id="char-count">0 characters</div>
      </div>
    </div>

    <div class="field" style="margin-bottom:20px">
      <label>Include in Output</label>
      <div class="tag-row" id="include-tags">
        <div class="tag selected" onclick="toggleTag(this)">Key Points</div>
        <div class="tag selected" onclick="toggleTag(this)">Action Items</div>
        <div class="tag selected" onclick="toggleTag(this)">Client Pain Points</div>
        <div class="tag selected" onclick="toggleTag(this)">Next Steps</div>
        <div class="tag selected" onclick="toggleTag(this)">Follow-up Email Draft</div>
        <div class="tag" onclick="toggleTag(this)">Objections Raised</div>
        <div class="tag" onclick="toggleTag(this)">Quotes / Exact Words</div>
      </div>
    </div>

    <button class="btn" id="summary-btn" onclick="generateSummary()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
      Summarise Call
    </button>

    <div class="output-box" id="summary-output">
      <div class="output-header">
        <span class="output-label">Call Summary</span>
        <button class="copy-btn" onclick="copyOutput('summary-text')">Copy</button>
      </div>
      <div class="output-text" id="summary-text"></div>
    </div>
  </div>

</div>

<script>
// Load saved API key on page load
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('anthropic_api_key');
  if (saved) {
    document.getElementById('api-key-input').value = saved;
    document.getElementById('api-key-status').style.display = 'inline';
  }
});

function saveKey() {
  const key = document.getElementById('api-key-input').value.trim();
  if (key) {
    localStorage.setItem('anthropic_api_key', key);
    const status = document.getElementById('api-key-status');
    status.style.display = 'inline';
    setTimeout(() => status.style.display = 'none', 2000);
  }
}

function getKey() {
  return localStorage.getItem('anthropic_api_key') || document.getElementById('api-key-input').value.trim();
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('panel-' + tab).classList.add('active');
}

function toggleTag(el) {
  el.classList.toggle('selected');
}

function getSelectedTags(containerId) {
  return [...document.querySelectorAll('#' + containerId + ' .tag.selected')]
    .map(t => t.textContent.trim());
}

document.getElementById('c-transcript').addEventListener('input', function() {
  document.getElementById('char-count').textContent = this.value.length.toLocaleString() + ' characters';
});

async function stream(endpoint, body, outputId, textId, btnId) {
  const key = getKey();
  if (!key || !key.startsWith('sk-ant-')) {
    alert('Please enter your Anthropic API key at the top of the page first.');
    return;
  }

  const btn = document.getElementById(btnId);
  const output = document.getElementById(outputId);
  const textEl = document.getElementById(textId);

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Generating...';
  output.classList.add('visible');
  textEl.textContent = '';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': key },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json();
      textEl.textContent = 'Error: ' + (err.error || 'Something went wrong');
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const text = line.slice(6);
          if (text !== '[DONE]') textEl.textContent += text;
        }
      }
    }
  } catch (e) {
    textEl.textContent = 'Error: ' + e.message;
  } finally {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.original;
  }
}

function generateScript() {
  const btn = document.getElementById('script-btn');
  if (!btn.dataset.original) btn.dataset.original = btn.innerHTML;
  stream('/api/script', {
    topic: document.getElementById('s-topic').value,
    audience: document.getElementById('s-audience').value,
    length: document.getElementById('s-length').value,
    hook: document.getElementById('s-hook').value,
    cta: document.getElementById('s-cta').value,
    tone: document.getElementById('s-tone').value,
    points: document.getElementById('s-points').value,
  }, 'script-output', 'script-text', 'script-btn');
}

function generateOnboarding() {
  const btn = document.getElementById('onboarding-btn');
  if (!btn.dataset.original) btn.dataset.original = btn.innerHTML;
  stream('/api/onboarding', {
    name: document.getElementById('o-name').value,
    niche: document.getElementById('o-niche').value,
    icp: document.getElementById('o-icp').value,
    offer: document.getElementById('o-offer').value,
    goals: document.getElementById('o-goals').value,
    platforms: getSelectedTags('platforms-tags'),
    frequency: document.getElementById('o-freq').value,
    voice: document.getElementById('o-voice').value,
    funnel: document.getElementById('o-funnel').value,
    traffic: document.getElementById('o-traffic').value,
    conversion: document.getElementById('o-conversion').value,
    extra: document.getElementById('o-extra').value,
  }, 'onboarding-output', 'onboarding-text', 'onboarding-btn');
}

function generateSummary() {
  const btn = document.getElementById('summary-btn');
  if (!btn.dataset.original) btn.dataset.original = btn.innerHTML;
  const transcript = document.getElementById('c-transcript').value;
  if (!transcript.trim()) {
    alert('Please paste a transcript first.');
    return;
  }
  stream('/api/summary', {
    type: document.getElementById('c-type').value,
    participants: document.getElementById('c-participants').value,
    transcript,
    include: getSelectedTags('include-tags'),
  }, 'summary-output', 'summary-text', 'summary-btn');
}

function copyOutput(id) {
  const text = document.getElementById(id).textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = event.target;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 1500);
  });
}
</script>
</body>
</html>"""


@app.route("/")
def index():
    return HTML


def sse_stream(text_stream):
    with text_stream as stream:
        for text in stream.text_stream:
            yield f"data: {text}\n\n"
    yield "data: [DONE]\n\n"


def get_client():
    key = request.headers.get("X-Api-Key", "").strip()
    if not key:
        return None, ("No API key provided", 401)
    return anthropic.Anthropic(api_key=key), None


@app.route("/api/script", methods=["POST"])
def api_script():
    client, err = get_client()
    if err:
        return jsonify({"error": err[0]}), err[1]
    d = request.json
    topic = d.get("topic", "")
    audience = d.get("audience", "")
    length = d.get("length", "3–5 minutes")
    hook = d.get("hook", "Bold claim")
    cta = d.get("cta", "")
    tone = d.get("tone", "Conversational & direct")
    points = d.get("points", "")

    prompt = f"""Write a complete video script for the following:

Topic: {topic}
Target audience: {audience}
Video length: {length}
Hook style: {hook}
Tone: {tone}
CTA: {cta}
{f"Key points to cover:{chr(10)}{points}" if points else ""}

Structure the script with these clear sections:
[HOOK] - The opening 3–5 seconds that grabs attention using the specified hook style
[INTRO] - Brief context / why this matters to the audience
[BODY] - The main content (broken into clear steps or sections)
[CLOSE] - Recap and transition to CTA
[CTA] - Clear, direct call to action

Write the full spoken script, not bullet points. Include stage directions in brackets where helpful (e.g. [pause], [show screen], [hold up product]).
Make it sound natural and human — the kind of thing a real person would actually say, not corporate copy.
Match the tone: {tone}."""

    stream = client.messages.stream(
        model=MODEL,
        max_tokens=4096,
        thinking={"type": "adaptive"},
        messages=[{"role": "user", "content": prompt}],
    )
    return Response(
        stream_with_context(sse_stream(stream)),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.route("/api/onboarding", methods=["POST"])
def api_onboarding():
    client, err = get_client()
    if err:
        return jsonify({"error": err[0]}), err[1]
    d = request.json
    platforms = ", ".join(d.get("platforms", [])) or "Not specified"

    prompt = f"""You are a senior content strategist and funnel consultant. Based on this client intake information, write a comprehensive onboarding strategy document.

CLIENT DETAILS
--------------
Business: {d.get("name", "N/A")}
Niche: {d.get("niche", "N/A")}
Ideal Client: {d.get("icp", "N/A")}
Core Offer: {d.get("offer", "N/A")}
90-Day Goals: {d.get("goals", "N/A")}

CONTENT PREFERENCES
-------------------
Platforms: {platforms}
Posting Frequency: {d.get("frequency", "N/A")}
Brand Voice: {d.get("voice", "N/A")}

FUNNEL DETAILS
--------------
Current Funnel: {d.get("funnel", "N/A")}
Primary Traffic Source: {d.get("traffic", "N/A")}
Conversion Goal: {d.get("conversion", "N/A")}
Additional Notes: {d.get("extra", "N/A")}

---

Write a clear, actionable strategy document with these sections:

1. CLIENT SNAPSHOT
   Quick summary of who they are and where they're headed.

2. AUDIENCE & POSITIONING
   Analysis of their ICP and how to position their offer to stand out.

3. CONTENT STRATEGY (30-DAY PLAN)
   Platform-specific content pillars, posting cadence, and content types that will work for this client. Include 5 specific content ideas to get started.

4. FUNNEL RECOMMENDATIONS
   Based on their current situation, what funnel structure do I recommend? What's the priority fix / build?

5. TRAFFIC & GROWTH LEVERS
   Top 3 ways to grow their audience and drive more leads given their traffic source and goals.

6. 90-DAY ROADMAP
   Week-by-week priorities broken into three phases: Foundation, Growth, Conversion.

7. QUICK WINS (DO THIS WEEK)
   3–5 things they can do immediately to get momentum.

Be specific and direct. Avoid vague generalisations. Write like a trusted advisor who knows their stuff."""

    stream = client.messages.stream(
        model=MODEL,
        max_tokens=6000,
        thinking={"type": "adaptive"},
        messages=[{"role": "user", "content": prompt}],
    )
    return Response(
        stream_with_context(sse_stream(stream)),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.route("/api/summary", methods=["POST"])
def api_summary():
    client, err = get_client()
    if err:
        return jsonify({"error": err[0]}), err[1]
    d = request.json
    include = d.get("include", [])
    transcript = d.get("transcript", "")
    call_type = d.get("type", "call")
    participants = d.get("participants", "")

    sections = []
    if "Key Points" in include:
        sections.append("KEY POINTS — the most important things discussed (5–8 bullets)")
    if "Action Items" in include:
        sections.append("ACTION ITEMS — specific tasks with owner and deadline where mentioned (formatted as: [ ] Task — Owner — Deadline)")
    if "Client Pain Points" in include:
        sections.append("CLIENT PAIN POINTS — the real problems, frustrations, and desires expressed")
    if "Next Steps" in include:
        sections.append("NEXT STEPS — what happens after this call, in order")
    if "Objections Raised" in include:
        sections.append("OBJECTIONS RAISED — any hesitations, doubts, or pushback mentioned")
    if "Quotes / Exact Words" in include:
        sections.append("NOTABLE QUOTES — powerful exact phrases worth keeping (in quotation marks)")
    if "Follow-up Email Draft" in include:
        sections.append("FOLLOW-UP EMAIL DRAFT — a ready-to-send email summarising the call, recapping next steps, and keeping momentum (include subject line)")

    sections_text = "\n".join(f"• {s}" for s in sections) if sections else "• Key Points\n• Action Items\n• Next Steps"

    prompt = f"""You are an expert at analysing {call_type} transcripts and extracting what matters.

Call type: {call_type}
{f"Participants: {participants}" if participants else ""}

TRANSCRIPT:
{transcript}

---

Analyse this transcript and produce a structured summary with the following sections:

{sections_text}

Be specific — use real names, numbers, and details from the transcript. Don't pad with filler. If something wasn't discussed, skip that section rather than guessing.

For the Follow-up Email (if included): Write it as if you are the person running the call, addressing the client/other party. Keep it warm, professional, and action-focused."""

    stream = client.messages.stream(
        model=MODEL,
        max_tokens=4096,
        thinking={"type": "adaptive"},
        messages=[{"role": "user", "content": prompt}],
    )
    return Response(
        stream_with_context(sse_stream(stream)),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("\n⚠️  Set your API key first:")
        print("   export ANTHROPIC_API_KEY=your-key-here\n")
    else:
        print("\n✅ Founder Tools running at http://localhost:5001\n")
    app.run(debug=False, port=5001)
