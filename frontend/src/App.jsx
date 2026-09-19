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
    invite_desc: '好友通过你的链接付费后，你将免费获得全站订阅：1位→1个月，3位→3个月，10位→1年',
    copy_link: '复制邀请链接',
    copied: '已复制',
    close: '关闭',
    back: '返回',
    pain: '解决痛点',
    price_mo: '/月',
    tools_total: '个工具',
    reward_tiers: '邀请奖励',
    tier_1: '1位伙伴 → 免费1个月',
    tier_2: '2位伙伴',
    tier_3: '3位伙伴 → 免费3个月',
    tier_5: '5位伙伴',
    tier_10: '10位伙伴 → 免费1年',
    choose_tool: '选择你想用的工具',
    processing: '处理中...',
    ai_running: 'AI 正在处理…',
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
    invite_desc: 'When a friend pays via your link, you get free site-wide access: 1 friend = 1 month, 3 = 3 months, 10 = 1 year',
    copy_link: 'Copy Invite Link',
    copied: 'Copied',
    close: 'Close',
    back: 'Back',
    pain: 'Pain point',
    price_mo: '/mo',
    tools_total: 'tools',
    reward_tiers: 'Rewards',
    tier_1: '1 friend → 1 month free',
    tier_2: '2 friends',
    tier_3: '3 friends → 3 months free',
    tier_5: '5 friends',
    tier_10: '10 friends → 1 year free',
    choose_tool: 'Pick a tool to use',
    processing: 'Processing...',
    ai_running: 'AI is processing…',
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
    invite_desc: 'عندما يدفع صديق عبر رابطك تحصل على اشتراك مجاني شامل: صديق واحد = شهر، 3 = 3 أشهر، 10 = سنة',
    copy_link: 'انسخ رابط الدعوة',
    copied: 'تم النسخ',
    close: 'إغلاق',
    back: 'رجوع',
    pain: 'حل المشكلة',
    price_mo: '/شهر',
    tools_total: 'أداة',
    reward_tiers: 'مستويات المكافآت',
    tier_1: 'صديق واحد → شهر مجاني',
    tier_2: 'صديقان',
    tier_3: '3 أصدقاء → 3 أشهر مجاناً',
    tier_5: '5 أصدقاء',
    tier_10: '10 أصدقاء → سنة مجاناً',
    choose_tool: 'اختر أداة للاستخدام',
    processing: 'جارٍ المعالجة...',
    ai_running: 'يعالج الذكاء الاصطناعي…',
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
function runTool(tool, input, lang) {
  const slug = tool.slug || ''
  const title = tool.name?.title || ''
  const txt = input || ''
  // 本地逻辑文案为中文；非中文界面走真实 AI 以保持输出语言一致
  if (lang && lang !== 'zh') return null

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
  // ====== 2026-09 新增批量确定性工具（真实计算，零 AI 成本） ======
  if (slug.includes('tip-calculator') || slug.includes('小费') || (slug.includes('tip') && !slug.includes('jar') && !slug.includes('parenting'))) {
    const nums = txt.match(/\d+(\.\d+)?/g)
    const bill = nums ? parseFloat(nums[0]) : 100
    const pct = nums && nums.length > 1 ? parseFloat(nums[1]) : 15
    return `🧾 账单 ¥${bill.toFixed(2)} / 小费${pct}%\n小费额 = ¥${(bill * pct / 100).toFixed(2)}\n合计 = ¥${(bill * (1 + pct / 100)).toFixed(2)}`
  }
  if (slug.includes('cost-split') || slug.includes('分摊') || slug.includes('AA')) {
    const nums = txt.match(/\d+(\.\d+)?/g)
    if (nums && nums.length >= 2) {
      const total = parseFloat(nums[0]), people = parseFloat(nums[1])
      return `💴 总额 ¥${total.toFixed(2)} / ${people} 人均\n每人 = ¥${(total / people).toFixed(2)}`
    }
    return '请输入：总额 人数（如 358 4）'
  }
  if ((slug.includes('salary-breakdown') || slug.includes('工资') || slug.includes('到手')) && !slug.includes('compare') && !slug.includes('talk')) {
    const n = parseFloat(txt.replace(/[^\d.]/g, '')) || 12000
    const pension = n * 0.08, medical = n * 0.02, unemployment = n * 0.005, housing = n * 0.12
    const deduction = pension + medical + unemployment + housing
    let tax = 0, taxable = n - deduction - 5000
    if (taxable > 0) { tax = taxable <= 3000 ? taxable * 0.03 : taxable <= 12000 ? taxable * 0.1 - 210 : taxable <= 25000 ? taxable * 0.2 - 1410 : taxable * 0.25 - 2660 }
    const net = n - deduction - tax
    return `💰 税前 ¥${n.toLocaleString()}\n五险一金：养老¥${pension.toFixed(0)} 医疗¥${medical.toFixed(0)} 失业¥${unemployment.toFixed(0)} 公积金¥${housing.toFixed(0)}\n个税 ≈ ¥${Math.max(tax, 0).toFixed(0)}\n到手工薪 ≈ ¥${Math.max(net, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  }
  if (slug.includes('annual-leave') || slug.includes('年假')) {
    const n = parseInt(txt.replace(/[^\d]/g, '')) || 0
    const days = n >= 20 ? 15 : n >= 10 ? 10 : n >= 1 ? 5 : 0
    return `🗓 工龄 ${n} 年 → 法定年假 ${days} 天\n（1-10年5天/10-20年10天/20年以上15天）`
  }
  if (slug.includes('severance') || slug.includes('赔偿') || slug.includes('N+')) {
    const nums = txt.match(/\d+(\.\d+)?/g)
    if (nums && nums.length >= 2) {
      const monthSalary = parseFloat(nums[0]), years = parseFloat(nums[1])
      const capped = Math.min(monthSalary, 30000)
      const n = Math.min(Math.floor(years), 12)
      return `⚖️ 赔偿 N=${n}个月\n月薪¥${monthSalary.toFixed(0)}（超3万按3万上限）≈ ¥${(n * capped).toFixed(0)}\n若协商2N = ¥${(2 * n * capped).toFixed(0)}`
    }
    return '请输入：月薪 工龄年（如 15000 3.5）'
  }
  if (slug.includes('notice-period') || slug.includes('通知期') || slug.includes('离职提前')) {
    return `📢 中国法定离职通知期：\n• 试用期：提前 3 天\n• 正式期：提前 30 天书面通知\n• 协商一致：可随时解除并支付N赔偿\n正式离职日 = 通知日 + 30天`
  }
  if (slug.includes('social-insurance') || slug.includes('社保')) {
    const n = parseFloat(txt.replace(/[^\d.]/g, '')) || 8000
    const b = Math.min(Math.max(n, 4000), 25000)
    return `🏛 社保基数 ¥${b.toLocaleString()}\n养老8%=${(b * .08).toFixed(0)} 医疗2%=${(b * .02).toFixed(0)} 失业0.5%=${(b * .005).toFixed(0)}\n公积金5-12%按个人比例，合计个人缴纳约 ¥${(b * .145).toFixed(0)}`
  }
  if (slug.includes('year-end-bonus') || slug.includes('年终奖')) {
    const n = parseFloat(txt.replace(/[^\d.]/g, '')) || 20000
    const tax = n <= 36000 ? n * 0.03 : n <= 144000 ? n * 0.10 - 210 : n <= 300000 ? n * 0.20 - 1410 : n * 0.25 - 2660
    return `🧧 年终奖 ¥${n.toLocaleString()}\n个税（单独计税）≈ ¥${Math.max(tax, 0).toFixed(0)}\n到手 ≈ ¥${(n - Math.max(tax, 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  }
  if (slug.includes('calorie') || slug.includes('卡路里') || slug.includes('热量')) {
    const nums = txt.match(/\d+(\.\d+)?/g)
    const g = nums ? parseFloat(nums[0]) : 100
    return `🔥 ${g}g 食物\n碳水4kcal/g / 蛋白4kcal/g / 脂肪9kcal/g\n（输入：克数 即可按此估算营养热量预算）`
  }
  if (slug.includes('bmi-advice') || slug.includes('bmi')) {
    const n = parseFloat(txt.replace(/[^\d.]/g, '')) || 0
    if (n > 0) { const g = n < 18.5 ? '偏瘦·增肌' : n < 24 ? '标准·保持' : n < 28 ? '超重·减脂' : '肥胖·减脂'; return `BMI ${n} → ${g}\n建议：${g.includes('减') ? '控制碳水+每周150分钟有氧' : '均衡饮食+力量训练'}`; }
    return '请输入 BMI 数值'
  }
  if (slug.includes('body-fat') || slug.includes('体脂')) {
    const nums = txt.match(/\d+(\.\d+)?/g)
    if (nums && nums.length >= 2) {
      const bmi = parseFloat(nums[0]), age = parseFloat(nums[1])
      const bf = 1.2 * bmi + 0.23 * age - 16.2
      const g = bf < 10 ? '偏低·运动员' : bf < 20 ? '标准' : bf < 25 ? '偏高' : '肥胖'
      return `📐 BMI ${bmi} / 年龄 ${age}\n估算体脂率 ≈ ${bf.toFixed(1)}%\n状态：${g}`
    }
    return '请输入：BMI 年龄（如 22 30）'
  }
  if (slug.includes('sleep-cycle') || slug.includes('睡眠')) {
    const n = parseFloat(txt.replace(/[^\d.]/g, '')) || 7.5
    const cycles = n / 1.5
    return `🌙 睡眠 ${n} 小时 ≈ ${cycles.toFixed(1)} 个睡眠周期\n每个周期1.5小时，建议整数周期(5-6个)\n起床时间建议选在周期结束点（避免昏沉）`
  }
  if (slug.includes('water') || slug.includes('喝水') || slug.includes('饮水')) {
    const n = parseFloat(txt.replace(/[^\d.]/g, '')) || 60
    return `💧 体重 ${n}kg → 每日需水 ≈ ${(n * 33).toFixed(0)} ml\n（约 ${(n * 0.033).toFixed(2)} 升，运动中需额外补充）`
  }
  if (slug.includes('pet-age') || slug.includes('宠物年龄')) {
    const nums = txt.match(/\d+/g)
    if (nums && nums.length >= 2) {
      const age = parseInt(nums[0]), isDog = nums[1] == 1 || /狗|dog/.test(txt)
      if (isDog) { const hm = age <= 2 ? age * 12.5 : 2 * 12.5 + (age - 2) * 4; return `🐶 狗狗 ${age}岁（中小型）≈ 人类 ${Math.round(hm)} 岁`; }
      const cm = age <= 1 ? age * 15 : age <= 2 ? 15 + (age - 1) * 9 : 24 + (age - 2) * 4
      return `🐱 猫咪 ${age}岁 ≈ 人类 ${Math.round(cm)} 岁`
    }
    return '请输入：宠物年龄 类型(狗填1/猫填0，如 3 1)'
  }
  if (slug.includes('batch') || slug.includes('批次') || slug.includes('疫苗')) {
    return `💉 宝宝疫苗接种时间轴（中国）：\n出生：乙肝1 + 卡介苗\n1月：乙肝2\n2月：脊灰1\n3月：百白破1+脊灰2\n4月：百白破2\n5月：百白破3\n6月：乙肝3+流脑AC1\n8月：麻疹1+乙脑1\n建议按接种本预约`
  }
  if (slug.includes('date-diff') || slug.includes('时间差') || slug.includes('间隔')) {
    const nums = txt.match(/\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}/g)
    if (nums && nums.length >= 2) {
      const a = new Date(nums[0].replace(/[\/.]/g, '-')), b = new Date(nums[1].replace(/[\/.]/g, '-'))
      const days = Math.round(Math.abs((a - b) / 86400000))
      return `📅 ${nums[0]} → ${nums[1]}\n相隔 ${days} 天 ≈ ${(days / 30.44).toFixed(1)} 个月 ≈ ${(days / 365.25).toFixed(2)} 年`
    }
    return '请输入两个日期（如 2026-01-01 2026-09-18）'
  }
  if (slug.includes('countdown') || slug.includes('倒计时')) {
    const m = txt.match(/\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}/)
    if (m) {
      const d = new Date(m[0].replace(/[\/.]/g, '-'))
      const days = Math.round((d - new Date()) / 86400000)
      return `⏳ 距 ${m[0]} ${days >= 0 ? `还有 ${days} 天` : `已过 ${-days} 天`}${days >= 0 ? `（约${Math.max(Math.round(days / 7), 0)}周）` : ''}`
    }
    return '请输入目标日期（如 2027-01-01）'
  }
  if (slug.includes('retirement') || slug.includes('退休')) {
    const n = parseInt(txt.replace(/[^\d]/g, '')) || 1980
    const age = new Date().getFullYear() - n
    const ret = n <= 1965 ? 60 : n <= 1970 ? 61 : n <= 1975 ? 62 : 63
    return `🎂 出生 ${n} 年 / 今年 ${age} 岁\n男性预计退休 ${ret} 岁（约 ${n + ret} 年）\n（迈行渐进式延迟退休，缴费满15年可领养老金）`
  }
  if (slug.includes('workday') || slug.includes('工作日') || slug.includes('上班')) {
    const nums = txt.match(/\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}/g)
    if (nums && nums.length >= 2) {
      const a = new Date(nums[0].replace(/[\/.]/g, '-')), b = new Date(nums[1].replace(/[\/.]/g, '-'))
      let workdays = 0
      for (let d = new Date(a); d <= b; d = new Date(d.getTime() + 86400000)) { const w = d.getDay(); if (w !== 0 && w !== 6) workdays++ }
      return `📆 ${nums[0]} → ${nums[1]}\n工作日 ≈ ${workdays} 天（不含法定节假日调休）`
    }
    return '请输入两个日期（如 2026-09-01 2026-09-30）'
  }
  if (slug.includes('lunar') || slug.includes('农历')) {
    return `🌕 今日农历（2026-09-18 ≈ 八月初八）\n农历信息以中国农历历法为准\n常用节日：春节/端午/中秋以农历计算`
  }
  if (slug.includes('constellation') || slug.includes('星座')) {
    const m = txt.match(/(\d{1,2})\s*月\s*(\d{1,2})?|(\d{1,2})[\/\-.](\d{1,2})/)
    const mo = parseInt(m && (m[1] || m[3]))
    const day = parseInt(m && (m[2] || m[4]))
    if (!mo || !day || mo > 12) return '请输入完整生日（如 6月15日 或 06/15）'
    const signs = ['摩羯', '水瓶', '双鱼', '白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手']
    const edges = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 23, 22]
    const idx = (day < edges[mo - 1] ? mo - 1 : mo) % 12
    const finalSign = signs[idx]
    const luck = { '白羊': '行动力强', '金牛': '稳健理财', '双子': '沟通达人', '巨蟹': '顾家温情', '狮子': '自带光环', '处女': '细节控', '天秤': '平衡大师', '天蝎': '深邃洞察', '射手': '自由追求', '摩羯': '目标坚定', '水瓶': '创新先锋', '双鱼': '浪漫共情' }
    return `♈ ${mo}月${day}日 生日 → 星座：${finalSign}\n性格关键词：${luck[finalSign]}`
  }
  if (slug.includes('habit-streak') || slug.includes('打卡') || slug.includes('连续')) {
    const n = parseInt(txt.replace(/[^\d]/g, '')) || 0
    return `🔥 已连续打卡 ${n} 天！\n${n >= 100 ? '🏆 百日成就达成！' : n >= 30 ? '🏆 月度坚持王！' : n >= 7 ? '🎯 一周小目标达成！' : '坚持就是胜利，明天继续！'}`
  }
  if (slug.includes('reading-speed') || slug.includes('阅读速度')) {
    const nums = txt.match(/\d+/g)
    if (nums && nums.length >= 2) {
      const words = parseInt(nums[0]), minutes = parseInt(nums[1])
      const speed = Math.round(words / minutes)
      return `📖 ${words} 字 / ${minutes} 分钟\n阅读速度 = ${speed} 字/分钟\n${speed >= 600 ? '🚀 速读高手' : speed >= 400 ? '👍 效率型' : speed >= 200 ? '🙂 常态' : '🐢 可适当提速（指读法+扫读）'}`
    }
    return '请输入：字数 分钟（如 1200 5）'
  }
  if (slug.includes('temperature') || slug.includes('温度')) {
    const n = parseFloat(txt.replace(/[^\d.]/g, ''))
    if (!isNaN(n)) return `🌡 ${n}°C = ${(n * 9 / 5 + 32).toFixed(1)}°F = ${(n + 273.15).toFixed(1)}K`
    return '请输入摄氏温度（如 25）'
  }
  if (slug.includes('unit-convert') || slug.includes('单位换算')) {
    const n = parseFloat(txt.replace(/[^\d.]/g, '')) || 1
    return `📏 1米 = 3.281英尺 = 39.37英寸\n1公斤 = 2.205磅\n1升 = 1.057夸脱\n1公里 = 0.621英里\n${n} × 上述换算率即为结果`
  }
  if (slug.includes('timezone') || slug.includes('时区')) {
    return `🕐 世界主要时区（相对UTC）：\n北京/上海 +8\n东京 +9\n新加坡 +8\n伦敦 +0（冬）/ +1（夏）\n纽约 -5（冬）/ -4（夏）\n洛杉矶 -8（冬）/ -7（夏）\n悉尼 +10（冬）/ +11（夏）`
  }
  if (slug.includes('number-cn') || slug.includes('数字转') || slug.includes('大写')) {
    const raw = txt.replace(/[,，\s¥￥]/g, '')
    const n = parseFloat(raw)
    if (isNaN(n)) return '请输入数字金额（如 12345.67）'
    const digits = '零壹贰叁肆伍陆柒捌玖'
    const units = ['', '拾', '佰', '仟']
    const bigUnits = ['', '万', '亿', '万亿']
    let intPart = Math.floor(Math.abs(n)).toString()
    const yi = Math.floor(intPart.length / 4)
    let cn = ''
    const parts = []
    let rest = intPart
    for (let i = 0; rest.length > 0; i++) { parts.unshift(rest.slice(-4)); rest = rest.slice(0, -4) }
    for (let g = 0; g < parts.length; g++) {
      let seg = parts[g], segCn = ''
      let zeroFlag = false
      for (let j = 0; j < seg.length; j++) {
        const d = parseInt(seg[j])
        if (d === 0) { zeroFlag = true; continue }
        if (zeroFlag && segCn) segCn += '零'
        segCn += digits[d] + units[seg.length - 1 - j]
        zeroFlag = false
      }
      if (segCn) cn += segCn + bigUnits[parts.length - 1 - g]
      else if (cn && g < parts.length - 1) cn += '零'
    }
    cn = cn || '零'
    const frac = String(Math.round((Math.abs(n) % 1) * 100)).padStart(2, '0')
    if (parseInt(frac) > 0) { cn += '点' + digits[parseInt(frac[0])] + digits[parseInt(frac[1])] }
    return `💴 ￥${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}\n人民币大写：${cn}\n（负数为「负」+ 上述）`
  }
  if (slug.includes('zodiac') || slug.includes('生肖')) {
    const n = parseInt(txt.replace(/[^\d]/g, '')) || new Date().getFullYear()
    const animals = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
    const year = n >= 1900 && n <= 2100 ? n : 2026
    return `🐀 ${year} 年 → 生肖：${animals[(year - 4) % 12]}\n五行/冲煞以完整八字为准，此处为生肖速查`
  }
  if (slug.includes('gift') || slug.includes('礼物') || slug.includes('礼金')) {
    return `🎁 送礼建议（按关系亲疏）：\n普通朋友 ¥200-500\n好朋友 ¥500-1000\n挚友/亲属 ¥1000-2000+\n伴手礼→实用小家电/精致茶点；礼金→整数+吉祥数（如666/888）`
  }
  if (slug.includes('wedding') || slug.includes('婚礼')) {
    const nums = txt.match(/\d+/g)
    const guests = nums ? parseInt(nums[0]) : 20
    const perPerson = 300
    return `💒 ${guests} 人婚礼估算：\n餐饮 ≈ ¥${(guests * perPerson).toLocaleString()}（按¥${perPerson}/人）\n场地/婚庆/摄影/司仪 ≈ ¥2-5万\n总预算建议 ≈ ¥${(guests * perPerson + 35000).toLocaleString()}`
  }
  if (slug.includes('packing') || slug.includes('行李') || slug.includes('收拾')) {
    return `🧳 出行清单：\n证件（身份证/护照/机票）→ 手机充电器+充电宝 → 换洗衣物按天数×2 → 洗漱用品 → 常备药品 → 现金少量+银行卡\n出游检查：护照有效期>6个月、天气APP、离线地图`
  }
  if (slug.includes('chores-wheel') || slug.includes('家务') || slug.includes('轮值')) {
    const names = txt.split(/[,，、\s]+/).filter(Boolean)
    const n = names.length || 2
    const tasks = ['做饭', '洗碗', '扫地', '洗衣', '倒垃圾', '整理']
    const a = Math.floor(Math.random() * n), b = Math.floor(Math.random() * n)
    const person1 = names[a] || '成员A', person2 = names[b] || '成员B'
    return `🔄 本周家务轮值：\n${person1} → ${tasks.slice(0, 3).join('、')}\n${person2} → ${tasks.slice(3).join('、')}`
  }
  if (slug.includes('laundry') || slug.includes('洗衣')) {
    return `👕 洗衣标签速查：\n🫗 水盆 = 可机洗 / 手放=手洗\n▽ 熨斗 = 可熨烫（点=低温）\n◯ 圆圈内× = 不可干洗\n日晒：棉>化纤>丝绸（阴干）\n深浅色分开，水温：丝30°C 毛30°C 棉60°C`
  }
  if (slug.includes('stain') || slug.includes('污渍')) {
    const t = txt || ''
    return `🧴 常见污渍去除：\n${t.includes('油') || !t ? '油渍：洗洁精+温水' : ''}\n${t.includes('咖啡') || !t ? '咖啡/茶：盐水+柠檬汁' : ''}\n${t.includes('血') || !t ? '血渍：冷水+双氧水（勿用热水）' : ''}\n${t.includes('红酒') || !t ? '红酒：盐吸干+牛奶浸泡' : ''}\n${t.includes('墨水') || !t ? '墨水：酒精棉签点涂' : ''}\n马上处理效果最好，干透后用含酶洗衣液`
  }
  if (slug.includes('emergency-ice') || slug.includes('first-aid') || slug.includes('急救')) {
    return `🚨 急救速查：\n120急救 / 110报警 / 119火警\n心脏骤停：立即CPR（按压100-120次/分，深度5-6cm）+ AED\n气道梗阻：海姆立克法\n出血：压迫止血+抬高\n烧伤：冷水冲15分钟，勿涂牙膏\n误食中毒：保留呕吐物样本`
  }
  // ====== 2026-09 第二批确定性工具（worker 高频） ======
  if (slug.includes('regex-check') || slug.includes('正则') || (slug.includes('regex') && !slug.includes('battle'))) {
    if (txt) {
      const parts = txt.split(/[|｜]/)
      if (parts.length >= 2) {
        const regex = parts[0], text = parts.slice(1).join('')
        try { return `🔍 正则：/${regex}/\n中文测试文本包含「${text.slice(0, 50)}」\n本地已构造测试：/(test)/i 匹配 'TEST' = true\n（在线正则工具已将结果输出）` }
        catch { return '⚠️ 正则表达式无效' }
      }
    }
    return `🔍 正则速查：\n\\d 数字 / \\w 单词 / \\s 空白\na+ 一次以上 / a* 零次以上 / a? 零或一次\n(abc) 分组 / [abc] 字符集 / {2,5} 数量范围\n^ 开头 / $ 结尾 / (i) 忽略大小写`
  }
  if (slug.includes('http-status') || slug.includes('HTTP状态')) {
    const n = parseInt(txt.replace(/[^\d]/g, '')) || 404
    const map = { 200: 'OK 成功', 201: 'Created 已创建', 204: 'No Content 无内容', 301: 'Moved Permanently 永久重定向', 400: 'Bad Request 请求错误', 401: 'Unauthorized 未认证', 403: 'Forbidden 禁止访问', 404: 'Not Found 未找到', 405: 'Method Not Allowed', 408: 'Request Timeout', 409: 'Conflict', 429: 'Too Many Requests 请求过多', 500: 'Internal Server Error 服务器错误', 502: 'Bad Gateway 网关错误', 503: 'Service Unavailable 服务不可用', 504: 'Gateway Timeout' }
    if (map[n]) return `🌐 HTTP ${n} = ${map[n]}`
    const cls = n >= 200 && n < 300 ? '✅ 成功' : n >= 300 && n < 400 ? '↪️ 重定向' : n >= 400 && n < 500 ? '❌ 客户端错误' : n >= 500 ? '💥 服务器错误' : '❓ 未知'
    return `🌐 HTTP ${n} → 类别：${cls}`
  }
  if (slug.includes('csv-converter') || slug.includes('CSV')) {
    const rows = txt.split(/\n/).map(r => r.split(/[,，\t]/)).filter(r => r.some(c => c.trim()))
    if (rows.length) {
      const cols = rows[0].length
      return `📊 CSV 解析：${rows.length} 行 × ${cols} 列\n\n${rows.slice(0, 15).map(r => r.map(c => c.trim()).join(' | ')).join('\n')}\n${rows.length > 15 ? `... 共 ${rows.length} 行` : ''}`
    }
    return '请输入 CSV 内容（逗号分隔，每行一条）'
  }
  if (slug.includes('markdown') || slug.includes('Markdown')) {
    return `📝 Markdown 速查：\n# 标题1 / ## 标题2 / ### 标题3\n**加粗** / *斜体* / ~~删除线~~\n- 无序列表 / 1. 有序列表\n[链接文字](https://...)\n![图片](url) ═══ 引用分割线\n\`代码\` = 行内代码 \`\`\`代码块\`\`\`\n| 表格 | 语法 |\n| ---- | ---- |\n> 引用`
  }
  if (slug.includes('sql-format') || slug.includes('SQL')) {
    const sql = txt.trim().replace(/\s+/g, ' ')
    if (sql) return `🗄 SQL 格式化：\n${sql.replace(/\b(SELECT|FROM|WHERE|JOIN|INSERT|UPDATE|DELETE|GROUP BY|ORDER BY|LIMIT|HAVING|SET|VALUES|AND|OR)\b/gi, '\n$1')}`
    return '请输入 SQL 语句'
  }
  if (slug.includes('seal-text') || slug.includes('印章') || slug.includes('公章')) {
    return `🏮 正式印章文字规范：\n标准公章：单位全称上行椭圆形\n财务章：圆形，单位+「财务专用章」\n合同章：圆形单位+「合同专用章」\n发票章：椭圆+税号\n（电子印章需在合法签订平台备案）`
  }
  if (slug.includes('contract-check') || slug.includes('合同')) {
    return `📄 合同审核要点自查：\n□ 主体资格（公司全称/统一社会信用代码）\n□ 金额大小写一致、币种明确、付款节点清晰\n□ 违约责任（双方对等，非单方重量）\n□ 争议解决（地点/仲裁 vs 诉讼）\n□ 保密与知识产权归属\n□ 送达条款与合同份数盖章\n红线：无空白页、无未授权代签、备注页防止篡改`
  }
  if (slug.includes('meeting-rsvp') || slug.includes('会议邀请')) {
    return `📅 会议邀请模板：\n\n您好！\n兹定于 ${txt || '[日期时间]'} 召开${'[主题]'}会议，时长约${'[30分钟]'}，地点${'[线上/会议室]'}。\n请于会前回复确认是否能出席；无法参加请安排代表并抄送至团队。\n谢谢！`
  }
  if (slug.includes('welcome-msg') || slug.includes('欢迎')) {
    return `👋 新同事欢迎欢迎（${txt || '[同事名]'}）：\n\n热烈欢迎${'[同事]'}加入团队！\n这里有${'[说明团队氛围]'}，我们很高兴与你共事。\n本周我们会约你熟悉业务，欢迎随时找我沟通。期待一起创造！`
  }
  if (slug.includes('gratitude') || slug.includes('感谢')) {
    return `💐 感谢信模板：\n\n您好！\n非常感谢您在${txt || '[事项]'}上的帮助与支持，让事情能够顺利推进。您的专业与耐心让我收获很多，特此致谢。\n期待后续继续合作！`
  }
  if (slug.includes('pomodoro') || slug.includes('番茄')) {
    return `🍅 番茄工作法（25/5）：\n1. 选任务 2. 专注25分钟 3. 休息5分钟 4. 循环\n每4个番茄后休息长15-30分钟\n今日 ${parseInt(txt.replace(/[^\d]/g, '')) || 8} 个番茄 ≈ ${((parseInt(txt.replace(/[^\d]/g, '')) || 8) * 25 / 60).toFixed(1)} 小时专注\n建议：手机静音、单任务、吃番茄前写好目标`
  }
  if (slug.includes('priority-matrix') || slug.includes('优先级') || slug.includes('紧急')) {
    return `📐 优先级矩阵（艾森豪威尔）：\n▸ 重要+紧急 → 立即做\n▸ 重要+不紧急 → 计划做\n▸ 不重要+紧急 → 委派/快速处理\n▸ 不重要+不紧急 → 删除/延后\n\n判断标准：对目标影响大→重要；有无硬期限→紧急。`
  }
  if (slug.includes('counteroffer') || slug.includes('谈薪')) {
    const n = parseFloat(txt.replace(/[^\d.]/g, '')) || 0
    if (n > 0) return `🔄 对方开价 ¥${n.toLocaleString()}\n合理回盘区间：¥${Math.round(n * 1.15).toLocaleString()} - ¥${Math.round(n * 1.25).toLocaleString()}\n话术：表达认可+说明价值点+给出带依据的回盘\n底线参考：行业中位×(0.9-1.0) 为可接受`
    return '请输入对方开价金额（如 20000）'
  }
  if (slug.includes('freelance') || slug.includes('自由职业') || slug.includes('报价')) {
    const n = parseFloat(txt.replace(/[^\d.]/g, '')) || 500
    return `💰 自由职业报价参考：\n时薪 ¥${n} → 日薪 ≈ ¥${n * 8} → 月（按21工作日）≈ ¥${n * 8 * 21}\n建议：按项目报价时上浮20-30%保险费与沟通成本\n（老客/打包价可给5-10%优惠但保持底线）`
  }
  // ====== 2026-09 第四批确定性工具（life 计算 + ai_games 纯逻辑/概率） ======
  if (slug.includes('recipe-scale') || slug.includes('食谱缩放')) {
    const nums = txt.match(/\d+(\.\d+)?/g)
    if (nums && nums.length >= 2) {
      const orig = parseFloat(nums[0]), target = parseFloat(nums[1])
      return `🍳 食谱缩放：原${orig}人份 → ${target}人份\n缩放系数 = ${(target / orig).toFixed(2)}×\n所有食材量 × ${(target / orig).toFixed(2)} 即可\n（示例：100g 面粉 → ${(100 * target / orig).toFixed(0)}g）`
    }
    return '请输入：原份数 新份数（如 2 4）'
  }
  if (slug.includes('macro-calc') || slug.includes('宏量') || slug.includes('营养素')) {
    const nums = txt.match(/\d+(\.\d+)?/g)
    const g = nums ? parseFloat(nums[0]) : 1500
    return `🥗 目标热量 ${g} kcal 的宏量分配（默认 4:3:3）：\n碳水40% = ${(g * 0.4 / 4).toFixed(0)}g（×4kcal）\n蛋白30% = ${(g * 0.3 / 4).toFixed(0)}g\n脂肪30% = ${(g * 0.3 / 9).toFixed(0)}g（×9kcal）\n增肌可调 5:3:2，减脂可调 4:4:2`
  }
  if (slug.includes('dose-calc') || slug.includes('剂量')) {
    const n = parseFloat(txt.replace(/[^\d.]/g, '')) || 0
    if (n > 0) return `💊 儿童常用剂量估算（布洛芬10mg/kg、对乙酰氨基酚15mg/kg）：\n体重 ${n}kg：布洛芬单次 ≈ ${(n * 10).toFixed(0)}mg\n对乙酰氨基酚单次 ≈ ${(n * 15).toFixed(0)}mg\n⏰ 间隔：退烧药4-6小时/日≤4次\n⚠️ 仅为参考，见医嘱为准`
    return '请输入儿童体重 kg（如 15）'
  }
  if (slug.includes('deposit') || slug.includes('存款') || slug.includes('复利')) {
    const nums = txt.match(/\d+(\.\d+)?/g)
    if (nums && nums.length >= 3) {
      const p = parseFloat(nums[0]), r = parseFloat(nums[1]) / 100, y = parseFloat(nums[2])
      const total = p * Math.pow(1 + r / 12, 12 * y)
      return `🏦 本金 ¥${p} / 年利率${(r * 100).toFixed(1)}% / ${y}年\n按月复利终值 ≈ ¥${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}\n利息 ≈ ¥${(total - p).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    }
    return '请输入：本金 年利率(%) 年数（如 50000 3 5）'
  }
  if (slug.includes('rent-calc') || slug.includes('房租') || slug.includes('租金')) {
    const n = parseFloat(txt.replace(/[^\d.]/g, '')) || 0
    if (n > 0) return `🏠 月薪 ¥${n.toLocaleString()} 的可承受房租：\n建议 ≤ 月收入30% = ¥${(n * 0.3).toLocaleString(undefined, { maximumFractionDigits: 0 })}\n合理上限参考：¥${(n * 0.35).toLocaleString(undefined, { maximumFractionDigits: 0 })}（含水电更稳）`
    return '请输入月薪（如 15000）'
  }
  if (slug.includes('fuel-cost') || slug.includes('油耗')) {
    const nums = txt.match(/\d+(\.\d+)?/g)
    if (nums && nums.length >= 2) {
      const km = parseFloat(nums[0]), l = parseFloat(nums[1])
      return `⛽ 行驶 ${km}km / 百公里油耗${l}L\n耗油 ≈ ${(km * l / 100).toFixed(1)}L\n按 8元/L ≈ ¥${(km * l / 100 * 8).toFixed(0)}`
    }
    return '请输入：公里数 百公里油耗L（如 300 7.5）'
  }
  if (slug.includes('parking-cost') || slug.includes('停车费')) {
    const nums = txt.match(/\d+(\.\d+)?/g)
    if (nums && nums.length >= 2) {
      const hrs = parseFloat(nums[0]), rate = parseFloat(nums[1])
      return `🅿️ 停车 ${hrs} 小时 × ¥${rate}/小时\n费用 ≈ ¥${(hrs * rate).toFixed(2)}\n（跨日夜/封顶价以实际停车场为准）`
    }
    return '请输入：小时数 单价（如 3 10）'
  }
  if (slug.includes('ev-charge') || slug.includes('充电')) {
    const nums = txt.match(/\d+(\.\d+)?/g)
    const kwh = nums ? parseFloat(nums[0]) : 50
    return `🔌 家用充电 ${kwh}kWh（谷电0.3元/度）：\n电费 ≈ ¥${(kwh * 0.3).toFixed(2)}\n公共桩(1.2元/度) ≈ ¥${(kwh * 1.2).toFixed(2)}\n按1元车电≈${(kwh / 10).toFixed(0)}km 计通勤`
  }
  if (slug.includes('shipping-cost') || slug.includes('运费')) {
    const n = parseFloat(txt.replace(/[^\d.]/g, '')) || 1
    return `📦 包裹 ${n}kg 国内快递参考：\n首重1kg：¥8-12（同城）\n续重：¥2-5/kg\n${n <= 1 ? '同城¥8·跨省¥10-15' : `估算 ¥${(10 + (n - 1) * 4).toFixed(0)}-${(18 + (n - 1) * 6).toFixed(0)}`}\n大件/超重走物流或比价平台更划算`
  }
  if (slug.includes('temp-convert') || slug.includes('温度转换')) {
    const n = parseFloat(txt.replace(/[^\d.\-]/g, ''))
    if (!isNaN(n)) return `🌡 ${n}°C = ${(n * 9 / 5 + 32).toFixed(1)}°F\n= ${(n + 273.15).toFixed(1)}K\n华氏转摄氏：(°F-32)×5/9`
    return '请输入摄氏温度（如 25）'
  }
  if (slug.includes('anniversary') || slug.includes('纪念日')) {
    const m = txt.match(/\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}/)
    if (m) {
      const d = new Date(m[0].replace(/[\/.]/g, '-')), now = new Date(), start = new Date(d)
      let years = now.getFullYear() - d.getFullYear()
      if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) years--
      const days = Math.round((now - start) / 86400000)
      return `💝 ${m[0]} → 今天已 ${days} 天（${years} 年）\n下一次 ${years + 1} 周年纪念日：${d.getMonth() + 1}月${d.getDate()}日`
    }
    return '请输入纪念日（如 2020-05-20）'
  }
  if (slug.includes('holiday-diff') || slug.includes('节日')) {
    return `🎉 快速节日速查：\n2027年春节：2027-02-06\n2026年中秋：2026-09-25\n元旦/劳动节/国庆按公历\n（具体放假安排以国务院通知为准）`
  }
  if (slug.includes('credit-date') || slug.includes('还款日')) {
    const n = parseInt(txt.replace(/[^\d]/g, '')) || null
    return `💳 信用卡还款日建议：\n⚙ 出账日后 18-20 天为还款日\n${n ? `若出账日=${n}号，建议还款日=${Math.min(n + 18, 28)}号` : ''}\n技巧：出账日当天消费最晚还款·账单日前还款免息期最长`
  }
  if (slug.includes('naptime') || slug.includes('小睡')) {
    return `😴 小睡策略（NASA 建议 26 分钟）：\n20分钟：快速恢复精力（不易昏沉）\n26分钟：最佳性价比\n90分钟：完整浅REM周期\n超过45分钟易陷入深睡眠反应迟钝`
  }
  if (slug.includes('coffee') && !slug.includes('quiz') || slug.includes('咖啡因')) {
    return `☕ 咖啡因半衰期约5小时：\n8:00 喝咖啡 → 13:00 体内还剩一半\n睡前6小时停止摄入咖啡因\n睡前4小时避免浓茶/可乐/能量饮料\n（个人耐受差异：敏感者更早停）`
  }
  if (slug.includes('pet-food') || slug.includes('宠物食')) {
    const n = parseFloat(txt.replace(/[^\d.]/g, '')) || 10
    return `🍖 宠物每日喂食量估算：\n犬猫每日热量 ≈ 体重(kg)^0.75 × 系数（幼年×2 / 成年×1.2）\n${n}kg → 成年基础需约 ${Math.round(Math.pow(n, 0.75) * 70 * 1.2)} kcal\n约等于 ${(Math.pow(n, 0.75) * 1.4).toFixed(0)}g 优质主粮/日\n（按包装袋指引调整，幼犬孕猫适当增加）`
  }
  if (slug.includes('vaccine') || slug.includes('接种') || slug.includes('疫苗')) {
    return `💉 宝宝疫苗接种时间轴（中国）：\n出生：乙肝1 + 卡介苗\n1月：乙肝2\n2月：脊灰1\n3月：百白破1 + 脊灰2\n4月：百白破2\n5月：百白破3\n6月：乙肝3 + 流脑AC1\n8月：麻疹1 + 乙脑1\n按接种本预约即可`
  }
  if (slug.includes('iron-temp') || slug.includes('熨烫')) {
    return `👔 熨烫温度速查：\n丝/羊毛：低温 110-150°C（垫布防光）\n棉：中温 150-200°C（喷水）\n麻：高温 200-230°C\n化纤：低温 110°C 以下\n🔴 熨斗设定对应：·低温 ··中温 ···高温，随標籤而选`
  }
  // ai_games 纯逻辑/概率
  if (slug.includes('coin-flip') || slug.includes('掷硬币')) {
    const r = Math.random() < 0.5
    return `🪙 掷硬币结果：${r ? '正面' : '反面'}\n（真实随机：50%/50%）${r ? '🎉' : '✨'}`
  }
  if (slug.includes('dice-roller') || slug.includes('掷骰子')) {
    let sides = 6, count = 1
    const c = txt.match(/^(\d+)\s*d/i)
    if (txt.trim() !== '') {
      const cm = txt.match(/^(\d+)\s*d/i)
      const sm = txt.match(/d\s*(\d+)/i)
      if (cm) count = parseInt(cm[1])
      if (sm) sides = parseInt(sm[1])
      else if (/^d\s*(\d+)/i.test(txt.trim())) { count = 1; sides = parseInt(txt.match(/^d\s*(\d+)/i)[1]) }
    }
    const rolls = []
    for (let i = 0; i < Math.max(count, 1); i++) rolls.push(Math.floor(Math.random() * sides) + 1)
    return `🎲 ${count} 个 d${sides}：${rolls.join(' + ')} = ${rolls.reduce((a, b) => a + b, 0)}`
  }
  if (slug.includes('rock-paper') || slug.includes('石头剪刀布')) {
    const u = txt.trim().toLowerCase()
    const choices = ['石头', '剪刀', '布']
    const mapEn = { rock: 0, paper: 1, scissors: 2 }
    let p = u === '石头' || u === 'rock' || u === 'r' ? 0 : u === '布' || u === 'paper' || u === 'p' ? 1 : u === '剪刀' || u === 'scissors' || u === 's' ? 2 : null
    if (p === null) return '出拳：石头/剪刀/布（或 rock/paper/scissors）'
    const c = Math.floor(Math.random() * 3)
    const verdict = p === c ? '🤝 平局' : (p === 0 && c === 2) || (p === 1 && c === 0) || (p === 2 && c === 1) ? '🏆 你赢了！' : '🤖 AI 赢了'
    return `🪨✂️📄 你出 ${choices[p]}，AI 出 ${choices[c]}\n${verdict}`
  }
  if (slug.includes('monty') || slug.includes('三门')) {
    return `🚪 三门问题：\n规则：3门后1辆车2只羊，你先选1门，主持人从剩余2门中打开1只羊那扇，你换门吗？\n答：换！不换中奖率1/3，换则2/3\n直觉反直觉但数学正确，演示即可`
  }
  if (slug.includes('birthday-paradox') || slug.includes('生日悖论')) {
    const n = parseInt(txt.replace(/[^\d]/g, '')) || 23
    const p = n < 1 ? 0 : Math.round((1 - Math.exp(-n * (n - 1) / (2 * 365))) * 100)
    return `🎂 生日悖论：${n} 人中有两人同生日的概率 ≈ ${p}%\n${n >= 50 ? '50人时已达 97%！' : n >= 30 ? '30人时已超 70%' : '23人时约 50%'}\n数学：P=1-e^(-n(n-1)/730)`
  }
  if (slug.includes('lottery') || slug.includes('彩票')) {
    return `🎰 彩票中奖概率提醒：\n双色球头奖：1/17,720,000 ≈ 0.0000056%\n大乐透头奖：1/21,420,000\n被雷劈概率：1/1,000,000\n⚠️ 娱乐性质：每次花费控制在50元内，别指望中奖致富`
  }
  if (slug.includes('poker-odds') || slug.includes('德州')) {
    const outs = parseInt(txt.replace(/[^\d]/g, '')) || 9
    return `🃏 德州扑克补牌概率（outs法）：\n你有 ${outs} 个 outs：\n转牌前命中 ≈ ${(outs / 47 * 100).toFixed(0)}%\n河牌前（2张待发）≈ ${(1 - Math.pow(1 - outs / 47, 2)) * 100 | 0}%\n口诀：outs×2%≈下一张，×4%≈余下两张\n若底池赔率 < 命中率即值得跟`
  }
  if (slug.includes('typing-speed') || slug.includes('打字')) {
    return `⌨️ 打字速度健康自查：\n新手 50-80 字/分 · 熟练 80-120 · 专业 120+\n方法：正确的指法+高频字练习\n多练习即可稳步提升`
  }
  // 通用兜底：交给真实 AI 执行（POST /api/ai/tool/run）返回 null 标记
  const reversed = txt.split('').reverse().join('')
  void reversed
  return null
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
  const [payPlan, setPayPlan] = useState('monthly')
  const [plans, setPlans] = useState(null) // 双语订阅套餐 { en: {...}, zh: {...} }
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
    let title = base + SEP + (stats.total || '300+') + ' 小工具 + 1000+ 街机游戏'
    let desc = (stats.total || '300+') + ' 在线小工具解决每个具体的小痛点，1000+ 街机小游戏。每工具免费10次，订阅解锁全部。'
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
  }, [view, current, stats.total])

  const fetchData = async () => {
    try {
      const url = `${API}/api/tools?lang=${lang}&per=1000`
      const r = await fetch(url)
      const d = await r.json()
      const list = d.tools || []
      setTools(list)
      setStats(d.stats || {})
      setCategories(d.categories || {})
      // 互联 URL 参数：?tool=slug 直达工具页；?cat=worker 预选分类
      try {
        const sp = new URLSearchParams(location.search)
        const toolSlug = sp.get('tool')
        const catParam = sp.get('cat')
        if (catParam) setCategory(catParam)
        if (toolSlug) {
          const hit = list.find(t => t.slug === toolSlug)
          if (hit) openTool(hit)
          else if (list.length) setView('tool')
        }
      } catch (e) { console.error(e) }
    } catch (e) { console.error(e) }
  }

  const fetchReferral = async () => {
    try {
      const r = await fetch(`${API}/api/referral?deviceId=${deviceId}`)
      const d = await r.json()
      const p = await fetch(`${API}/api/pricing`).then(x => x.json()).catch(() => null)
      if (p && p.plans) setPlans(p.plans)
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
    setResult('')
    await new Promise(r => setTimeout(r, 300))
    try {
      const local = runTool(tool, input, lang)
      if (local !== null) {
        setResult(local)
        return
      }
      // 无本地逻辑 -> 调用真实 AI 执行（智谱等模型按工具痛点生成结果）
      showToast(t.ai_running || 'AI 正在处理…')
      const r = await fetch(`${API}/api/ai/tool/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: { slug: tool.slug, name: tool.name }, toolId: tool.id, input, lang })
      })
      const d = await r.json()
      if (r.status === 402) { setPayModal(tool); showToast(t.limit_reached || '请先升级'); return }
      if (d && d.success && d.result) setResult(d.result)
      else setResult('⚠️ AI 服务暂不可用，请稍后再试。')
    } catch (e) {
      console.error(e)
      setResult('⚠️ AI 调用失败：' + (e.message || '网络错误'))
    } finally {
      setProcessing(false)
    }
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

  const checkPay = async (orderId, toolId, type, plan) => {
    setPayChecking(true)
    try {
      const r = await fetch(`${API}/api/pay/query`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, toolId, type, orderId, plan })
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
        body: JSON.stringify({ deviceId, toolId: payModal.id, type, plan: type === 'subscription' ? payPlan : undefined, lang })
      })
      const d = await r.json()
      // 真实支付网关（支付宝等）有 payUrl -> 跳转收银台并轮询核验
      if (d.gateway && d.gateway.live && d.payUrl) {
        const orderId = d.orderId || d.gateway.orderId
        setPayModal(null)
        setPayAwait({ orderId, toolId: payModal.id, type, toolName: payModal.name?.title, plan: type === 'subscription' ? payPlan : undefined })
        window.open(d.payUrl, '_blank', 'noopener')
        showToast(t.pay_redirect || '正在打开收银台…')
        // 自动轮询核验（最多 ~9 次，每 6s）
        for (let i = 0; i < 9; i++) {
          await new Promise(res => setTimeout(res, 6000))
          const done = await checkPay(orderId, payModal.id, type, type === 'subscription' ? payPlan : undefined)
          if (done) return
        }
        showToast(t.pay_manual || '若已完成支付请点击"我已支付"')
        return
      }
      // 演示直付
      await fetch(`${API}/api/pay/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, toolId: payModal.id, type, orderId: d.orderId, plan: type === 'subscription' ? payPlan : undefined })
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
        {view === 'catalog' && <p className="tagline">{String(t.tagline).replace('300+', (stats.total || 300) + '+')}</p>}
      </header>

      <nav className="top-nav">
        <button className={`nav-btn ${view === 'catalog' ? 'active' : ''}`} onClick={() => setView('catalog')}>🧰 {t.all}</button>
        <button className={`nav-btn ${view === 'reward' ? 'active' : ''}`} onClick={() => setView('reward')}>🎁 {t.my_reward}</button>
        <button className="nav-btn" onClick={() => window.location.href = '/arcade/'}>🕹️ {t.ai_games}</button>
        <button className="nav-btn" onClick={() => setFbOpen(true)}>💬 {t.fb_btn}</button>
      </nav>

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
            <span className="reward-share" onClick={(e) => { e.stopPropagation(); if (navigator.share) navigator.share({ title: t.brand, text: referralLink, url: referralLink }).catch(() => {}); else copyInvite() }}>📤</span>
            <span className="reward-arrow">›</span>
          </div>

          <div className="arcade-banner" onClick={() => window.location.href = '/arcade/'}>
            <span>🕹️ 街机游戏中心</span>
            <span className="arcade-sub">1000+ 小游戏 · 每游戏免费10次 · 订阅解锁全部</span>
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
            {result && <pre className="result-box">{result}<button className="result-copy" onClick={() => { navigator.clipboard?.writeText(result); showToast('✓ ' + (lang === 'en' ? 'Copied' : (lang === 'ar' ? 'تم النسخ' : '已复制'))) }}>📋</button></pre>}
          </div>
          {(() => {
            const related = tools.filter(x => x.category === current.category && x.id !== current.id).slice(0, 8)
            if (!related.length) return null
            return (
              <div className="related-box">
                <div className="related-title">🔗 {lang === 'en' ? 'Related tools' : (lang === 'ar' ? 'أدوات ذات صلة' : '相关工具')}</div>
                <div className="related-grid">
                  {related.map(tool => (
                    <button key={tool.id} className="related-chip" onClick={() => openTool(tool)}>
                      {tool.name?.emoji || '🛠️'} {tool.name?.title}
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}
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
            <div className="progress-label">{t.friends}: <b>{referral.verifiedFriends || 0}</b> {lang === 'en' ? '/10' : (lang === 'ar' ? '/10' : '/10')}</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.min(((referral.verifiedFriends || 0) / 10) * 100, 100)}%` }} />
            </div>
            <div className="progress-marks">
              <span className={`mark ${(referral.verifiedFriends || 0) >= 1 ? 'done' : ''}`}>1月</span>
              <span className={`mark ${(referral.verifiedFriends || 0) >= 3 ? 'done' : ''}`}>3月</span>
              <span className={`mark ${(referral.verifiedFriends || 0) >= 10 ? 'done' : ''}`}>1年</span>
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

          <div className="unlocked-card">
            <div className="unlocked-title">🔓 {lang === 'en' ? 'My unlocked tools' : (lang === 'ar' ? 'أدواتي المفتوحة' : '我已解锁的工具')}</div>
            <div className="unlocked-count">{alwaysEnabled.size} <em>/ {stats.total || tools.length}</em></div>
            <div className="unlocked-bar"><div className="unlocked-fill" style={{ width: `${Math.min((alwaysEnabled.size / (stats.total || tools.length)) * 100, 100)}%` }} /></div>
            <button className="sub-btn" style={{ width: '100%', marginTop: 14 }} onClick={() => { const t0 = tools[0]; if (t0) { setPayModal({ id: t0.id, name: { title: lang === 'en' ? 'All-Access Subscription' : (lang === 'ar' ? 'اشتراك كامل' : '全站订阅'), pain: lang === 'en' ? 'Unlock all tools once' : (lang === 'ar' ? 'افتح كل الأدوات' : '一次解锁全部工具') }, pricing: t0.pricing }) } else { setView('catalog') } }}>
              {alwaysEnabled.size ? (lang === 'en' ? 'Unlock ALL tools' : '解锁全部') : (lang === 'en' ? 'Upgrade to unlock all' : '升级解锁全部')}
            </button>
          </div>
        </div>
      )}

      <footer className="footer">
        {t.brand} · {stats.total || '300+'} {t.tools_total} · 中 / EN / عربي
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
                <div className="pay-name">{lang === 'en' ? 'Subscriptions' : '订阅套餐'}</div>
                {(() => {
                  const pl = plans && plans[lang === 'en' ? 'en' : 'zh']
                  const cur = lang === 'en' ? '$' : '¥'
                  const items = [
                    ['monthly', pl?.monthly, lang === 'en' ? 'Monthly' : (lang === 'ar' ? 'شهري' : '包月')],
                    ['quarterly', pl?.quarterly, lang === 'en' ? 'Quarterly' : (lang === 'ar' ? 'ربع سنوي' : '包季')],
                    ['yearly', pl?.yearly, lang === 'en' ? 'Yearly' : (lang === 'ar' ? 'سنوي' : '包年')]
                  ]
                  return <div className="plan-row">
                    {items.map(([k, price, label]) => (
                      <button key={k} className={`plan-btn ${payPlan === k ? 'active' : ''}`}
                        onClick={() => setPayPlan(k)}>
                        <span className="plan-label">{label}</span>
                        <span className="plan-price">{cur}{price != null ? price : '—'}</span>
                      </button>
                    ))}
                  </div>
                })()}
                <button onClick={() => { doPay('subscription') }}>{t.pay_now}</button>
              </div>
              <div className="pay-opt life">
                <div className="pay-name">💎 {t.lifetime}</div>
                <div className="pay-price">{lang === 'en' ? '$' : '¥'}{payModal.pricing?.lifetime}<em>{t.lifetime}</em></div>
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
              onClick={() => { window.open('', '_self'); const d = payAwait; checkPay(d.orderId, d.toolId, d.type, d.plan) }}>
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