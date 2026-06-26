require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

/* ── 지식 베이스: uploads/*.md 전부 로드 ── */
function loadKnowledge() {
  const dir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(dir)) return '';
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = fs.readFileSync(path.join(dir, f), 'utf-8');
      return `### [${f}]\n${content}`;
    })
    .join('\n\n---\n\n');
}

function buildSystemPrompt(knowledge) {
  return `당신은 Finance Partner(FP) 서비스의 공식 AI 어시스턴트입니다.
이름은 "FP 어시스턴트"이고, 친절하고 전문적인 말투를 사용합니다.

[답변 규칙]
1. 자기소개·대화형("이름이 뭐야", "누구야" 등): 챗봇 이름과 역할을 자연스럽게 소개
2. 서비스·정책·요금 관련 질문: 반드시 아래 [지식 베이스] 내용만 사용해 답변. 없으면 "더 자세한 내용은 무료 상담을 신청해 주세요!" 안내
3. 서비스와 무관한 질문(날씨, 스포츠 등): "저는 Finance Partner 서비스 관련 질문만 도와드릴 수 있어요 😊"로 안내
4. 지식 베이스에 없는 정보는 절대 창작하거나 추측하지 않는다.
5. 답변은 간결하게, 필요 시 줄바꿈으로 가독성 확보. 마크다운 사용 금지.

[지식 베이스]
${knowledge || '(아직 등록된 문서가 없습니다.)'}`;
}

/* ── /api/chat 처리 ── */
async function handleChat(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const { messages } = JSON.parse(body);
      if (!Array.isArray(messages)) throw new Error('messages must be an array');

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'API key not configured' }));
      }

      const knowledge = loadKnowledge();
      const systemPrompt = buildSystemPrompt(knowledge);

      const payload = {
        model: 'gpt-5.4-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10),
        ],
        max_completion_tokens: 600,
        temperature: 0.4,
      };

      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        console.error('OpenAI error:', errText);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'OpenAI API error' }));
      }

      const data = await openaiRes.json();
      const reply = data.choices?.[0]?.message?.content ?? '응답을 받지 못했습니다.';

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply }));
    } catch (e) {
      console.error('Chat handler error:', e);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

/* ── 정적 파일 서빙 ── */
function serveStatic(req, res) {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);

  if (!ext) filePath += '.html';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'text/plain' });
    res.end(data);
  });
}

/* ── 서버 시작 ── */
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (url === '/api/chat') return handleChat(req, res);
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`✅ Finance Partner server running at http://localhost:${PORT}`);
});
