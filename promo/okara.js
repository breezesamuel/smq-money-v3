// promo/okara.js - Okara Influencer Agent
// 生成多语言、多平台的推广内容（推文/小红书/短视频脚本/博客），自动带追踪链接
const { modelRouter } = require('../ai-core/model-router');

const BASE = process.env.SITE_BASE || 'https://smq-v3.vercel.app';

const PERSONAS = {
  game_boy: {
    zh: {
      name: 'Okara游戏酱',
      system: '你是一个热爱小游戏的元气博主 Okara 游戏酱。说话带"酱"式亲昵感，用 emoji，有真实玩家的热情，不夸大疗效，自然安利。不要使用"神器"等夸张词。'
    },
    en: {
      name: 'Okara Arcade',
      system: 'You are Okara Arcade, an enthusiastic casual-games influencer. Use emoji naturally, sound like a real gamer sharing a find, not an ad. Be genuine, punchy, concise.'
    },
    ar: {
      name: 'أوكارا آركيد',
      system: 'أنت أوكارا آركيد، مؤثرة ألعاب خفيفة حماسية. استخدمي إيموجي بشكل طبيعي، وكوني حقيقية كأنك تشاركين اكتشافًا مع صديق، موجزة وحيوية.'
    }
  },
  productivity_hack: {
    zh: {
      name: 'Okara效率姐',
      system: '你是 Okara 效率姐，专注"碎片时间也能有产出"。语气冷静、务实、有洞察，常用反常识的开头抓注意力，结尾给具体行动。'
    },
    en: {
      name: 'Okara Optimal',
      system: 'You are Okara Optimal, focused on "real output during dead time". Calm, practical, insightful; open with a counterintuitive hook, end with a concrete action.'
    },
    ar: {
      name: 'أوكارا أوبتص',
      system: 'أنت أوكارا أوبتيمال، تركزين على "إنتاج حقيقي في الأوقات الميتة". أسلوب هادئ وعملي وثاقب، افتحي بجملة غير متوقعة وانتهي بإجراء محدد.'
    }
  },
  hook_writer: {
    zh: {
      name: 'Okara钩子王',
      system: '你是 Okara 钩子王，文案钩子专家。每种内容前 3 秒/前 1 行必须抓人，大胆但真实，多用具体数字和反差。'
    },
    en: {
      name: 'Okara Hook',
      system: 'You are Okara Hook, a copywriting hook specialist. The first 3 seconds / first line must grab attention. Bold but truthful, use specific numbers and contrast.'
    },
    ar: {
      name: 'أوكارا هوك',
      system: 'أنت أوكارا هوك، أخصائية خطافات النصوص. أول 3 ثوانٍ / أول سطر يجب أن يخطف الانتباه، جريئة لكن صادقة، استخدمي أرقامًا محددة ومقابلات.'
    }
  }
};

const PLATFORM_SPECS = {
  twitter: {
    zh: '一条中文推文(Twitter/X)，不超过260字符，带2-3个emoji，1-3个相关话题标签，结尾附链接',
    en: 'One English tweet (Twitter/X), under 260 chars, 2-3 emojis, 1-3 relevant hashtags, end with the link',
    ar: 'تغريدة عربية (تويتر/X) أقل من 260 حرفًا، مع 2-3 إيموجي وهاشتاقات مناسبة، وتنتهي بالرابط'
  },
  xiaohongshu: {
    zh: '一条小红书图文笔记：标题一行20字内抓人；正文3-5句话，口语化，2-3个#标签；结尾说"前10分钟免费"',
    en: 'One Xiaohongshu-style note in English: hook title (under 20 words), 3-5 conversational sentences, 2-3 #tags, end with "first 10 minutes free"',
    ar: 'ملاحظة بأسلوب شياوهونغشو بالعربية: عنوان جذاب تحت 20 كلمة، 3-5 جمل محادثة، 2-3 هاشتاقات، وتنتهي بـ"أول 10 دقائق مجانًا"'
  },
  tiktok: {
    zh: '一个短视频口播脚本(15-30秒)：开场0-2秒钩子，中段讲玩法亮点，结尾引导动作(点链接试玩)，含镜头提示。格式：[0-2s]动作/台词\n[2-9s]...',
    en: 'A short-video voiceover script (15-30s): 0-2s hook, middle covers gameplay highlights, end CTA (tap link to try), with shot cues. Format: [0-2s] action/line\n[2-9s]...',
    ar: 'سيناريو فيديو قصير (15-30 ثانية): خطاف 0-2 ثانية، الوسط يغطي أبرز مميزات اللعبة، والنهاية دعوة للنقر على الرابط، مع إشارات لقطات. الصيغة: [0-2s] حركة/جملة\n[2-9s]...'
  },
  blog: {
    zh: '一篇博客片段(120-180字)：一个痛点开头、讲清玩法与"为什么值得一试"、结尾附链接与"前10分钟免费"说明',
    en: 'A blog excerpt (120-180 words): open with a pain point, explain the gameplay and "why it is worth trying", end with the link and "first 10 minutes free" note',
    ar: 'فقرة مدونة (120-180 كلمة): افتح بنقطة ألم، واشرح أسلوب اللعب و"لماذا يستحق التجربة"، وانتهِ بالرابط وملاحظة "أول 10 دقائق مجانًا"'
  }
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function shorten(s, n) { return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…'; }

async function generatePost(material, opts = {}) {
  const personaKey = opts.persona || 'game_boy';
  const lang = opts.lang || 'zh';
  const platform = opts.platform || 'twitter';
  const persona = PERSONAS[personaKey];
  const platformSpec = PLATFORM_SPECS[platform];

  const postId = 'OKARA_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const trackedUrl = `${BASE}/tool/${material.slug}?ref=${postId}`;

  const pain = material.pain || material.title;
  const prompt = [
    `[推广素材]`,
    `标题: ${material.title}`,
    `痛点: ${pain}`,
    `类型: ${material.category || '小游戏'}`,
    `引擎/题材: ${material.engineName || 'AI'} / ${material.theme || ''}`,
    `目标链接: ${trackedUrl}`,
    ``,
    `平台要求: ${platformSpec[lang] || platformSpec.zh}`,
    `语言: ${lang === 'en' ? 'English' : lang === 'ar' ? 'العربية' : '中文'}`,
    `直接输出成品文案，不要解释，不要加前缀。`
  ].join('\n');

  const result = await modelRouter.call(prompt, {
    system: persona[lang].system,
    maxTokens: opts.maxTokens || 600,
    temperature: opts.temperature ?? 0.85
  });

  if (result.error) {
    // 模型全挂时回退到模板文案，保证管线不中断
    const fallback = {
      zh: {
        title: `${material.title}`,
        body: `刷到它的瞬间我就停不下来了🤩 ${shorten(pain, 90)}，而且第一局免费！试试看：${trackedUrl}\n#小游戏 #免费试玩`
      },
      en: {
        title: material.title,
        body: `Could NOT stop once I tapped it 🤩 ${shorten(pain, 90)} — and the first play is free! Try it: ${trackedUrl}\n#minigame #freeplay`
      },
      ar: {
        title: material.title,
        body: `ما قدرت أتوقف لما ضغطت عليها 🤩 ${shorten(pain, 90)}، وأول جولة مجانية! جرّبها: ${trackedUrl}\n#ألعاب #مجانية`
      }
    }[lang];

    return {
      postId, persona: personaKey, platform, lang,
      material: material.slug, url: trackedUrl,
      title: result.content ? null : fallback.title,
      content: result.content || fallback.body,
      model: result.model || null, error: result.error,
      fallback: !!result.error,
      createdAt: new Date().toISOString()
    };
  }

  return {
    postId, persona: personaKey, platform, lang,
    material: material.slug, url: trackedUrl,
    content: result.content.trim(),
    model: result.model, provider: result.provider,
    fallback: false,
    createdAt: new Date().toISOString()
  };
}

async function batchGenerate(materials, opts = {}) {
  const results = [];
  for (const m of materials.slice(0, opts.limit || 10)) {
    try {
      const post = await generatePost(m, opts);
      results.push(post);
    } catch (e) {
      results.push({ postId: 'FAIL', material: m.slug, error: e.message });
    }
  }
  return results;
}

module.exports = {
  BASE,
  PERSONAS,
  PLATFORM_SPECS,
  generatePost,
  batchGenerate
};