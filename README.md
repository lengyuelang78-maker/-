# 全球宏观经济联动系统 · Global Macro Interactive

> 一个交互式可视化工具，用 22 个核心节点 + 60+ 条带实证依据的因果边，把"美联储利率→实际利率→黄金""中国信贷脉冲→大宗商品""信用利差→风险偏好"这些散落在教科书、研报、推特里的传导链路，**汇成一张可点击、可拖动、可重播的网络**。

(https://lengyuelang78-maker.github.io/global-macro-interactive/) · [作者 lengyuelang78-maker](https://github.com/wolf_cool)
---

## 这个工具想解决什么

每天打开财经新闻：「鲍威尔暗示放缓加息」「中国推 10 万亿一揽子」「中东局势升级油价飙涨」——你能立刻在脑子里画出**这个事件会顺着哪些链路传导到哪些资产**吗？

大多数人不能，包括我。原因不是知识储备不够，而是**这些知识从来没被组织成一张可视化的图**。教科书讲货币政策、贸易理论、资产定价是分开三章；研报每篇只聚焦一个节点；推特上的"老司机"用的是肌肉记忆。

这个工具试图把它们拼成**一张图、一套传导规则、一组历史校准**——让你在看到任何宏观事件时能问：

> ① 它会进入网络的哪个节点？  
> ② 沿哪些边传导？  
> ③ 影响哪些资产？  
> ④ 当前所处的宏观体制（regime）会改变哪些边的方向？

---

## 核心特性

### 22 节点 5 层径向网络

从内到外：**货币基础 → 经济运行 → 政策调控 → 金融市场 → 资产定价**。中心是"全球流动性"——所有资产定价的母变量。

### 9 个杠杆 = 9 个真实政策工具

`fed_rate` (美联储利率) · `cpi` (通胀) · `unemployment` (失业率) · `us_tariff` (关税) · `oil_price` (油价) · `china_credit` (中国信贷脉冲) · `fiscal_deficit` (财政赤字) · `risk_event` (地缘风险 GPR) · `policy_uncertainty` (政策不确定性 EPU)

每个杠杆的影响都通过**实证校准的传导系数**进入网络（不是凭感觉编的）。

### 10 个历史 / 假设情景

| 历史情景 | 关键数据 |
|---------|---------|
| 滞胀 1974 | OPEC 禁运、CPI 12.3%、失业 9% |
| Volcker 1981 | 利率推至 19-20%、用衰退换可信度 |
| 金融危机 2008 | HY 利差 1971bp、VIX 89、中国 4 万亿 |
| COVID 2020 | 失业 14.7%、财政 14.7% GDP、负油价 |

| 假设情景 |
|---------|
| 现代滞胀 / 硬着陆 / 中国刺激 / 关税升级 / 软着陆 |

### 三类边的视觉区分

- **因果·正向**：实线
- **因果·负向**：长虚线
- **依环境**：中虚线（regime-dependent，如 Phillips Curve）
- **共振·非因果**：蓝色实线 + 双向箭头（如美股↔大宗商品）

后者帮你避免把"相关"当成"因果"——这个区分是宏观分析中最常见的错误之一。

### 两套心智模型

切换"5 层架构"和"三因子简化视图"（Bridgewater All Weather: Growth / Inflation / Liquidity）。先用 5 层视图建立细节认知，再压缩到三因子做可执行判断。

### 级联动画

切换情景或拖动杠杆后，传导链路像水流一样**沿因果边从源头长出来**——基于带边权的 Dijkstra 算法（强边权 1，中边权 2，弱边权 3），让强传导先发生、弱传导后发生。

---

## 实证依据

每个节点的 `evidence` 区域都标注了具体研究、年份、数据点。包括：

- Bernanke-Kuttner (JF 2005) — 货币政策对股市的标准弹性
- Cavallo, Gopinath, Neiman, Tang (AER Insights 2021) — 关税传导
- Borio & Disyatat (BIS 2015) — 跨境美元信用
- Estrella & Mishkin (1996) — 收益率曲线衰退预测
- Caldara & Iacoviello — GPR 地缘风险指数
- Baker, Bloom, Davis (2016) — EPU 政策不确定性
- Phillips (1958) / Okun (1962) — 经典宏观关系
- BIS WP 1011 — 中国信贷脉冲领先金属价格 6-9 月
- 还有 30+ 条引用，覆盖 NBER、IMF、Fed、BIS 工作论文

---

## 技术栈

**零依赖单文件 HTML**——双击打开即可使用，无需服务器、无需构建工具。

- 原生 JavaScript（约 2400 行）
- SVG 渲染（无 D3，自实现径向布局 + 贝塞尔边）
- CSS 动画（@keyframes for stroke-dashoffset 生长动画）
- localStorage 记忆 tutorial 状态
- Google Fonts：Fraunces · JetBrains Mono · Noto Sans SC

完整文件 `global_macro_interactive.html` 约 124KB，可以直接复制部署到任何静态网站。

---

## 本地运行

```bash
git clone https://github.com/wolf-cool/global-macro-interactive.git
cd global-macro-interactive
# 直接用浏览器打开 global_macro_interactive.html 即可
# 或用任意静态服务器：
python3 -m http.server 8000
# 然后访问 http://localhost:8000/global_macro_interactive.html
```

---

## 项目结构（开发参考）

如果想参与开发或在此基础上 fork，源代码组织在 `src/` 目录：

```
src/
├── data.js      # 节点定义、边定义、杠杆系数、情景预设、三因子映射
├── model.js     # 传导引擎（recompute 函数）+ Dijkstra 深度计算
├── render.js    # SVG 径向布局 + 节点/边渲染 + 交互
├── app.js       # 控制器 + 动画 + tutorial + 视图切换
└── main.html    # HTML 结构 + CSS

build.py         # 把 4 个 JS 文件合并到 main.html，输出单文件 HTML
```

构建：

```bash
python3 build.py  # 生成 global_macro_interactive.html
```

---

## 局限性 / 已知问题

1. **模型给出的是"传导完成后的均衡状态"**，不区分短期 vs 中期。例如 GFC 中 EM 短期暴跌、9 个月后因中国刺激回弹——网络只能展示其中一种状态。
2. **传导系数是经验校准而非模型估计**——很多取自单篇论文的弹性结果，不同时期不同样本会有差异。
3. **视图比例**在小屏（窄于 1100px）下可能拥挤，建议桌面浏览器使用。

---

## 致谢与引用

如果这个工具对你有帮助，引用方式：

```
lengyuelang78-maker (2026). Global Macro Interactive: A Causal Network for Macro Transmission.
https://github.com/lengyuelang78-maker/global-macro-interactive
```

---

## License

MIT — 自由使用、修改、分发，但请保留原作者署名。

---

*Built by [lengyuelang78-maker](https://github.com/lengyuelang78-maker)* · *Made with friction, not vibes.*
