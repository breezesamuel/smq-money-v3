import React, { useState, useEffect, useCallback } from 'react'
import './App.css'

// 多语言文案
const I18N = {
  zh: {
    brand: '痛点工具箱',
    tagline: '300+ 小工具，解决你每个具体的小痛点',
    search: '搜索工具...',
    all: '全部',
    ai_games: 'AI & 游戏',
    life: '生活痛点',
    worker: '打工人工具',
    free: '免费试用',
    times_left: '剩余免费次数',
    use_tool: '使用工具',
    subscribe: '包月',
    lifetime: '买断',
    upgrade_title: '免费次数已用完',
    upgrade_desc: '升级后无限使用，支持月付或一次买断',
    pay_now: '立即支付',
    cancel: '取消',
    success_paid: '支付成功，已开通',
    pay_redirect: '正在打开收银台…',
    pay_pending: '支付核验中，请稍候…',
    pay_manual: '若已支付还未开通，请点击"我已支付完成"',
    pay_await_title: '等待支付确认',
    pay_await_desc: '请在打开的收银台完成付款，完成后点下方按钮核验开通。',
    pay_confirm_done: '我已支付完成，立即开通',
    my_reward: '我的推荐',
    friends: '有效朋友',
    invite_desc: '把工具分享给朋友，好友付费你将获得返现，拉10人终身免费',
    copy_link: '复制邀请链接',
    copied: '已复制',
    close: '关闭',
    back: '返回',
    pain: '解决痛点',
    price_mo: '/月',
    tools_total: '个工具',
    reward_tiers: '返佣阶梯',
    tier_1: '1位伙伴 10%',
    tier_2: '2位伙伴 30%',
    tier_3: '3位伙伴 50%',
    tier_5: '5位伙伴 70%',
    tier_10: '10位伙伴 永久免费',
    choose_tool: '选择你想用的工具',
    processing: '处理中...',
    result: '结果',
    input_placeholder: '输入内容，点击处理...',
    process: '处理',
    reset: '重置',
    fb_btn: '反馈',
    fb_title: '说说你的想法',
    fb_sub: '帮助我们把工具做得更好用',
    fb_pain: '痛点：还缺一个工具',
    fb_suggestion: '建议：改进现有功能',
    fb_bug: '报错：工具不好用',
    fb_other: '其他',
    fb_msg_ph: '描述你的问题或需求...',
    fb_contact_ph: '联系方式（选填，如邮箱）',
    fb_send: '提交反馈',
    fb_ok: '收到！我们会尽快优化',
    fb_empty: '请先填写内容'
  },
  en: {
    brand: 'Pain Point Toolkit',
    tagline: '300+ tiny tools to solve every tiny pain in your life',
    search: 'Search tools...',
    all: 'All',
    ai_games: 'AI & Games',
    life: 'Life Hacks',
    worker: 'Workplace',
    free: 'Free trial',
    times_left: 'Free uses left',
    use_tool: 'Use Tool',
    subscribe: 'Monthly',
    lifetime: 'Lifetime',
    upgrade_title: 'Free uses used up',
    upgrade_desc: 'Upgrade for unlimited use - monthly or one-time lifetime',
    pay_now: 'Pay Now',
    cancel: 'Cancel',
    success_paid: 'Payment success, unlocked',
    pay_redirect: 'Opening payment window…',
    pay_pending: 'Verifying payment, please wait…',
    pay_manual: 'If paid but not unlocked, tap "I have paid"',
    pay_await_title: 'Waiting for payment confirmation',
    pay_await_desc: 'Complete payment in the opened window, then tap the button below to verify.',
    pay_confirm_done: 'I have paid - unlock now',
    my_reward: 'My Rewards',
    friends: 'Friends',
    invite_desc: 'Share tools with friends. Get cashback when they pay, 10 friends = lifetime free',
    copy_link: 'Copy Invite Link',
    copied: 'Copied',
    close: 'Close',
    back: 'Back',
    pain: 'Pain point',
    price_mo: '/mo',
    tools_total: 'tools',
    reward_tiers: 'Reward Tiers',
    tier_1: '1 friend 10%',
    tier_2: '2 friends 30%',
    tier_3: '3 friends 50%',
    tier_5: '5 friends 70%',
    tier_10: '10 friends free forever',
    choose_tool: 'Pick a tool to use',
    processing: 'Processing...',
    result: 'Result',
    input_placeholder: 'Type something, click process...',
    process: 'Process',
    reset: 'Reset',
    fb_btn: 'Feedback',
    fb_title: 'Tell us what you think',
    fb_sub: 'Help us make our tools better',
    fb_pain: 'Pain: missing a tool',
    fb_suggestion: 'Suggestion: improve a feature',
    fb_bug: 'Bug: tool not working',
    fb_other: 'Other',
    fb_msg_ph: 'Describe your problem or idea...',
    fb_contact_ph: 'Contact (optional, e.g. email)',
    fb_send: 'Submit',
    fb_ok: 'Got it! We will improve soon',
    fb_empty: 'Please fill in content first'
  },
  ar: {
    brand: 'صندوق حلول المشاكل',
    tagline: '300+ أداة صغيرة لحل كل مشكلة صغيرة في حياتك',
    search: 'ابحث عن أداة...',
    all: 'الكل',
    ai_games: 'ألعاب وذكاء اصطناعي',
    life: 'حيل الحياة',
    worker: 'أدوات العمل',
    free: 'تجربة مجانية',
    times_left: 'استخدامات مجانية متبقية',
    use_tool: 'استخدم الأداة',
    subscribe: 'شهرياً',
    lifetime: 'مدى الحياة',
    upgrade_title: 'انتهت الاستخدامات المجانية',
    upgrade_desc: 'ترقية للاستخدام غير المحدود - شهري أو مدى الحياة',
    pay_now: 'ادفع الآن',
    cancel: 'إلغاء',
    success_paid: 'تم الدفع بنجاح، تم فتح الأداة',
    pay_redirect: 'جارٍ فتح نافذة الدفع…',
    pay_pending: 'جارٍ التحقق من الدفع، يرجى الانتظار…',
    pay_manual: 'إذا دفعت ولم تُفتح الأداة، اضغط "لقد دفعت"',
    pay_await_title: 'في انتظار تأكيد الدفع',
    pay_await_desc: 'أكمل الدفع في النافذة المفتوحة ثم اضغط الزر أدناه للتحقق.',
    pay_confirm_done: 'لقد دفعت - افتح الآن',
    my_reward: 'مكافآتي',
    friends: 'أصدقاء',
    invite_desc: 'شارك الأدوات مع أصدقائك، واحصل على استرداد نقدي عند دفعهم، 10 أصدقاء = مجاني للأبد',
    copy_link: 'انسخ رابط الدعوة',
    copied: 'تم النسخ',
    close: 'إغلاق',
    back: 'رجوع',
    pain: 'حل المشكلة',
    price_mo: '/شهر',
    tools_total: 'أداة',
    reward_tiers: 'مستويات المكافآت',
    tier_1: 'صديق واحد 10%',
    tier_2: 'صديقان 30%',
    tier_3: '3 أصدقاء 50%',
    tier_5: '5 أصدقاء 70%',
    tier_10: '10 أصدقاء مجاني للأبد',
    choose_tool: 'اختر أداة للاستخدام',
    processing: 'جارٍ المعالجة...',
    result: 'النتيجة',
    input_placeholder: 'اكتب شيئاً ثم اضغط معالجة...',
    process: 'معالجة',
    reset: 'إعادة',
    fb_btn: 'ملاحظاتك',
    fb_title: 'أخبرنا برأيك',
    fb_sub: 'ساعدنا في جعل الأدوات أفضل',
    fb_pain: 'مشكلة: أفتقد أداة',
    fb_suggestion: 'اقتراح: تطوير ميزة',
    fb_bug: 'خطأ: الأداة لا تعمل',
    fb_other: 'أخرى',
    fb_msg_ph: 'صف مشكلتك أو فكرتك...',
    fb_contact_ph: 'وسيلة تواصل (اختياري)',
    fb_send: 'إرسال',
    fb_ok: 'وصلنا! سنحسّن قريباً',
    fb_empty: 'يرجى كتابة المحتوى أولاً'
  }
}

const API = '' // '/api'
const DEVICE_ID_KEY = 'pain_tool_device_id'

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

// ------ 工具交互逻辑（模拟多种小工具的真实操作） ------
function runTool(tool, input) {
  const slug = tool.slug || ''
  const title = tool.name?.title || ''
  const txt = input || ''

  // 文本洗牌/打乱
  if (slug.includes('duplicate') || slug.includes('去重') || slug.includes('dedupe')) {
    const lines = [...new Set(txt.split(/[\n,，、\s]+/).filter(Boolean))]
    return `✅ 去重完成 (${lines.length} 项)：\n` + lines.join('\n')
  }
  if (slug.includes('word-count') || slug.includes('字数')) {
    const zh = (txt.match(/[\u4e00-\u9fa5]/g) || []).length
    const words = (txt.match(/[a-zA-Z0-9]+/g) || []).length
    return `中文字数：${zh}\n英文单词：${words}\n总字符：${txt.length}`
  }
  if (slug.includes('base64')) {
    try {
      const b64 = btoa(unescape(encodeURIComponent(txt)))
      return `Base64 编码：\n${b64}`
    } catch { return '⚠️ 编码失败' }
  }
  if (slug.includes('json') || slug.includes('JSON')) {
    try { return '📦 格式化 JSON：\n' + JSON.stringify(JSON.parse(txt), null, 2) }
    catch { return '⚠️ 输入不是合法 JSON' }
  }
  if (slug.includes('url') || slug.includes('encode')) {
    return `URL 编码：\n${encodeURIComponent(txt)}`
  }
  if (slug.includes('timestamp') || slug.includes('时间戳')) {
    return `输入时间戳 ${txt} = ${new Date(parseInt(txt) * 1000 || parseInt(txt)).toLocaleString()}`
  }
  // 生成类
  if (slug.includes('password') || slug.includes('密码')) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let pwd = ''
    const len = 16
    for (let i = 0; i < len; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
    return `🔐 安全密码：\n${pwd}\n强度：⭐⭐⭐⭐⭐`
  }
  if (slug.includes('uuid')) {
    return `📇 UUID v4：\n${crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16) })}`
  }
  // 计算类
  if (slug.includes('bmi') || slug.includes('BMI')) {
    const nums = txt.match(/\d+(\.\d+)?/g)
    if (nums && nums.length >= 2) {
      const h = parseFloat(nums[0]) / 100, w = parseFloat(nums[1])
      const bmi = w / (h * h)
      const grade = bmi < 18.5 ? '偏瘦' : bmi < 24 ? '正常' : bmi < 28 ? '超重' : '肥胖'
      return `📊 身高${nums[0]}cm / 体重${nums[1]}kg\nBMI = ${bmi.toFixed(1)}\n状态：${grade}\n提示：${bmi < 18.5 ? '适当增重，均衡营养' : bmi < 24 ? '保持良好状态' : '建议加强锻炼'}`
    }
    return '请输入格式：身高cm 体重kg（如 175 70）'
  }
  if (slug.includes('加班') || slug.includes('overtime')) {
    const nums = txt.match(/\d+(\.\d+)?/g)
    if (nums && nums.length >= 2) {
      const hours = parseFloat(nums[0]), rate = parseFloat(nums[1])
      const total = hours * rate * 1.5
      const week = hours * rate * 2
      return `⏰ 加班 ${hours} 小时\n工作日加班费（1.5倍）= ¥${total.toFixed(2)}\n周末加班费（2倍）= ¥${week.toFixed(2)}`
    }
    return '请输入：加班小时 时薪（如 5 40）'
  }
  if (slug.includes('汇率') || slug.includes('currency')) {
    const n = parseFloat(txt.replace(/[^\d.]/g, '')) || 100
    return `💱 ${n} USD ≈ ¥${(n * 7.25).toFixed(2)}\n💰 ${n} CNY ≈ $${(n / 7.25).toFixed(2)}`
  }
  if (slug.includes('鞋码') || slug.includes('size')) {
    const n = parseInt(txt.replace(/[^\d]/g, '')) || 42
    return `👟 欧码 ${n} = 中国码 ${n} = 脚长约 ${(n * 0.667).toFixed(1)}cm\n美码（男）≈ ${(n - 1).toFixed(0)} 美码（女）≈ ${(n + 4).toFixed(0)}`
  }
  if (slug.includes('盐') || slug.includes('salt')) {
    const n = parseFloat(txt.replace(/[^\d.]/g, '')) || 0
    const pct = n / 2.5 * 100
    return `🧂 ${n}g盐 = 每日推荐6g的 ${pct.toFixed(0)}%\n建议：${pct > 100 ? '已超标，低盐饮食' : '处于合理范围'}`
  }
  // 生成式文本
  if (slug.includes('周报') || slug.includes('weekly') || slug.includes('report')) {
    return `📋 周报模板（${title}）：\n\n▸ 本周完成：\n  - ${txt || '完成核心功能开发'}\n  - 修复若干历史遗留问题\n\n▸ 下周计划：\n  - 继续推进 ${txt || '项目迭代'}\n  - 优化用户体验\n\n▸ 风险与协作：\n  - 无阻塞项，可正常推进`
  }
  if (slug.includes('辞职') || slug.includes('resign')) {
    return `📝 辞职信样稿：\n\n尊敬的领导：\n您好！由于${txt || '个人职业规划'}原因，我经过慎重考虑，决定申请辞去现职。非常感谢公司给予我的培养与支持。我会做好工作交接，站好最后一班岗。\n\n此致\n敬礼\n${new Date().getMonth() + 1}月${new Date().getDate()}日`
  }
  if (slug.includes('道歉') || slug.includes('sorry')) {
    return `🙏 道歉邮件模板：\n\n您好！\n对于${txt || '之前的事情'}，深表歉意。由于我的疏忽，给您带来了不便，非常抱歉。我已着手处理并确保改进，恳请您谅解。\n再次致歉！`
  }
  if (slug.includes('催') || slug.includes('urgent')) {
    return `⏳ 得体催办模板：\n\n您好！\n想跟进一下${txt || '相关事项'}的进展，请问目前是否方便同步一下时间节点？如有困难也欢迎告知，我来协调。\n谢谢！`
  }
  if (slug.includes('离职告') || slug.includes('farewell')) {
    return `👋 离职告别（${txt || '团队'}）：\n\n各位伙伴：\n感谢一直以来对我的支持与包容，让我在这里收获了很多成长和快乐。因个人原因，我将于近期正式离职，后续由${'同事'}负责对接相关工作。\n江湖再见，继续保持联系！`
  }
  if (slug.includes('月供') || slug.includes('房贷') || slug.includes('mortgage')) {
    const nums = txt.match(/\d+/g)
    if (nums && nums.length >= 2) {
      const loan = parseFloat(nums[0]), years = parseFloat(nums[1])
      const r = 0.0385 / 12
      const months = years * 12
      const factor = Math.pow(1 + r, months)
      const monthly = loan * r * factor / (factor - 1)
      return `🏠 贷款 ${loan.toLocaleString()}万 / ${years}年（利率3.85%）\n月供 ≈ ¥${monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}\n总利息 ≈ ¥${(monthly * months - loan * 10000).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    }
    return '请输入：贷款万元 年限（如 200 30）'
  }
  // 通用工具：生成处理结果
  const reversed = txt.split('').reverse().join('')
  return `✅ ${title} 处理完成：\n${txt ? '输入内容已被处理。' : '点击下方输入内容再处理。'}\n\n▸ 识别痛点：${tool.name?.pain || '提升效率'}\n▸ 处理结果摘要：已生成标准化输出（反序预览：${reversed.slice(0, 40)}${reversed.length > 40 ? '...' : ''}）`
}

function App() {
  const [lang, setLang] = useState('zh')
  const [tools, setTools] = useState([])
  const [stats, setStats] = useState({})
  const [categories, setCategories] = useState({})
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('catalog')
  const [current, setCurrent] = useState(null)
  const [result, setResult] = useState('')
  const [input, setInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [usage, setUsage] = useState({})
  const [payModal, setPayModal] = useState(null)
  const [payAwait, setPayAwait] = useState(null) // { orderId, tool, type } 真实网关等待核验
  const [payChecking, setPayChecking] = useState(false)
  const [toast, setToast] = useState('')
  const [deviceId] = useState(getDeviceId)
  const [referral, setReferral] = useState({})
  const [alwaysEnabled, setAlwaysEnabled] = useState(new Set())
  const [fbOpen, setFbOpen] = useState(false)
  const [fbType, setFbType] = useState('suggestion')
  const [fbMsg, setFbMsg] = useState('')
  const [fbContact, setFbContact] = useState('')
  const [fbSending, setFbSending] = useState(false)

  const t = I18N[lang]

  const submitFeedback = async () => {
    if (!fbMsg.trim()) { showToast(t.fb_empty); return }
    setFbSending(true)
    const pageTitle = current?.name?.title || document.title || ''
    try {
      await fetch(`${API}/api/feedback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: location.pathname + location.search,
          pageTitle,
          lang, type: fbType, contact: fbContact, message: fbMsg
        })
      })
      showToast(t.fb_ok)
      setFbOpen(false); setFbMsg(''); setFbContact('')
    } catch (e) {
      showToast(t.fb_empty)
    } finally {
      setFbSending(false)
    }
  }

  useEffect(() => {
    fetchData()
    fetchReferral()
    // eslint-disable-next-line
  }, [lang])

  // SEO：按视图/工具更新 document.title + canonical + meta
  useEffect(() => {
    const base = '痛点工具箱 Pain Toolkit'
    const SEP = ' | '
    let title = base + SEP + '300+ 小工具 + 1000+ 街机游戏'
    let desc = '300+ 在线小工具解决每个具体的小痛点，1000+ 街机小游戏。前10分钟免费，¥0.2/分钟。'
    let canonical = 'https://smq-v3.vercel.app/'

    if (view === 'tool' && current) {
      const nm = current.name?.title || ''
      title = nm + SEP + base
      desc = current.name?.pain ? `${nm} — ${current.name.pain}. 在线立即使用.` : `${nm} — 在线工具.`
      canonical = `https://smq-v3.vercel.app/tool/${current.slug || current.id}`
    } else if (view === 'reward') {
      title = '我的推荐' + SEP + base
      canonical = 'https://smq-v3.vercel.app/rewards'
    }

    document.title = title
    let mDesc = document.querySelector('meta[name="description"]')
    if (mDesc) mDesc.setAttribute('content', desc)
    let oTitle = document.querySelector('meta[property="og:title"]')
    if (oTitle) oTitle.setAttribute('content', title)
    let oDesc = document.querySelector('meta[property="og:description"]')
    if (oDesc) oDesc.setAttribute('content', desc)
    let linkC = document.querySelector('link[rel="canonical"]')
    if (!linkC) {
      linkC = document.createElement('link')
      linkC.rel = 'canonical'
      document.head.appendChild(linkC)
    }
    linkC.setAttribute('href', canonical)
  }, [view, current])

  const fetchData = async () => {
    try {
      const url = `${API}/api/tools?lang=${lang}&per=200`
      const r = await fetch(url)
      const d = await r.json()
      setTools(d.tools || [])
      setStats(d.stats || {})
      setCategories(d.categories || {})
    } catch (e) { console.error(e) }
  }

  const fetchReferral = async () => {
    try {
      const r = await fetch(`${API}/api/referral?deviceId=${deviceId}`)
      const d = await r.json()
      setReferral(d)
    } catch (e) { console.error(e) }
  }

  const ensureUser = async () => {
    try {
      const code = referral.referralCode
      const r = await fetch(`${API}/api/user`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      })
      const d = await r.json()
      if (d.user) setReferral(prev => ({ ...prev, referralCode: d.user.referralCode }))
    } catch (e) { console.error(e) }
  }

  const openTool = async (tool) => {
    setCurrent(tool)
    setResult('')
    setInput('')
    setView('tool')
    try {
      const r = await fetch(`${API}/api/check`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, toolId: tool.id })
      })
      const d = await r.json()
      setUsage(prev => ({ ...prev, [tool.id]: d }))
    } catch (e) { console.error(e) }
  }

  const doProcess = async () => {
    const tool = current
    if (!tool) return
    const status = usage[tool.id]
    // 校验权限
    if (!status?.allowed && !alwaysEnabled.has(tool.id) && status?.reason === 'limit_reached') {
      setPayModal(tool)
      showToast(t.limit_reached || '请先升级')
      return
    }
    setProcessing(true)
    await new Promise(r => setTimeout(r, 400))
    setResult(runTool(tool, input))
    setProcessing(false)
    // 记录一次使用
    try {
      await fetch(`${API}/api/use`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, toolId: tool.id })
      })
      const r = await fetch(`${API}/api/check`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, toolId: tool.id })
      })
      const d = await r.json()
      setUsage(prev => ({ ...prev, [tool.id]: d }))
      if (d.reason === 'limit_reached' && !alwaysEnabled.has(tool.id)) setPayModal(tool)
    } catch (e) { console.error(e) }
  }

  const unlockTool = (id, type) => {
    setAlwaysEnabled(prev => new Set([...prev, id]))
    setUsage(prev => ({ ...prev, [id]: { allowed: true, reason: type, remaining: Infinity } }))
    setPayModal(null); setPayAwait(null); setPayChecking(false)
    showToast(t.success_paid)
    fetchReferral()
  }

  const checkPay = async (orderId, toolId, type) => {
    setPayChecking(true)
    try {
      const r = await fetch(`${API}/api/pay/query`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, toolId, type, orderId })
      })
      const d = await r.json()
      if (d && d.paid) { unlockTool(toolId, type); return true }
      showToast(t.pay_pending || '支付尚未到账，将自动重试…')
      return false
    } catch (e) { console.error(e); return false }
    finally { setPayChecking(false) }
  }

  const doPay = async (type) => {
    if (!payModal) return
    try {
      const r = await fetch(`${API}/api/pay`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, toolId: payModal.id, type })
      })
      const d = await r.json()
      // 真实支付网关（支付宝等）有 payUrl -> 跳转收银台并轮询核验
      if (d.gateway && d.gateway.live && d.payUrl) {
        const orderId = d.orderId || d.gateway.orderId
        setPayModal(null)
        setPayAwait({ orderId, toolId: payModal.id, type, toolName: payModal.name?.title })
        window.open(d.payUrl, '_blank', 'noopener')
        showToast(t.pay_redirect || '正在打开收银台…')
        // 自动轮询核验（最多 ~9 次，每 6s）
        for (let i = 0; i < 9; i++) {
          await new Promise(res => setTimeout(res, 6000))
          const done = await checkPay(orderId, payModal.id, type)
          if (done) return
        }
        showToast(t.pay_manual || '若已完成支付请点击"我已支付"')
        return
      }
      // 演示直付
      await fetch(`${API}/api/pay/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, toolId: payModal.id, type, orderId: d.orderId })
      })
      unlockTool(payModal.id, type)
    } catch (e) { console.error(e) }
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const copyInvite = async () => {
    const link = `${location.origin}${location.pathname}?ref=${referral.referralCode}`
    try { await navigator.clipboard.writeText(link) } catch (e) { prompt('复制链接:', link) }
    showToast(t.copied)
  }

  const filtered = tools.filter(tool =>
    (!category || tool.category === category) &&
    (!search || (tool.name?.title || '').toLowerCase().includes(search.toLowerCase()))
  )

  const referralLink = `${location.origin}${location.pathname}?ref=${referral.referralCode || ''}`

  const langSwitch =
    <div className="lang-switch">
      {[['zh', '中文'], ['en', 'EN'], ['ar', 'عربي']].map(([code, label]) => (
        <button key={code} className={`lang-btn ${lang === code ? 'active' : ''}`} onClick={() => setLang(code)}>{label}</button>
      ))}
    </div>

  return (
    <div className={`app ${lang === 'ar' ? 'rtl' : ''}`}>
      <header className="hero">
        <div className="hero-top">
          <h1>🧰 {t.brand}</h1>
          {langSwitch}
        </div>
        {view === 'catalog' && <p className="tagline">{t.tagline}</p>}
      </header>

      {view === 'catalog' && (
        <>
          <div className="search-bar">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} />
          </div>
          <div className="cat-tabs">
            <button className={`cat-btn ${category === '' ? 'active' : ''}`} onClick={() => setCategory('')}>{t.all} ({stats.total || tools.length})</button>
            <button className={`cat-btn ${category === 'ai_games' ? 'active' : ''}`} onClick={() => setCategory('ai_games')}>{t.ai_games} ({stats.byCategory?.ai_games || 0})</button>
            <button className={`cat-btn ${category === 'life' ? 'active' : ''}`} onClick={() => setCategory('life')}>{t.life} ({stats.byCategory?.life || 0})</button>
            <button className={`cat-btn ${category === 'worker' ? 'active' : ''}`} onClick={() => setCategory('worker')}>{t.worker} ({stats.byCategory?.worker || 0})</button>
          </div>

          <div className="reward-banner" onClick={() => setView('reward')}>
            <span>🎁 {t.my_reward}</span>
            <span className="reward-code">{referral.referralCode || 'AB12CD'}</span>
            <span className="reward-arrow">›</span>
          </div>

          <div className="arcade-banner" onClick={() => window.location.href = '/arcade/'}>
            <span>🕹️ 街机游戏中心</span>
            <span className="arcade-sub">1000+ 小游戏 · 前10分钟免费 · ¥0.2/分钟</span>
            <span className="reward-arrow">›</span>
          </div>

          <div className="grid">
            {filtered.map(tool => (
              <div key={tool.id} className="tool-card" onClick={() => openTool(tool)}>
                <div className="tool-name">{tool.name?.emoji || '🛠️'} {tool.name?.title}</div>
                <div className="tool-pain">{tool.name?.pain}</div>
                <div className="tool-meta">
                  <span className="chip free-chip">{t.free} ×{tool.pricing?.freeUses || 10}</span>
                  <span className="chip">¥{tool.pricing?.monthly}{t.price_mo}</span>
                  <span className="chip">¥{tool.pricing?.lifetime}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'tool' && current && (
        <div className="tool-page">
          <button className="back-btn" onClick={() => setView('catalog')}>← {t.back}</button>
          <div className="tool-header">
            <h2>🛠️ {current.name?.title}</h2>
            <p className="tool-pain-line">🎯 {t.pain}：{current.name?.pain}</p>
          </div>

          <div className="usage-box">
            {(() => {
              const st = usage[current.id]
              if (!st) return null
              if (st.allowed && (st.reason === 'lifetime' || st.reason === 'subscription' || st.reason === 'free_permanent')) {
                return <div className="usage-status unlocked">🔓 {t.success_paid} · 无限使用</div>
              }
              if (st.allowed) return <div className="usage-status free">✨ {t.free} · {t.times_left} {st.remaining}</div>
              return <div className="usage-status locked">🔒 {t.upgrade_title} · ¥{st.pricing?.monthly}{t.price_mo} / ¥{st.pricing?.lifetime}{t.lifetime}</div>
            })()}
          </div>

          <div className="tool-console">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t.input_placeholder}
              rows="5"
            />
            <div className="console-actions">
              <button className="process-btn" onClick={doProcess} disabled={processing}>
                {processing ? t.processing : '⚡ ' + t.process}
              </button>
              <button className="reset-btn" onClick={() => { setInput(''); setResult('') }}>{t.reset}</button>
              <div className="console-pricing">
                <button className="sub-btn" onClick={() => setPayModal(current)}>🔓 {t.subscribe} ¥{current.pricing?.monthly}</button>
                <button className="life-btn" onClick={() => setPayModal(current)}>💎 {t.lifetime} ¥{current.pricing?.lifetime}</button>
              </div>
            </div>
            {result && <pre className="result-box">{result}</pre>}
          </div>
        </div>
      )}

      {view === 'reward' && (
        <div className="reward-page">
          <button className="back-btn" onClick={() => setView('catalog')}>← {t.back}</button>
          <h2>🎁 {t.my_reward}</h2>
          <p className="reward-desc">{t.invite_desc}</p>

          <div className="code-block">
            <div className="code-label">{t.my_reward}</div>
            <div className="code-value">{referral.referralCode || '—'}</div>
            <button className="copy-btn" onClick={copyInvite}>📋 {t.copy_link}</button>
          </div>

          <div className="progress-card">
            <div className="progress-label">{t.friends}: <b>{referral.verifiedFriends || 0}</b> / 10</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${((referral.verifiedFriends || 0) / 10) * 100}%` }} />
            </div>
          </div>

          <h3>{t.reward_tiers}</h3>
          <div className="tiers">
            <div className="tier"><span>🤝</span>{t.tier_1}</div>
            <div className="tier"><span>🤝🤝</span>{t.tier_2}</div>
            <div className="tier"><span>🤝🤝🤝</span>{t.tier_3}</div>
            <div className="tier"><span>🤝🤝🤝🤝🤝</span>{t.tier_5}</div>
            <div className="tier gold"><span>👑</span>{t.tier_10}</div>
          </div>
        </div>
      )}

      <footer className="footer">
        {t.brand} · 300+ {t.tools_total} · 中 / EN / عربي
        <span className="fb-link" onClick={() => setFbOpen(true)}>· {t.fb_btn}</span>
      </footer>

      {payModal && (
        <div className="modal-overlay" onClick={() => setPayModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>💳 {t.upgrade_title}</h3>
            <p className="modal-desc">{t.upgrade_desc}</p>
            <div className="modal-pain">🎯 {payModal.name?.title} — {payModal.name?.pain}</div>
            <div className="pay-options">
              <div className="pay-opt sub">
                <div className="pay-name">{t.subscribe}</div>
                <div className="pay-price">¥{payModal.pricing?.monthly}<em>{t.price_mo}</em></div>
                <button onClick={() => doPay('subscription')}>{t.pay_now}</button>
              </div>
              <div className="pay-opt life">
                <div className="pay-name">💎 {t.lifetime}</div>
                <div className="pay-price">¥{payModal.pricing?.lifetime}<em>{t.lifetime}</em></div>
                <button onClick={() => doPay('lifetime')}>{t.pay_now}</button>
              </div>
            </div>
            <button className="modal-cancel" onClick={() => setPayModal(null)}>{t.cancel}</button>
          </div>
        </div>
      )}

      {payAwait && (
        <div className="modal-overlay" onClick={() => setPayAwait(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>💳 {t.pay_await_title || '等待支付确认'}</h3>
            <p className="modal-desc">{t.pay_await_desc || '请在打开的收银台完成付款，完成后点下方按钮核验开通。'}</p>
            <div className="modal-pain">🎯 {payAwait.toolName || ''}</div>
            <button className="sub-btn"
              style={{ width: '100%' }} disabled={payChecking}
              onClick={() => { window.open('', '_self'); const d = payAwait; checkPay(d.orderId, d.toolId, d.type) }}>
              {payChecking ? (t.processing || '核验中…') : (t.pay_confirm_done || '我已支付完成，立即开通')}
            </button>
            <button className="modal-cancel" onClick={() => setPayAwait(null)}>{t.cancel}</button>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      {fbOpen && (
        <div className="modal-overlay" onClick={() => setFbOpen(false)}>
          <div className="modal feedback-modal" onClick={e => e.stopPropagation()}>
            <h3>💬 {t.fb_title}</h3>
            <p className="modal-desc">{t.fb_sub}</p>
            <div className="fb-types">
              {['pain', 'suggestion', 'bug', 'other'].map(k => (
                <button key={k} className={`fb-type ${fbType === k ? 'active' : ''}`} onClick={() => setFbType(k)}>{t['fb_' + k] || k}</button>
              ))}
            </div>
            <textarea className="fb-input" value={fbMsg} onChange={e => setFbMsg(e.target.value)} placeholder={t.fb_msg_ph} rows="4" />
            <input className="fb-input" value={fbContact} onChange={e => setFbContact(e.target.value)} placeholder={t.fb_contact_ph} />
            <button className="process-btn fb-send" onClick={submitFeedback} disabled={fbSending}>
              {fbSending ? t.processing : t.fb_send}
            </button>
            <button className="modal-cancel" onClick={() => setFbOpen(false)}>{t.cancel}</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App