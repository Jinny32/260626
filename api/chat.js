const fs = require('fs');
const path = require('path');

function loadKnowledge() {
  const dir = path.join(process.cwd(), 'uploads');
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

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages must be an array' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const knowledge = loadKnowledge();
    const systemPrompt = buildSystemPrompt(knowledge);

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10),
        ],
        max_completion_tokens: 600,
        temperature: 0.4,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('OpenAI error:', errText);
      return res.status(502).json({ error: 'OpenAI API error' });
    }

    const data = await openaiRes.json();
    const reply = data.choices?.[0]?.message?.content ?? '응답을 받지 못했습니다.';

    return res.status(200).json({ reply });
  } catch (e) {
    console.error('Chat handler error:', e);
    return res.status(500).json({ error: e.message });
  }
};
