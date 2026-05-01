// =====================================================================
// 全球宏观经济联动系统 - 数据层
// 所有传导系数基于公开研究文献，重要数据标注来源
// =====================================================================

// 8 个杠杆 / 政策工具 (LEVERS)
// 数值范围基于历史可观察区间
const LEVERS = [
  {
    id: 'fed_rate', name: '美联储利率', en: 'Fed Funds Rate',
    unit: '%', baseline: 4.5, min: 0, max: 8, step: 0.25,
    description: '联邦基金利率目标',
    historical: [
      { val: 0.25, label: '2020 ZLB' },
      { val: 5.5, label: '2023高点' },
    ]
  },
  {
    id: 'cpi', name: '美国通胀', en: 'CPI YoY',
    unit: '%', baseline: 2.5, min: -1, max: 10, step: 0.1,
    description: 'CPI同比，美联储隐含目标2%',
    historical: [
      { val: 9.1, label: '2022.6峰值' },
      { val: -0.4, label: '2009通缩' },
    ]
  },
  {
    id: 'unemployment', name: '失业率', en: 'Unemployment',
    unit: '%', baseline: 4.0, min: 2, max: 12, step: 0.1,
    description: '美国失业率，自然失业率约4-4.5%',
    historical: [
      { val: 3.4, label: '2023低点' },
      { val: 14.7, label: '2020.4 COVID' },
    ]
  },
  {
    id: 'us_tariff', name: '平均关税', en: 'US Avg Tariff',
    unit: '%', baseline: 3, min: 0, max: 25, step: 0.5,
    description: '美国进口加权平均关税率',
    historical: [
      { val: 1.5, label: '2017基准' },
      { val: 17, label: '2025年情景' },
    ]
  },
  {
    id: 'oil_price', name: '油价 WTI', en: 'WTI Oil',
    unit: '$', baseline: 75, min: 20, max: 150, step: 1,
    description: 'WTI原油价格',
    historical: [
      { val: -37, label: '2020.4负值' },
      { val: 130, label: '2022俄乌' },
    ]
  },
  {
    id: 'china_credit', name: '中国信贷脉冲', en: 'China Credit Impulse',
    unit: '%', baseline: 0, min: -15, max: 15, step: 0.5,
    description: '中国社融存量增速变化（领先全球工业6-9个月）',
    historical: [
      { val: 12, label: '2020刺激' },
      { val: -10, label: '2018去杠杆' },
    ]
  },
  {
    id: 'fiscal_deficit', name: '美国财政赤字', en: 'US Fiscal Deficit',
    unit: '%GDP', baseline: 6, min: 0, max: 15, step: 0.5,
    description: '联邦赤字占GDP比例',
    historical: [
      { val: 14.7, label: '2020 COVID' },
      { val: 2.4, label: '2007正常' },
    ]
  },
  {
    id: 'risk_event', name: '地缘风险', en: 'Geopolitical Risk',
    unit: 'idx', baseline: 100, min: 50, max: 400, step: 5,
    description: 'GPR指数 (Caldara & Iacoviello 2018)，纯地缘冲突/战争风险',
    historical: [
      { val: 350, label: '2003伊战' },
      { val: 280, label: '2022俄乌' },
    ]
  },
  {
    id: 'policy_uncertainty', name: '政策不确定性', en: 'Policy Uncertainty',
    unit: 'idx', baseline: 100, min: 50, max: 400, step: 5,
    description: 'EPU指数 (Baker, Bloom & Davis 2016)，含贸易、税收、监管政策不确定性。与GPR分开，因关税战属政策冲击而非地缘冲突。',
    historical: [
      { val: 280, label: '2019贸易战' },
      { val: 350, label: '2020 COVID' },
    ]
  },
];

// 28 个节点 (NODES)
// 5层径向布局: ring 0=中心, 1=内圈, 2=中圈, 3=外圈, 4=最外
// 每层用 angle 决定圆周位置
const NODES = [
  // ========== Layer 1: 货币基础 (内圈) ==========
  {
    id: 'global_liquidity', name: '全球流动性', en: 'Global Liquidity',
    layer: 'l1', ring: 0, angle: 0,
    description: '全球流动性是所有资产定价的"母变量"——其变化与全球风险资产价格的滚动相关性长期保持 0.85+。常用三种衡量框架：① <strong>Net Liquidity</strong>（Max Anderson 2022提出）= Fed Balance Sheet − TGA − RRP，反映美国银行体系内的实际可用流动性；② <strong>Lyn Alden 全球M2</strong> = 美/欧/日/中四大央行资产负债表 + 离岸美元信用；③ <strong>BIS 跨境美元信贷</strong>（约13万亿美元离岸美元贷款），美元强度通过这一渠道传导到每一个角落。<br><br>多重驱动：Fed 政策（边际定价者）、TGA/RRP 财政部账户、美元强度、中国信贷脉冲、各国央行 QE/QT、信用利差、Risk-On/Off。这些驱动相互作用，单一变量都不足以预测。',
    drivers: ['monetary_policy ↓ → 流动性 ↑', 'fiscal_deficit ↑ (TGA↓) → 流动性 ↑', 'china_credit ↑ → 流动性 ↑', 'usd_index ↑ → 流动性 ↓', 'risk_appetite ↓ → 流动性 ↓'],
    keyMetric: '全球M2 ≈ $100T · Fed BS ≈ $7T',
    sensitivity: { fed_rate: -0.8, china_credit: 0.6, fiscal_deficit: 0.4, cpi: -0.2 },
    evidence: [
      { source: 'BIS Triennial Survey', year: '2022', body: '全球外汇日均交易量7.5万亿美元，美元参与88%的交易' },
      { source: 'Borio & Disyatat (BIS)', year: '2015', body: '"Capital flows and the current account: Taking financing seriously"——证明跨境信贷扩张是金融周期核心驱动，独立于经常账户' },
      { source: 'Anderson Net Liquidity', year: '2022', body: 'Max Anderson于2022年提出 Net Liquidity = Fed BS − TGA − RRP，初期与S&P 500相关性约0.95；2023后随市场计入此指标而相关性不稳定' },
      { source: 'Boston Fed (Lopez-Salido & Vissing-Jorgensen)', year: '2018', body: 'TGA 变化 1 美元约对应银行准备金反向变化 1 美元，是被低估的流动性驱动' },
    ]
  },
  {
    id: 'usd_index', name: '美元指数', en: 'DXY',
    layer: 'l1', ring: 1, angle: 90,
    description: '美元相对六大主要货币的加权汇率，是全球流动性的反向指标。美元强→全球美元流动性收紧→新兴市场资产承压；美元弱→全球流动性扩张→风险资产受益。',
    drivers: ['fed_rate↑→DXY↑', 'risk_event↑→DXY↑（避险）', 'cpi↑→DXY短期↑长期↓'],
    keyMetric: 'DXY 100 = 1973基准',
    sensitivity: { fed_rate: 0.6, risk_event: 0.3, cpi: 0.1 },
    evidence: [
      { source: 'Obstfeld & Zhou (NBER)', year: '2023', body: '美元升值10%使新兴市场GDP在1年内下降1.9%，影响持续约2.5年；发达经济体仅受影响0.6%且1年内消散' },
      { source: 'IMF External Sector Report', year: '2023', body: '美元升值10%使全球经常账户余额一年内下降占世界GDP 0.4%' },
    ]
  },
  {
    id: 'gold', name: '黄金', en: 'Gold',
    layer: 'l1', ring: 1, angle: 270,
    description: '黄金不产生现金流，其定价核心是持有黄金的机会成本——即实际利率。实际利率越低，黄金越具吸引力。同时，黄金是终极去美元化资产和地缘风险对冲工具。',
    drivers: ['real_rates↓→黄金↑', 'usd_index↓→黄金↑', 'risk_event↑→黄金↑'],
    keyMetric: '与10Y TIPS相关性约 -0.7 到 -0.85（不同时段不同）',
    sensitivity: { fed_rate: -0.4, cpi: 0.4, risk_event: 0.5, usd_index: -0.5 },
    evidence: [
      { source: 'Erb & Harvey (FAJ)', year: '2013', body: '"The Golden Dilemma"——黄金长期实际回报接近零，但作为通胀对冲在极端通胀时期有效' },
      { source: 'World Gold Council', year: '2023', body: '2022年央行净购金1136吨创55年来最高纪录，2023年继续超千吨' },
    ]
  },
  {
    id: 'sovereign_fx', name: '非美货币篮子', en: 'Non-USD FX Basket',
    layer: 'l1', ring: 1, angle: 180,
    description: '加权篮子（DXY对应）：EUR(58%) + JPY(14%) + GBP(12%) + CAD/SEK/CHF。注意各货币驱动逻辑差异：①日元(JPY)是套息融资货币，risk-off时反常升值；②欧元(EUR)主要受欧美增长差和利差驱动；③人民币(CNY)未在DXY内但受PBoC政策管理。本节点关系仅适用于"加权基准"层面，单一货币需独立分析。',
    drivers: ['DXY反向（定义）', '欧美利差', '增长差异'],
    keyMetric: 'EUR/USD ≈ 1.05-1.10 区间',
    sensitivity: { fed_rate: -0.3, cpi: -0.2, risk_event: -0.4 },
    evidence: [
      { source: 'Fama (JME)', year: '1984', body: '"Forward and spot exchange rates"——前向溢价之谜：高息货币应贬值的UIP在数据中常被违反，至今未完全解释' },
      { source: 'BoJ / Reuters', year: '2024.8', body: '日元单月升值12%触发全球套息平仓，日经单日跌12.4%。注意此为JPY特殊属性（套息平仓），不适用于整篮子规律' },
    ]
  },

  // ========== Layer 2: 经济运行 ==========
  {
    id: 'gdp_growth', name: 'GDP增长', en: 'GDP Growth',
    layer: 'l2', ring: 2, angle: 30,
    description: 'GDP增长是宏观体系的最终输出。通过Y=C+I+G+(X-M)分解，需求侧四大引擎：消费、投资、政府支出、净出口。潜在GDP取决于劳动+资本+TFP（全要素生产率）。',
    drivers: ['unemployment↓→GDP↑', 'china_credit↑→GDP↑', 'us_tariff↑→GDP↓'],
    keyMetric: '美国潜在增速≈1.8-2.0%',
    sensitivity: { unemployment: -1.5, fed_rate: -0.4, china_credit: 0.3, us_tariff: -0.15, cpi: -0.1 },
    evidence: [
      { source: 'Okun\'s Law', year: '1962', body: '失业率每上升1个百分点，GDP相对潜在产出下降约2个百分点（美国基准系数）' },
      { source: 'IMF WEO', year: '2024', body: '2025年全球GDP预测中位数约3.2%，发达经济体约1.7%，新兴市场约4.2%' },
    ]
  },
  {
    id: 'inflation', name: '通胀压力', en: 'Inflation',
    layer: 'l2', ring: 2, angle: 60,
    description: '通胀的来源：①需求拉动（产出缺口正）；②成本推动（油价、工资）；③货币因素（流动性）；④预期自我实现。核心PCE是美联储首选指标，剔除能源和食品。',
    drivers: ['oil_price↑→通胀↑', 'unemployment↓→通胀↑', 'fiscal_deficit↑→通胀↑'],
    keyMetric: 'Fed目标 2%',
    sensitivity: { oil_price: 0.3, unemployment: -0.5, us_tariff: 0.4, fiscal_deficit: 0.2, china_credit: 0.15 },
    evidence: [
      { source: 'Phillips Curve (Phillips 1958)', year: '1958', body: '失业率与工资通胀的负相关，菲利普斯曲线在1970-2019年间显著平坦化（"消失之谜"），2021后再度变陡' },
      { source: 'Cavallo, Gopinath, Neiman, Tang (AER Insights)', year: '2021', body: '2018-2019关税到进口商支付价格几乎完全传导（20%关税→进口商价格+18.9%），但到零售价格传导不完整（一年后<5%）。Goldman Sachs (2025)估计美国消费者承担约55%、企业22%、外国出口商18%' },
    ]
  },
  {
    id: 'unemployment_rate', name: '失业率', en: 'Unemployment Rate',
    layer: 'l2', ring: 2, angle: 120,
    description: '美国失业率，标准 BLS U-3 口径——失业人数占劳动力的百分比。值越高=就业市场越差、工资压力越小。NAIRU（自然失业率）当前估计约4-4.5%，是中性参考点。配套指标：非农就业(NFP)、JOLTS职位空缺、初请失业金、ECI雇佣成本指数。Sahm Rule（失业率3个月均值高于12月低点0.5%）是衰退实时指标，1948以来零误报。',
    drivers: ['gdp_growth↑→失业率↓ (Okun)', 'fed_rate↑→失业率↑（滞后6-12月）'],
    keyMetric: 'NAIRU ≈ 4-4.5%',
    sensitivity: { fed_rate: 0.3, gdp_growth: -0.6, us_tariff: 0.1 },
    evidence: [
      { source: 'Sahm Rule', year: '2019', body: '失业率3个月均值高于12月低点0.5%即触发衰退信号——历史上1948年以来零误报' },
      { source: 'Beveridge Curve', year: '2022-23', body: '2022年职位空缺率达到7.4%创历史新高，疫情后曲线外移意味着同等失业率下劳动力市场更紧张' },
    ]
  },
  {
    id: 'trade_flows', name: '贸易资本流动', en: 'Trade & Capital Flows',
    layer: 'l2', ring: 2, angle: 150,
    description: '国际收支由经常账户（贸易+服务+收入）和资本账户构成，两者必须平衡。美国长期经常账户逆差约GDP 3-4%，由资本流入融资——这正是美元储备货币的"特权"。',
    drivers: ['usd_index→贸易', 'us_tariff↑→贸易↓', 'china_credit↑→出口↑'],
    keyMetric: '美国经常账户≈-3.5% GDP',
    sensitivity: { usd_index: -0.4, us_tariff: -0.6, china_credit: 0.3 },
    evidence: [
      { source: 'Bernanke "Global Saving Glut"', year: '2005', body: '亚洲高储蓄输出至美国压低全球长期利率，是2000年代利率持续低迷的结构性原因' },
      { source: 'Fajgelbaum et al. (QJE)', year: '2020', body: '2018-2019年Trump关税对美国福利净损失年化78亿美元，证明贸易战双输' },
    ]
  },

  // ========== Layer 3: 政策调控 ==========
  {
    id: 'monetary_policy', name: '货币政策立场', en: 'Monetary Stance',
    layer: 'l3', ring: 3, angle: 0,
    description: '央行通过利率、QE/QT、前瞻指引三大工具调控经济。Taylor Rule(1993)给出反应函数：i = r* + π + 0.5(π-π*) + 0.5(y_gap)。当前实际政策与规则的偏离度，决定政策立场是否合适。',
    drivers: ['cpi偏离2%目标', 'unemployment偏离NAIRU', '金融稳定考量'],
    keyMetric: 'Taylor Rule隐含利率',
    sensitivity: { cpi: 0.7, unemployment: -0.4, gdp_growth: 0.3 },
    evidence: [
      { source: 'Taylor (Carnegie-Rochester)', year: '1993', body: 'Taylor Rule原始论文：1987-1992年实际美联储政策与规则吻合，2003-2005年偏低被认为是房地产泡沫成因之一' },
      { source: 'Fed FOMC', year: '2022-2023', body: '美联储1年内加息525bp（5月)+75bp×4连续加息，是1980年Volcker之后最快紧缩节奏' },
    ]
  },
  {
    id: 'fiscal_policy', name: '财政政策', en: 'Fiscal Policy',
    layer: 'l3', ring: 3, angle: 60,
    description: '政府支出、税收、转移支付影响总需求。财政乘数在衰退期约1.5-2，繁荣期约0.5-1（Auerbach & Gorodnichenko）。当前美债/GDP突破120%，利息支出年约1万亿，债务可持续性条件r<g承压。',
    drivers: ['fiscal_deficit设定', '自动稳定器'],
    keyMetric: '美债/GDP ≈ 122%',
    sensitivity: { fiscal_deficit: 1.0 },
    evidence: [
      { source: 'Blanchard & Leigh (IMF)', year: '2013', body: '欧洲2010-2011年财政紧缩的GDP损失是预测的3倍——证明衰退期财政乘数被严重低估' },
      { source: 'Truss-Kwarteng UK', year: '2022.9', body: '英国"迷你预算"宣布450亿英镑减税不配套财源，3周内30Y英债收益率上行150bp，迫使BoE紧急购债，首相被迫辞职' },
    ]
  },
  {
    id: 'china_policy', name: '中国宏观调控', en: 'China Macro Policy',
    layer: 'l3', ring: 3, angle: 120,
    description: '中国通过PBoC利率(MLF/LPR)、社融、地方政府专项债、房地产限购等多工具调控经济。社融存量增速变化（信贷脉冲）领先全球工业生产约6-9个月，是全球大宗商品需求的关键预测指标。',
    drivers: ['china_credit设定', '房地产政策', '汇率管理'],
    keyMetric: 'CNY中间价管理',
    sensitivity: { china_credit: 1.0 },
    evidence: [
      { source: 'BIS Working Paper 1011', year: '2022', body: '中国信贷脉冲与全球工业生产同比增速的相关性（领先6-9个月）约0.7' },
      { source: 'PBoC', year: '2024', body: '2024年9月一揽子刺激（降准50bp+降存量按揭利率+5000亿股市互换工具）单日推动恒指涨6.2%' },
    ]
  },

  // ========== Layer 4: 金融市场 ==========
  {
    id: 'us_treasury', name: '美债收益率', en: 'UST Yields',
    layer: 'l4', ring: 4, angle: 30,
    description: '10年期美债收益率是全球无风险利率锚。可分解为：实际利率(TIPS) + 通胀预期(BEI) + 期限溢价(Term Premium)。曲线形态（10Y-2Y）是最重要的衰退领先指标之一。',
    drivers: ['fed_rate↑→短端↑', 'cpi↑→长端↑', 'fiscal_deficit↑→长端↑'],
    keyMetric: '10Y UST 4.5%（2024）',
    sensitivity: { fed_rate: 0.6, cpi: 0.4, fiscal_deficit: 0.2, risk_event: -0.3 },
    evidence: [
      { source: 'NY Fed Liberty Street', year: '2018', body: '收益率曲线（10Y-3M）作为衰退领先指标自1960年以来表现良好，1966年曾出现假信号（短暂倒挂未引发衰退）；近 8 次衰退每次前都有倒挂，但倒挂到衰退的时滞 6-24 个月不等' },
      { source: 'Bloomberg US Treasury Index / McQuarrie', year: '2022', body: 'Bloomberg US Treasury Index 全年 -12.5%，1973年指数成立以来最差。长期30Y零息债券跌-39.2%，按历史数据回溯是1754年以来最差' },
    ]
  },
  {
    id: 'us_equity', name: '美股', en: 'US Equities',
    layer: 'l4', ring: 4, angle: 0,
    description: '股价 = 盈利(EPS) × 估值(PE)。无风险利率上升会同时压低估值（DCF分母）和影响盈利。Bernanke-Kuttner研究确立了利率对股市的传导基准：未预期降息25bp约对应股指1%上涨。',
    drivers: ['fed_rate↓→股市↑', 'gdp_growth↑→EPS↑', 'global_liquidity↑→PE↑'],
    keyMetric: '标普500 PE ≈ 22-25x',
    sensitivity: { fed_rate: -1.0, cpi: -0.4, gdp_growth: 1.0, risk_event: -0.5, us_tariff: -0.2 },
    evidence: [
      { source: 'Bernanke & Kuttner (JF)', year: '2005', body: '"What Explains the Stock Market\'s Reaction to Federal Reserve Policy?" 未预期降息25bp使标普500上涨约1%——经典基准研究' },
      { source: 'Shiller CAPE Data', year: '1881-2024', body: 'CAPE > 30x对应后续10年实际年化回报中位数约2%；CAPE < 10x对应约14%' },
    ]
  },
  {
    id: 'commodities', name: '大宗商品', en: 'Commodities',
    layer: 'l4', ring: 4, angle: 60,
    description: '能源(60%)、工业金属(20%)、农产品(20%)。铜被称为"铜博士"——因其工业用途广泛而成为全球经济领先指标。大宗商品定价：美元↓→大宗↑（计价效应），中国需求是主要工业金属定价的核心。',
    drivers: ['usd_index↓→大宗↑', 'china_credit↑→金属↑', 'oil_price自身'],
    keyMetric: '铜消费中国占55%',
    sensitivity: { usd_index: -0.5, china_credit: 0.6, oil_price: 0.4 },
    evidence: [
      { source: 'BIS QR (Rees)', year: '2023', body: '美元升值10%使非美油价（折算后）上涨约18%——美元-大宗负相关在2020年后弱化' },
      { source: 'Gorton & Rouwenhorst (FAJ)', year: '2006', body: '大宗商品期货长期回报与股票相当但相关性低，是组合分散化的重要资产类' },
    ]
  },
  {
    id: 'em_assets', name: '新兴市场资产', en: 'EM Assets',
    layer: 'l4', ring: 4, angle: 90,
    description: '新兴市场股债汇受美元周期、商品周期、风险偏好三重驱动。Eichengreen "原罪论"：EM国家无法以本币借入长期外债，美元升值时外债负担急剧加重。MSCI EM中国权重约25%、印度17%、台韩合计约35%。',
    drivers: ['usd_index↓→EM↑', 'china_credit↑→EM↑', 'risk_event↑→EM↓'],
    keyMetric: 'MSCI EM 24国',
    sensitivity: { usd_index: -1.5, fed_rate: -0.8, china_credit: 0.5, risk_event: -1.0 },
    evidence: [
      { source: 'Obstfeld & Zhou (NBER)', year: '2023', body: '美元升值10%使新兴市场股票（本币）下跌约5-6%，跨境组合流入下降约GDP的1.5%' },
      { source: 'IMF Taper Tantrum data', year: '2013', body: '2013.5伯南克暗示缩减QE后4个月内，"脆弱五国"(BR/IN/ID/TR/ZA)货币贬值15-20%，证明EM对美联储政策的极度敏感' },
    ]
  },
  {
    id: 'credit_spread', name: '信用利差', en: 'HY Credit Spread',
    layer: 'l4', ring: 4, angle: 120,
    description: '高收益债相对国债的额外收益，是市场风险情绪的温度计。HY利差>600bp时后续12个月衰退概率约75%。信用利差领先股市转折约3-6个月，是重要的领先指标。',
    drivers: ['gdp_growth↓→利差↑', 'global_liquidity↓→利差↑', 'risk_event↑→利差↑'],
    keyMetric: '当前HY OAS≈350bp',
    sensitivity: { fed_rate: 0.3, gdp_growth: -0.8, risk_event: 0.5, unemployment: 0.4 },
    evidence: [
      { source: 'Gilchrist & Zakrajšek (AER)', year: '2012', body: '"Credit Spreads and Business Cycle Fluctuations"——超额债券溢价(EBP)是最强的金融压力指标，领先工业生产6个月' },
      { source: 'ICE BofA HY Index', year: '2008-2020', body: '2008.10 HY利差峰值1971bp；2020.3 COVID峰值1087bp；正常区间300-500bp' },
    ]
  },
  {
    id: 'real_rates', name: '实际利率', en: 'Real Rates / TIPS',
    layer: 'l4', ring: 4, angle: 150,
    description: '实际利率 = 名义利率 − 通胀预期（Fisher方程）= TIPS收益率。两条独立传导路径：① 名义利率渠道——美联储加息、美债收益率上行直接推升 r；② 通胀预期渠道——通胀预期上升（10Y BEI breakeven inflation）会压低实际利率（即使名义不变）。这是黄金、长久期资产、增长股估值的关键变量——它代表持有"无现金流资产"的真实机会成本。实际利率为负时（如2020-2022年），黄金、加密货币、长久期科技股表现卓越。',
    drivers: ['nominal_rates ↑ → real_rates ↑', 'inflation_expectation ↑ → real_rates ↓'],
    keyMetric: '10Y TIPS≈2%（2024）',
    sensitivity: { fed_rate: 0.7, cpi: -0.3 },
    evidence: [
      { source: 'Fed Reserve TIPS Data', year: '1997-2024', body: 'TIPS于1997年首次发行。2020年实际利率达-1.2%历史低点，对应金价突破2000美元' },
      { source: 'Fama / Fisher Equation', year: '1975', body: 'Fisher方程 i = r + π^e，实际利率 r = i − π^e 才是真正的资金成本' },
      { source: 'NY Fed BEI Data', year: '2020-2024', body: '10Y breakeven inflation从1.0%(2020.3)升至2.6%(2022.4)再回落至2.3%，是通胀预期的市场指标' },
    ]
  },

  // ========== Layer 5: 资产定价框架 ==========
  {
    id: 'risk_appetite', name: '风险偏好', en: 'Risk-On / Risk-Off',
    layer: 'l5', ring: 5, angle: 30,
    description: 'Risk-On/Off是资金全球流动的核心框架。VIX是衡量Risk-Off的最广泛指标：<15正常、>30恐慌、>40极度恐慌。Risk-On时资金从避险资产(美债/黄金/JPY/USD)流向风险资产(股票/EM/HY)。',
    drivers: ['credit_spread↑→Risk-Off', 'risk_event↑→Risk-Off', 'global_liquidity↓→Risk-Off'],
    keyMetric: 'VIX 12-20正常',
    sensitivity: { risk_event: 0.7, fed_rate: 0.3, credit_spread: 0.6, gdp_growth: -0.5 },
    evidence: [
      { source: 'CBOE VIX Historical', year: '1990-2024', body: '历史VIX峰值：2008.10(89)、2020.3(85)、2018.2(50)；30以上发生概率约5%（年化）' },
      { source: 'BlackRock Investment Institute', year: '2023', body: '股债相关性在通胀>2.5%时由负转正——2022年股债同跌打破60/40组合40年的有效性' },
    ]
  },
  {
    id: 'asset_allocation', name: '大类配置框架', en: 'Asset Allocation',
    layer: 'l5', ring: 5, angle: 60,
    description: '美林时钟(2004)将经济周期四阶段与最优资产匹配：复苏→股票，过热→大宗，滞胀→现金，衰退→债券。但2008年后QE扭曲了时钟。当前主流是"流动性时钟"+"传统时钟"双层叠加。',
    drivers: ['gdp_growth方向', 'cpi方向', 'global_liquidity方向'],
    keyMetric: '60/40组合长期年化7-8%',
    sensitivity: { gdp_growth: 0.5, cpi: -0.3, global_liquidity: 0.4 },
    evidence: [
      { source: 'ML Investment Clock', year: '2004', body: '美林时钟原始回测(1973-2004)：过热期商品+19.7%、衰退期债券+12.3%、复苏期股票+19.0%（年化）' },
      { source: 'Ray Dalio All Weather', year: '2008-', body: '基于经济四象限(增长/衰退×通胀/通缩)构建的全天候组合，在2022年股债同跌中表现欠佳，反思框架更新' },
    ]
  },
  {
    id: 'cycle_position', name: '周期定位', en: 'Cycle Position',
    layer: 'l5', ring: 5, angle: 90,
    description: '判断经济处于周期哪一阶段，是所有宏观决策的起点。复苏→过热→滞胀→衰退四阶段循环。通过PMI、收益率曲线、信贷利差、劳动力市场紧张度等领先指标综合判断。',
    drivers: ['增长方向', '通胀方向'],
    keyMetric: 'PMI 50荣枯线',
    sensitivity: { gdp_growth: 0.6, cpi: 0.3 },
    evidence: [
      { source: 'NBER Business Cycle Dating Committee', year: '1854-2024', body: 'NBER是美国官方衰退认定机构，使用GDP/收入/就业/工业生产等多指标，平均衰退持续11个月，扩张约59个月' },
      { source: 'Estrella & Mishkin (NY Fed)', year: '1996', body: '原始论文用1960Q1-1995Q1数据估计：10Y-3M期限利差给出衰退概率模型（如利差倒挂30bp对应未来4季度衰退概率约30%）。Fed官方衰退概率模型至今沿用此框架' },
    ]
  },
  {
    id: 'cross_asset', name: '跨资产钩稽', en: 'Cross-Asset Linkages',
    layer: 'l5', ring: 5, angle: 120,
    description: '跨资产关系：股债相关性（通胀体制依赖）、铜金比与利率、美元-大宗、HY利差与股市、TIPS与黄金。这些钩稽关系在正常市场中有效，在流动性危机中会断裂（2020.3）。',
    drivers: ['通胀体制', '流动性状态'],
    keyMetric: '铜金比与10Y r ≈ 0.75',
    sensitivity: { cpi: 0.4, global_liquidity: 0.3 },
    evidence: [
      { source: 'Campbell, Pflueger, Viceira (JF)', year: '2017', body: '"Macroeconomic Drivers of Bond and Equity Risks"——通胀>2.5%阈值时股债相关性由负转正，2022年完美验证' },
      { source: 'DoubleLine / Gundlach', year: '2018', body: '铜金比与10年期美债收益率的滚动相关性约0.75，被广泛用作利率走势的领先指标' },
    ]
  },
  {
    id: 'institutional_flows', name: '机构流动', en: 'Institutional Flows',
    layer: 'l5', ring: 5, angle: 150,
    description: '主权财富基金10万亿、被动指数基金超过主动、CTA趋势策略1-2万亿、期权做市商Gamma对冲——这些机构行为是市场流动性结构的主体。同质化持仓在尾部风险时是放大器。',
    drivers: ['institutional positioning', 'gamma exposure'],
    keyMetric: 'SWF≈10T USD',
    sensitivity: { risk_event: -0.4, global_liquidity: 0.3 },
    evidence: [
      { source: 'Bank of England', year: '2022.10', body: '英国LDI养老金危机：长债收益率急升200bp触发3000亿英镑LDI抛售，BoE被迫紧急购债650亿英镑' },
      { source: 'BIS / SWF Institute', year: '2024', body: '全球主权财富基金管理资产规模约10.5万亿美元，挪威GPFG (1.7T)、CIC (1.4T)、ADIA (1T)是最大' },
    ]
  },
];

// 边 (EDGES) - 节点间因果关系
// strength: 系数绝对值；sign: + 正向, - 负向
// source: 实证依据简短引用
const EDGES = [
  // 中心向第一圈
  { from: 'global_liquidity', to: 'usd_index', strength: 0.7, sign: -1, type: 'causal', mechanism: '流动性扩张→美元相对走弱', source: 'BIS研究' },
  { from: 'global_liquidity', to: 'gold', strength: 0.6, sign: 1, type: 'regime', mechanism: '流动性宽松→实际利率↓→金价↑', source: '历史相关性' },
  { from: 'global_liquidity', to: 'sovereign_fx', strength: 0.3, sign: 1, type: 'causal', mechanism: '间接：流动性宽松→风险偏好↑→非美货币边际受益（解释力弱，仅作篮子层面）' },

  // 第一圈内部
  { from: 'usd_index', to: 'gold', strength: 0.5, sign: -1, type: 'causal', mechanism: '美元↑→金价↓（计价效应）', source: '相关性约-0.4' },
  { from: 'usd_index', to: 'sovereign_fx', strength: 0.7, sign: -1, type: 'causal', mechanism: '镜像关系，美元↑则其他货币↓' },

  // 第一圈→第二圈
  { from: 'usd_index', to: 'trade_flows', strength: 0.6, sign: -1, type: 'causal', mechanism: '美元↑使美国出口承压，进口便宜', source: 'Obstfeld 2023' },
  { from: 'usd_index', to: 'inflation', strength: 0.3, sign: -1, type: 'regime', mechanism: '强美元降低进口通胀（需考虑滞后）' },
  { from: 'sovereign_fx', to: 'trade_flows', strength: 0.5, sign: 1, type: 'causal', mechanism: '本币贬值利好出口' },

  // 第二圈内部 - 核心三角
  { from: 'unemployment_rate', to: 'inflation', strength: 0.5, sign: -1, type: 'regime', mechanism: '失业率↓（劳动力市场紧张）→工资↑→通胀↑（菲利普斯曲线，2010-2019平坦化但2021后再陡峭）', source: 'Phillips 1958' },
  { from: 'inflation', to: 'gdp_growth', strength: 0.3, sign: -1, type: 'regime', mechanism: '高通胀侵蚀实际购买力', source: 'IMF研究' },
  { from: 'gdp_growth', to: 'unemployment_rate', strength: 0.6, sign: -1, type: 'causal', mechanism: '增长↑→失业率↓（Okun定律：GDP增速每超潜在产出1pp，失业率下降约0.5pp）', source: 'Okun 1962' },
  { from: 'trade_flows', to: 'gdp_growth', strength: 0.3, sign: 1, type: 'causal', mechanism: '净出口是GDP组成部分' },

  // 第二圈→第三圈
  { from: 'inflation', to: 'monetary_policy', strength: 0.8, sign: 1, type: 'causal', mechanism: '通胀↑→央行收紧（Taylor Rule）', source: 'Taylor 1993' },
  { from: 'unemployment_rate', to: 'monetary_policy', strength: 0.5, sign: -1, type: 'causal', mechanism: '失业率↑→央行宽松（Fed双重使命：就业+物价稳定）' },
  // 失业-增长反馈：失业率上升直接拖累消费和增长（Okun 反向通道）
  { from: 'unemployment_rate', to: 'gdp_growth', strength: 0.7, sign: -1, type: 'causal', mechanism: '失业率↑→消费↓+收入↓→GDP↓（Okun定律反向通道）', source: 'Okun 1962' },
  // 信用利差是衰退最强领先指标
  { from: 'credit_spread', to: 'gdp_growth', strength: 0.6, sign: -1, type: 'causal', mechanism: '信用利差扩大→企业借贷成本↑→投资↓→GDP↓', source: 'Gilchrist-Zakrajšek 2012: EBP 领先 IP 6 个月' },
  // 风险偏好崩塌→消费投资双降
  { from: 'risk_appetite', to: 'gdp_growth', strength: 0.4, sign: 1, type: 'causal', mechanism: 'Risk-Off → 财富效应负反馈 + 投资延迟 → GDP↓' },
  // 财政政策是 GDP 的主要顺周期支持
  { from: 'fiscal_policy', to: 'gdp_growth', strength: 0.55, sign: 1, type: 'causal', mechanism: '财政扩张→总需求↑（Blanchard-Leigh: 衰退期乘数 1.5-2）', source: 'Blanchard-Leigh 2013' },
  // 全球流动性紧张直接拖累全球增长
  { from: 'global_liquidity', to: 'gdp_growth', strength: 0.4, sign: 1, type: 'causal', mechanism: '全球美元流动性是世界 GDP 增长的金融条件锚' },
  { from: 'gdp_growth', to: 'monetary_policy', strength: 0.4, sign: 1, type: 'causal', mechanism: '产出缺口正→央行考虑收紧' },
  { from: 'gdp_growth', to: 'fiscal_policy', strength: 0.5, sign: -1, type: 'causal', mechanism: '衰退期自动稳定器扩大赤字' },

  // 第三圈→第四圈
  { from: 'monetary_policy', to: 'us_treasury', strength: 0.8, sign: 1, type: 'causal', mechanism: '加息直接抬升短端，曲线整体上移', source: '直接政策传导' },
  { from: 'monetary_policy', to: 'real_rates', strength: 0.7, sign: 1, type: 'causal', mechanism: '加息使实际利率上升' },
  { from: 'monetary_policy', to: 'us_equity', strength: 0.35, sign: -1, type: 'regime', mechanism: '加息→DCF折现率↑→估值压缩；但经济衰退时被动宽松未必利好（取决于市场对央行 reaction function 的解读）', source: 'Bernanke-Kuttner 2005' },
  { from: 'fiscal_policy', to: 'us_treasury', strength: 0.4, sign: 1, type: 'causal', mechanism: '赤字↑→国债供给↑→长端收益率↑' },
  { from: 'fiscal_policy', to: 'inflation', strength: 0.4, sign: 1, type: 'causal', mechanism: '财政扩张推高总需求和通胀' },
  { from: 'china_policy', to: 'commodities', strength: 0.7, sign: 1, type: 'causal', mechanism: '信贷扩张→基建/地产→工业金属需求↑（铜、铁矿石）', source: 'BIS WP 1011' },
  { from: 'china_policy', to: 'em_assets', strength: 0.6, sign: 1, type: 'causal', mechanism: '中国刺激外溢提振资源型EM（巴西、澳洲、印尼）', source: '历史相关性' },
  { from: 'china_policy', to: 'global_liquidity', strength: 0.5, sign: 1, type: 'causal', mechanism: '中国信贷扩张是全球流动性的重要组成部分（中国占全球GDP 17%）' },
  // === 全球流动性的复杂驱动（修正：原模型严重低估了驱动复杂性）===
  // Fed 是全球美元流动性的主要边际定价者
  { from: 'monetary_policy', to: 'global_liquidity', strength: 0.85, sign: -1, type: 'causal', mechanism: 'Fed紧缩→美元回流→全球流动性收缩 (Net Liquidity = Fed BS − TGA − RRP, Anderson 2022 框架)', source: 'Anderson 2022 / FRED' },
  // 财政部 TGA 账户消耗会从银行体系抽走流动性（反之亦然）
  { from: 'fiscal_policy', to: 'global_liquidity', strength: 0.45, sign: 1, type: 'causal', mechanism: '财政赤字↑→TGA下降→银行准备金释放→流动性扩张 (Boston Fed 2018: $1B TGA变化≈$1B 准备金反向变化)', source: 'Boston Fed 2018' },
  // USD 强度：美元↑会通过欧洲美元市场、跨境信贷收缩全球流动性
  { from: 'usd_index', to: 'global_liquidity', strength: 0.55, sign: -1, type: 'causal', mechanism: '美元↑→约13万亿美元离岸美元贷款偿还成本↑→信用收缩→流动性下降', source: 'BIS Borio & Disyatat 2015' },
  // 信用利差扩大反映流动性紧张（双向反馈）
  { from: 'credit_spread', to: 'global_liquidity', strength: 0.35, sign: -1, type: 'causal', mechanism: 'HY信用利差扩大→风险定价上升→银行收紧授信→流动性收缩' },
  // 风险偏好崩塌→全球去风险→美元回流避险→流动性收缩
  { from: 'risk_appetite', to: 'global_liquidity', strength: 0.3, sign: 1, type: 'regime', mechanism: 'Risk-Off时美元回流避险，全球美元流动性边际收紧（极端情形如2008/2020）' },
  { from: 'china_policy', to: 'sovereign_fx', strength: 0.4, sign: 1, type: 'causal', mechanism: '宽松周期人民币承压，但稳汇率管理是常态工具' },
  { from: 'china_policy', to: 'trade_flows', strength: 0.4, sign: 1, type: 'causal', mechanism: '产能扩张→出口增加→贸易顺差扩大' },

  // 第四圈内部
  { from: 'us_treasury', to: 'real_rates', strength: 0.7, sign: 1, type: 'causal', mechanism: '名义利率上升传导至实际利率' },
  { from: 'us_treasury', to: 'us_equity', strength: 0.5, sign: -1, type: 'causal', mechanism: '收益率↑→估值倍数压缩' },
  { from: 'real_rates', to: 'gold', strength: 0.85, sign: -1, type: 'causal', mechanism: '实际利率是黄金最强单因子驱动；持有黄金的机会成本=放弃的实际利率', source: '历史 TIPS-金价相关性约 -0.7 到 -0.85（FRED 数据）' },
  { from: 'real_rates', to: 'us_equity', strength: 0.6, sign: -1, type: 'causal', mechanism: '实际利率是DCF分母的真实部分' },
  { from: 'real_rates', to: 'em_assets', strength: 0.5, sign: -1, type: 'causal', mechanism: '高实际利率使EM资产相对吸引力下降' },
  // 共同驱动模式：增长↑同时利好股票和大宗，两者的相关性是共振而非因果
  { from: 'gdp_growth', to: 'us_equity', strength: 0.7, sign: 1, type: 'causal', mechanism: '增长↑→盈利预期↑→EPS↑→股价↑（DCF 分子）；衰退期 EPS 收缩是股市下跌的核心驱动', source: '历史: 标普 EPS 与 GDP 相关性 ≈ 0.7' },
  { from: 'gdp_growth', to: 'commodities', strength: 0.4, sign: 1, type: 'causal', mechanism: '增长↑→工业需求↑→大宗商品↑（尤其能源、铜）', source: 'PMI与铜价相关性约0.6' },
  // 注：us_equity ↔ commodities 之间存在共振相关性（约0.3-0.5），但属"共同驱动"而非因果
  // 为保持因果纯度，不在两者之间画直接边
  { from: 'credit_spread', to: 'us_equity', strength: 0.75, sign: -1, type: 'causal', mechanism: '信用利差是衰退最强领先指标，2008/2020 危机中股市与利差近完全反向', source: 'Gilchrist-Zakrajšek 2012' },
  { from: 'usd_index', to: 'commodities', strength: 0.5, sign: -1, type: 'causal', mechanism: '美元↑→商品（美元计价）↓', source: 'BIS QR 2023' },
  { from: 'usd_index', to: 'em_assets', strength: 0.7, sign: -1, type: 'causal', mechanism: '美元↑→EM资本外流→EM资产↓', source: 'Obstfeld-Zhou 2023' },

  // 第四圈→第五圈
  { from: 'credit_spread', to: 'risk_appetite', strength: 0.7, sign: -1, type: 'causal', mechanism: '信用利差扩大是Risk-Off的核心信号' },
  { from: 'us_equity', to: 'risk_appetite', strength: 0.4, sign: 1, type: 'regime', mechanism: '股市表现是风险偏好的市场反映' },
  { from: 'gdp_growth', to: 'cycle_position', strength: 0.7, sign: 1, type: 'causal', mechanism: '增长方向决定周期位置' },
  { from: 'inflation', to: 'cycle_position', strength: 0.5, sign: 1, type: 'causal', mechanism: '通胀方向决定阶段（过热/滞胀）' },
  { from: 'cycle_position', to: 'asset_allocation', strength: 0.7, sign: 1, type: 'causal', mechanism: '美林时钟核心：周期决定配置' },
  { from: 'risk_appetite', to: 'asset_allocation', strength: 0.6, sign: 1, type: 'causal', mechanism: 'Risk 偏好直接决定股债权重' },
  // risk_appetite 是连接政策冲击和资产价格的核心枢纽：
  { from: 'risk_appetite', to: 'us_equity', strength: 0.85, sign: 1, type: 'causal', mechanism: 'Risk-On → 风险溢价↓ → 股市估值↑；Risk-Off 是危机期间股市的主导因素（VIX 与标普负相关 ≈ -0.7）', source: 'CBOE VIX 历史数据' },
  { from: 'risk_appetite', to: 'em_assets', strength: 0.85, sign: 1, type: 'causal', mechanism: 'Risk-On → 资金流入 EM → EM 资产估值↑；Risk-Off 时 EM 资本外流是 EM 资产承压最直接的渠道（EM 对全球风险偏好高度敏感，2008/2013 taper tantrum/2020 都验证）' },
  { from: 'risk_appetite', to: 'credit_spread', strength: 0.85, sign: -1, type: 'causal', mechanism: 'Risk-Off → 信用利差扩大（Risk-On/Off 与利差是同一硬币两面）' },
  { from: 'risk_appetite', to: 'commodities', strength: 0.5, sign: 1, type: 'causal', mechanism: 'Risk-On → 工业商品需求和投机性持仓上升（铜尤其敏感）' },
  { from: 'global_liquidity', to: 'institutional_flows', strength: 0.4, sign: 1, type: 'correlation', mechanism: '流动性影响机构杠杆和仓位' },
  { from: 'institutional_flows', to: 'cross_asset', strength: 0.5, sign: 1, type: 'correlation', mechanism: '机构同质化持仓影响相关性' },

  // === Correlation 边：共振关系，不是严格因果，画为点线 ===
  // 这些边对应"市场常识"中常被误以为是因果的关系，标注为"共振"提醒用户
  { from: 'us_equity', to: 'commodities', strength: 0.35, sign: 1, type: 'correlation', mechanism: '【共振·非因果】Risk-On时同涨、Risk-Off时同跌；2008/2020 流动性危机中两者同跌。共同驱动是 growth + risk_appetite，不是直接因果' },
  { from: 'gold', to: 'us_treasury', strength: 0.3, sign: -1, type: 'correlation', mechanism: '【共振·非因果】危机避险时金价↑、UST收益率↓（价格↑），表面"反向相关"实为共同响应 Risk-Off + Fed 降息预期' },
  { from: 'em_assets', to: 'commodities', strength: 0.4, sign: 1, type: 'correlation', mechanism: '【共振·非因果】资源型EM (BR/AU/IDN) 出口商品，与商品周期同步；但中国/印度等制造业EM 反而在商品熊市中受益。资源型EM占MSCI EM约30%' },

  // 反馈环
  { from: 'risk_event', to: 'gold', strength: 0.4, sign: 1, type: 'causal', mechanism: '地缘风险→避险买金' },
  { from: 'us_equity', to: 'gdp_growth', strength: 0.2, sign: 1, type: 'correlation', mechanism: '【共振·弱反馈】财富效应：股市上涨→消费信心↑→GDP，但因果方向通常是 GDP→股市 居主导' },
];

// 杠杆→节点的直接影响（first-order）
// 这些是杠杆调整时直接传导的初始冲击，二阶传导通过EDGES网络计算
// 系数基于经验性研究（标注来源）
const LEVER_DIRECT = {
  fed_rate: {  // 单位：每升1个百分点
    'monetary_policy': { coef: 1.0, note: '直接定义：Fed 利率立场即货币政策本身' },
    'us_treasury': { coef: 0.7, note: 'Fed→2Y 短端传导约 70%（长端反映预期）' },
    'real_rates': { coef: 0.5, note: 'Fed 政策直接推升实际利率（剔除通胀预期）' },
    'unemployment_rate': { coef: 0.15, note: '滞后 6-18 月，单位为失业率 pp' },
    // us_equity / gold / em_assets / usd_index / global_liquidity 都通过
    // monetary_policy / us_treasury / real_rates 等节点间接传导
    // 这样避免"杠杆超广播"导致的双重计算和不切实际的累加
  },
  cpi: {
    'inflation': { coef: 1.0, note: '直接定义：CPI 即通胀本身' },
    'monetary_policy': { coef: 0.5, note: 'Taylor Rule 反应系数（通胀偏离目标 1pp → 政策反应约 50bp）' },
    'real_rates': { coef: -0.4, note: '通胀预期渠道：CPI 上行推高 BEI breakeven → 压低实际利率（Fisher 方程）' },
    // gold / us_treasury / us_equity 通过 inflation → real_rates / monetary_policy 间接传导
  },
  unemployment: {
    'unemployment_rate': { coef: 1.0, note: '直接定义' },
    'monetary_policy': { coef: -0.4, note: '双重使命' },
    'gdp_growth': { coef: -1.5, note: 'Okun定律基准系数2，半弹性约1.5' },
    'inflation': { coef: -0.4, note: 'Phillips Curve, 平坦化后系数减小' },
    'credit_spread': { coef: 0.4, note: '失业↑→违约预期↑' },
  },
  us_tariff: {
    'inflation': { coef: 0.15, note: 'Cavallo et al. 2021: 关税到进口商价格近 100% 传导，到零售传导不完整 (<5%/年)；Goldman 估计消费者承担 55%' },
    'trade_flows': { coef: -0.5, note: 'Fajgelbaum 2020: 25% 关税→相关贸易 -25%' },
    'policy_uncertainty': { coef: 5, note: 'Baker-Bloom-Davis: 关税战是 EPU 贸易分项的主驱动' },
    // gdp / equity / em / commodities 通过 inflation / policy_uncertainty / trade_flows 间接传导
  },
  oil_price: {  // 单位：每涨 10 美元
    'inflation': { coef: 0.4, note: 'EIA: 油价 +$10 → CPI +0.4pp（含 second-round）' },
    'commodities': { coef: 1.5, note: '能源占商品指数 60%（直接定义性影响）' },
    // gdp / em / usd 通过 inflation / commodities 间接传导
  },
  china_credit: {  // 单位：每变化 1pp
    'china_policy': { coef: 1.0, note: '直接定义：信贷脉冲是中国宏观调控的核心抓手' },
    'commodities': { coef: 0.3, note: 'BIS WP 1011: 中国信贷脉冲领先金属价格 6-9 月（保留短路加速）' },
    // 全球流动性/EM/GDP 都通过 china_policy 节点接力传导
  },
  fiscal_deficit: {  // 单位：每变化 1pp
    'fiscal_policy': { coef: 1.0, note: '直接定义' },
    'us_treasury': { coef: 0.15, note: '供给压力推升收益率（debt-supply 渠道）' },
    'global_liquidity': { coef: 0.3, note: 'TGA 下降释放银行准备金（Boston Fed 2018）' },
    // gdp / inflation 通过 fiscal_policy 间接传导
  },
  risk_event: {  // 单位：每 +50 个 GPR 点
    'risk_appetite': { coef: -0.6, note: 'Caldara-Iacoviello GPR：地缘风险↑→Risk-Off（风险偏好↓）' },
    'gold': { coef: 0.3, note: '避险溢价（GPR→金价直接渠道）' },
    'oil_price': { coef: 0.2, note: '若涉及主要产油区（中东等）' },
    // usd / em / equity / credit 都通过 risk_appetite 接力传导
  },
  policy_uncertainty: {  // 单位：每 +50 个 EPU 点
    'risk_appetite': { coef: -0.4, note: 'Bloom 2009: 不确定性↑→Risk-Off（风险偏好↓）' },
    'gdp_growth': { coef: -0.1, note: 'Baker-Bloom-Davis 2016: EPU↑1σ → IP -1.6%' },
    // equity / credit / em 都通过 risk_appetite + gdp 接力传导
  },
};

// 预设情景
const SCENARIOS = {
  baseline: {
    name: '基准',
    note: null,
    levers: { fed_rate: 4.5, cpi: 2.5, unemployment: 4.0, us_tariff: 3, oil_price: 75, china_credit: 0, fiscal_deficit: 6, risk_event: 100, policy_uncertainty: 100 }
  },
  stagflation_1974: {
    name: '滞胀 · 1974',
    note: {
      title: '📜 历史情景：1973-1975 第一次石油危机滞胀',
      body: 'OPEC禁运推高油价4倍（$3→$12），美国CPI达12.3%（1974.12），失业率升至9%（1975.5），GDP连续负增长。Burns主席的Fed反应迟缓，1974一度加息至13%但旋即降息。这是凯恩斯主义"菲利普斯曲线交易"破产的标志——证明了通胀和失业可以同时上升。资产表现：股市1973-74熊市跌48%，黄金从$35升至$200（+470%），美元疲软。'
    },
    levers: { fed_rate: 7.5, cpi: 11, unemployment: 8.5, us_tariff: 4, oil_price: 145, china_credit: 0, fiscal_deficit: 4, risk_event: 200, policy_uncertainty: 220 }
  },
  volcker_1981: {
    name: 'Volcker紧缩 · 1981',
    note: {
      title: '📜 历史情景：1979-1982 Volcker货币紧缩',
      body: 'Volcker将联邦基金利率推至19-20%（1981.6峰值），用衰退（失业率升至10.8%，1982.11）换通胀回归（CPI从14.8%降至3.2%）。强美元（DXY +50%）压垮拉美债务国，1982墨西哥违约引爆拉美债务危机。这是央行"可信度承诺"奠基战。资产表现：长债先大跌后V反，1982下半年股市启动20年牛市。'
    },
    levers: { fed_rate: 7.5, cpi: 6, unemployment: 9.5, us_tariff: 5, oil_price: 110, china_credit: 0, fiscal_deficit: 5, risk_event: 180, policy_uncertainty: 180 }
  },
  gfc_2008: {
    name: '金融危机 · 2008',
    note: {
      title: '📜 历史情景：2008-2009 全球金融危机',
      body: '<strong>美国侧</strong>：Lehman倒闭(2008.9.15)后6周内：HY信用利差从800bp爆炸至1971bp(2008.10.10历史峰值)、VIX峰值89、TED利差升至463bp。Fed紧急降息至0-0.25%(2008.12)启动QE1，财政赤字升至GDP 9.8%。<br><br><strong>中国侧（关键，原模型曾忽略）</strong>：2008.11 国务院推出 <strong>4万亿RMB（$586B / GDP 12.5%）</strong>刺激计划，2009年信贷脉冲达 +12-14pp。CME研究：中国刺激推动铜价从$1.30/lb→$4.60、油价从<$40→>$110、铁矿石从$60→$190(2011)，是 2009-2011 大宗商品超级周期的核心驱动。世界银行评价"规模适当、结构合理、时机准确"，但也埋下后续地方政府债务问题。<br><br><strong>资产表现</strong>：标普500 -57%(2007.10-2009.3)、UST 10Y从5.3%→2.1%、黄金从$1000突破$1900(2011)、铜从$1.30→$4.60(2011)。'
    },
    levers: { fed_rate: 0.25, cpi: -0.5, unemployment: 9.5, us_tariff: 2, oil_price: 40, china_credit: 12, fiscal_deficit: 10, risk_event: 280, policy_uncertainty: 350 }
  },
  covid_2020: {
    name: 'COVID冲击 · 2020',
    note: {
      title: '📜 历史情景：2020 COVID 流动性危机+刺激',
      body: '2020.3：标普500月内跌-34%、VIX达85、WTI原油期货首现负值(-$37, 2020.4.20)。Fed两周内降息150bp至0%、推出无限QE+建立6大流动性工具。CARES Act 2.2万亿+后续刺激合计6万亿(GDP 28%)。失业率单月从3.5%飙至14.7%。资产表现：4月起V反，纳指年内+44%，黄金破$2000(2020.8)，比特币起涨5倍。这是货币+财政双重刺激教科书案例。'
    },
    levers: { fed_rate: 0.25, cpi: 1.5, unemployment: 10, us_tariff: 5, oil_price: 30, china_credit: 6, fiscal_deficit: 14.7, risk_event: 350, policy_uncertainty: 400 }
  },
  recession: {
    name: '硬着陆衰退',
    note: {
      title: '⚠ 假设情景：硬着陆衰退',
      body: '失业飙升至8%以上、通胀快速回落至目标以下、央行被迫激进降息。机制类似2008或2020但不指向特定年份。央行通常将利率降至接近零，财政赤字大幅扩张（自动稳定器+刺激）。资产表现：长期国债大幅跑赢，股票和大宗下跌，信用利差爆炸性扩大。'
    },
    levers: { fed_rate: 1.0, cpi: 1.0, unemployment: 8.5, us_tariff: 5, oil_price: 50, china_credit: 5, fiscal_deficit: 12, risk_event: 250, policy_uncertainty: 200 }
  },
  stagflation: {
    name: '滞胀（假设）',
    note: {
      title: '⚠ 假设情景：现代滞胀',
      body: '高通胀(7%)+高失业(7%)+负增长。1973-75是经典案例（见"滞胀1974"）。央行陷入两难：加息打通胀但加深衰退，宽松刺激增长但通胀失控。模拟器中：保持利率高位但不能继续加息（已经压制需求），关税和油价是滞胀的输入冲击源。资产表现：现金为王、黄金对冲、股债双跌。'
    },
    levers: { fed_rate: 5.5, cpi: 7, unemployment: 7, us_tariff: 15, oil_price: 130, china_credit: -5, fiscal_deficit: 8, risk_event: 200, policy_uncertainty: 250 }
  },
  china_stimulus: {
    name: '中国刺激',
    note: {
      title: 'ℹ 中国大规模刺激（参考 2008/2020/2024Q4）',
      body: '中国信贷脉冲快速转正(+10pp)，房地产和基建拉动全球工业金属需求。注意：中国刺激主要利好工业金属（铜、铁矿石）和资源型EM（巴西、澳洲），对美股的传导相对有限。历史上类似情景：2008Q4-2009、2015-2016、2020Q2、2024Q4一揽子刺激。'
    },
    levers: { fed_rate: 4.0, cpi: 2.5, unemployment: 4.0, us_tariff: 3, oil_price: 90, china_credit: 10, fiscal_deficit: 6, risk_event: 100, policy_uncertainty: 100 }
  },
  tariff_war: {
    name: '关税升级',
    note: {
      title: '⚠ 关税升级（参考 2018-2019 / 2025）',
      body: '美国平均关税升至15-20%。Cavallo et al. (2021)研究：关税到进口商支付价格近完全传导，但到消费者零售价格传导慢且不完整（一年后<5%）。最终美国消费者承担约55%（Goldman Sachs 2025估计）、企业承担22%、外国出口商18%。同时报复性关税和供应链中断推升通胀和不确定性。美联储陷入两难：通胀上行需要加息，但增长下行需要降息。新兴市场和出口型经济体首当其冲。注意：关税应主要驱动 policy_uncertainty 而非地缘风险（risk_event）。'
    },
    levers: { fed_rate: 4.5, cpi: 4, unemployment: 4.5, us_tariff: 17, oil_price: 80, china_credit: -3, fiscal_deficit: 6, risk_event: 130, policy_uncertainty: 280 }
  },
  goldilocks: {
    name: '软着陆',
    note: {
      title: '✓ 金发女孩情景（Goldilocks）',
      body: '通胀回落至2%目标附近、失业稳定在4%左右、经济增长2%以上、央行温和降息。罕见但2024-2025年部分时段实现。资产表现：股票（尤其成长股）、企业信用债、新兴市场普遍受益。'
    },
    levers: { fed_rate: 3.0, cpi: 2.2, unemployment: 4.0, us_tariff: 3, oil_price: 70, china_credit: 2, fiscal_deficit: 5, risk_event: 90, policy_uncertainty: 80 }
  },
};

// === 三因子简化视图 (Bridgewater All Weather Framework) ===
// 把每个节点映射到主导的宏观因子: Growth / Inflation / Liquidity
// Dalio 全天候组合的理论基础——任何宏观环境都可由两个维度刻画：
// 增长（高/低）× 通胀（高/低）四象限，加上贯穿全局的流动性
const FACTOR_MAP = {
  // Growth 因子主导
  gdp_growth: 'growth',
  unemployment_rate: 'growth',
  us_equity: 'growth',
  commodities: 'growth',
  em_assets: 'growth',
  trade_flows: 'growth',
  cycle_position: 'growth',

  // Inflation 因子主导
  inflation: 'inflation',
  real_rates: 'inflation',
  gold: 'inflation',
  us_treasury: 'inflation',

  // Liquidity 因子主导
  global_liquidity: 'liquidity',
  monetary_policy: 'liquidity',
  fiscal_policy: 'liquidity',
  china_policy: 'liquidity',
  usd_index: 'liquidity',
  sovereign_fx: 'liquidity',
  credit_spread: 'liquidity',
  risk_appetite: 'liquidity',
  institutional_flows: 'liquidity',
  asset_allocation: 'liquidity',
  cross_asset: 'liquidity',
};

const FACTOR_META = {
  growth: {
    name: '增长',
    en: 'Growth',
    color: '#7eb8d8',
    desc: '实体经济活动强度。高增长→盈利改善、商品需求↑、就业改善；低增长→衰退风险、资产承压。代理指标：GDP、PMI、零售销售、工业产出。',
  },
  inflation: {
    name: '通胀',
    en: 'Inflation',
    color: '#e57373',
    desc: '物价上涨压力。高通胀侵蚀实际购买力、压低实际利率、利好通胀对冲资产；低通胀利好名义债券。代理指标：CPI、PCE、breakeven inflation、油价。',
  },
  liquidity: {
    name: '流动性',
    en: 'Liquidity',
    color: '#b8a8e0',
    desc: '货币与信用的供给状态。央行资产负债表、信用利差、美元强弱共同决定全球资金"水位"。流动性扩张利好所有风险资产；收缩则反之。代理指标：M2、央行QE/QT、HY OAS、DXY。',
  },
};
