// =====================================================================
// 应用控制器
// =====================================================================

let currentScenario = 'baseline';

// === 渲染杠杆控制 ===
function renderLevers() {
  const container = document.getElementById('leversContainer');
  container.innerHTML = LEVERS.map(lever => {
    const val = currentLevers[lever.id];
    const delta = val - lever.baseline;
    const deltaStr = delta === 0 ? '' :
      (delta > 0 ? `+${delta.toFixed(lever.step < 1 ? 2 : 1)}` :
                   `${delta.toFixed(lever.step < 1 ? 2 : 1)}`);

    // baseline marker position
    const baselinePct = ((lever.baseline - lever.min) / (lever.max - lever.min)) * 100;

    return `
      <div class="lever" data-id="${lever.id}">
        <div class="lever-head">
          <div>
            <span class="lever-name">${lever.name}</span>
            <span class="lever-en">${lever.en}</span>
          </div>
          <div>
            <span class="lever-val">${val.toFixed(lever.step < 1 ? 2 : 1)}<span style="font-size:11px;color:var(--ink-mute);margin-left:2px">${lever.unit}</span></span>
            ${delta !== 0 ? `<span class="lever-val-delta" style="color:${delta > 0 ? 'var(--green-up)' : 'var(--red-down)'}">${deltaStr}</span>` : ''}
          </div>
        </div>
        <div class="slider-wrap">
          <input type="range"
                 min="${lever.min}"
                 max="${lever.max}"
                 step="${lever.step}"
                 value="${val}"
                 oninput="onLeverChange('${lever.id}', parseFloat(this.value))">
          <div class="slider-baseline" style="left:${baselinePct}%"></div>
          <div class="slider-marks">
            <span>${lever.min}</span>
            <span style="color:var(--accent)">基准 ${lever.baseline}</span>
            <span>${lever.max}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 杠杆动画 debounce 计时器
let leverAnimTimer = null;
let lastLeverChangeTime = 0;
let isDragging = false;  // 拖动期间禁止画布"预显示"

function onLeverChange(id, val) {
  setLever(id, val);

  // === 关键：立即停止任何正在播放的级联动画 ===
  if (animationTimer) {
    clearInterval(animationTimer);
    animationTimer = null;
  }

  // === 拖动开始时：立即把画布"暗下来"——表示等待用户做决定 ===
  // 关键：预先计算哪些节点会被新杠杆影响（即将参与传导）
  // 让"即将传导"的节点保持灰白（待激活），无关节点深度淡化
  if (!isDragging) {
    isDragging = true;
    // 预计算"会被影响"的节点集合
    const affectedNodes = computeNodeDepths();
    // 给所有节点设定"等待"或"无关"状态：
    // - 受影响节点：depth=999（被门控隐藏，但稍后会动画长出来）
    // - 不受影响节点：depth=-998（特殊值，表示"无关"，render 时更深淡化）
    animationDepths = {};
    NODES.forEach(n => {
      if (affectedNodes[n.id] !== undefined) {
        animationDepths[n.id] = 999;  // 受影响节点：暂时隐藏
      } else {
        animationDepths[n.id] = -998;  // 无关节点：更深淡化
      }
    });
    animationProgress = -1;
    renderCanvas();
  }

  renderLevers();
  updateReplayButton();

  document.querySelectorAll('.scenario-pill').forEach(p => p.classList.remove('active'));
  hideScenarioNote();
  currentScenario = null;

  // === Debounce 动画：用户停止拖动 350ms 后触发传导动画 ===
  if (leverAnimTimer) clearTimeout(leverAnimTimer);
  lastLeverChangeTime = Date.now();

  leverAnimTimer = setTimeout(() => {
    if (Date.now() - lastLeverChangeTime < 300) return;
    isDragging = false;
    // 启动级联动画：会重新计算 depths 并从源头长出来
    startCascadeAnimation();
    if (selectedNode) renderInfoPanel();
    leverAnimTimer = null;
  }, 350);
}

function loadScenario(scenarioId) {
  // === 立即停止任何正在播放的动画 + 取消 pending debounce ===
  if (animationTimer) {
    clearInterval(animationTimer);
    animationTimer = null;
  }
  if (leverAnimTimer) {
    clearTimeout(leverAnimTimer);
    leverAnimTimer = null;
  }

  currentScenario = scenarioId;
  const sc = applyScenario(scenarioId);

  document.querySelectorAll('.scenario-pill').forEach(p => p.classList.remove('active'));
  if (event && event.target) event.target.classList.add('active');

  if (sc.note) {
    showScenarioNote(sc.note);
  } else {
    hideScenarioNote();
  }

  renderLevers();
  if (selectedNode) renderInfoPanel();

  // 切换情景时触发级联动画
  startCascadeAnimation();
}

function showScenarioNote(note) {
  const el = document.getElementById('scenarioNote');
  document.getElementById('scenarioNoteTitle').textContent = note.title;
  document.getElementById('scenarioNoteBody').textContent = note.body;
  el.classList.add('show');
}

function hideScenarioNote() {
  document.getElementById('scenarioNote').classList.remove('show');
}

function resetLevers() {
  resetToBaseline();
  document.querySelectorAll('.scenario-pill').forEach(p => p.classList.remove('active'));
  hideScenarioNote();
  currentScenario = 'baseline';
  renderCanvas();
  renderLevers();
  if (selectedNode) renderInfoPanel();
}

function resetView() {
  // 重置所有视图状态：缩放、平移、用户拖动的角度、选中节点
  zoomLevel = 1;
  panX = 0;
  panY = 0;
  Object.keys(userAngles).forEach(k => delete userAngles[k]);
  selectedNode = null;
  resetLevers();
  computeNodePositions();
  renderCanvas();
  renderInfoPanel();
  updateZoomIndicator();
}

function zoomIn() {
  zoomLevel = Math.min(ZOOM_MAX, zoomLevel + 0.2);
  renderCanvas();
  updateZoomIndicator();
}

function zoomOut() {
  zoomLevel = Math.max(ZOOM_MIN, zoomLevel - 0.2);
  renderCanvas();
  updateZoomIndicator();
}

// 暴露给 HTML onclick
window.selectNode = selectNode;
window.onLeverChange = onLeverChange;
window.loadScenario = loadScenario;
window.resetLevers = resetLevers;
window.resetView = resetView;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;

// === 初始化 ===
function init() {
  initCanvas();
  renderCanvas();
  renderLevers();
  renderInfoPanel();

  // 缩放：滚轮 / 触控板
  const canvasWrap = document.querySelector('.canvas-wrap');
  canvasWrap.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomLevel + delta));
    renderCanvas();
    updateZoomIndicator();
  }, { passive: false });

  // 平移：在画布空白处用左键拖动 / 中键 / 右键
  let isPanning = false;
  let panStart = null;

  canvasWrap.addEventListener('mousedown', (e) => {
    const onNode = e.target.closest && e.target.closest('.node-group');
    const onEdge = e.target.classList && e.target.classList.contains('edge');
    if (onNode || onEdge) return;

    e.preventDefault();
    isPanning = true;
    panStart = { x: e.clientX - panX, y: e.clientY - panY };
    canvasWrap.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    panX = e.clientX - panStart.x;
    panY = e.clientY - panStart.y;
    renderCanvas();
  });

  document.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      canvasWrap.style.cursor = '';
    }
  });

  canvasWrap.addEventListener('contextmenu', (e) => e.preventDefault());

  // === 触屏支持：单指平移、双指缩放 ===
  let touchState = null;

  canvasWrap.addEventListener('touchstart', (e) => {
    const onNode = e.target.closest && e.target.closest('.node-group');

    if (e.touches.length === 1 && !onNode) {
      e.preventDefault();
      touchState = {
        type: 'pan',
        startX: e.touches[0].clientX - panX,
        startY: e.touches[0].clientY - panY,
      };
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchState = {
        type: 'pinch',
        startDist: Math.sqrt(dx * dx + dy * dy),
        startZoom: zoomLevel,
      };
    }
  }, { passive: false });

  canvasWrap.addEventListener('touchmove', (e) => {
    if (!touchState) return;
    e.preventDefault();

    if (touchState.type === 'pan' && e.touches.length === 1) {
      panX = e.touches[0].clientX - touchState.startX;
      panY = e.touches[0].clientY - touchState.startY;
      renderCanvas();
    } else if (touchState.type === 'pinch' && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / touchState.startDist;
      zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, touchState.startZoom * ratio));
      renderCanvas();
      updateZoomIndicator();
    }
  }, { passive: false });

  canvasWrap.addEventListener('touchend', () => {
    touchState = null;
  });

  // 首次访问自动打开 tutorial
  if (!localStorage.getItem('macro_tutorial_seen')) {
    setTimeout(() => startTutorial(), 600);
  }
}

// === TUTORIAL ===
const TUTORIAL_STEPS = [
  {
    title: '欢迎使用全球宏观经济联动系统',
    body: '这是一个由 <strong>22 个核心节点</strong>组成的因果网络，分布在 5 层径向环上：从内到外依次是<strong>货币基础 → 经济运行 → 政策调控 → 金融市场 → 资产定价</strong>。每条边都基于真实的实证研究（Bernanke-Kuttner, Taylor Rule, Phillips Curve 等）。<div class="tut-example">这个工具的目标：建立一个统一的解读框架，让你之后看到任何宏观新闻，都能问"这会进入哪个节点 → 沿哪些边传导 → 影响哪些资产"。</div>',
  },
  {
    title: '步骤 1：拖动杠杆，观察网络响应',
    body: '底部有 <strong>9 个杠杆</strong>对应真实政策工具：美联储利率、CPI 通胀、失业率、关税、油价、中国信贷脉冲、财政赤字、地缘风险、政策不确定性。<br><br>试试 <strong>把美联储利率从 4.5% 拖到 7%</strong>。整个网络会级联响应：<br><br>• 实际利率 ↑ → 黄金 ↓<br>• 美元 ↑ → 新兴市场 ↓ → 大宗 ↓<br>• 美股 ↓（Bernanke-Kuttner: 25bp 加息 → 标普 -1%）<br>• 全球流动性 ↓<div class="tut-example">每个节点旁边的 ↑↓ 箭头实时显示状态变化，连线颜色绿色=利好传导、红色=利空传导。</div>',
  },
  {
    title: '步骤 2：点击节点，查看详情',
    body: '<strong>左键点击任意节点</strong>，右侧面板会展开：<br><br>• <strong>机制描述</strong>：这个节点是什么、如何定价<br>• <strong>关键指标</strong>：当前真实数值参考<br>• <strong>上游驱动</strong>：哪些节点影响它（带强度系数）<br>• <strong>下游影响</strong>：它影响哪些节点<br>• <strong>实证依据</strong>：具体研究、年份、数据<div class="tut-example">点击连接的节点可以跳转过去，形成网状探索。例如：从"美联储利率"跳到"实际利率"，再跳到"黄金"，建立完整的传导链路认知。</div>',
  },
  {
    title: '步骤 3：试试历史情景',
    body: '底部 <strong>橙色按钮是真实历史案例</strong>，每个对应特定年份的精确数据：<br><br>• <code>滞胀 1974</code>：CPI 12%、失业 9%、油价 $145<br>• <code>Volcker 1981</code>：利率推至 19-20%<br>• <code>金融危机 2008</code>：HY 利差 1971bp、VIX 89<br>• <code>COVID 2020</code>：失业 14.7%、财政 14.7% GDP<br><br>点击任一情景，所有杠杆同步切换到当时的真实数值，观察整个网络的响应模式。<div class="tut-example">这是建立"市场记忆"的最快方式——看到 2025 的某个数据，问自己"这更像 1974 还是 2008？"</div>',
  },
  {
    title: '步骤 4：画布操作',
    body: '<strong>滚轮</strong>：缩放 40%-250%（右下角有按钮和百分比指示）<br><strong>左键拖动空白</strong>：上下左右平移画布<br><strong>左键拖动节点</strong>：节点沿所属环旋转（约束在自己层）<br><strong>右下角 ⟲</strong>：重置所有视图状态<br><br><strong>触屏</strong>：单指拖动平移、双指捏合缩放<br><br>右下角橙色 <strong>?</strong> 按钮可以随时重新打开此教程。',
  },
  {
    title: '步骤 5：两套心智模型',
    body: '画布右上角的"<strong>视图模式</strong>"切换器有两套视图：<br><br><strong>① 5层架构视图</strong>（默认）：节点按"货币基础→经济运行→政策调控→金融市场→资产定价"分层着色。适合深入理解传导机制。<br><br><strong>② 三因子视图</strong>：节点按主导因子重新着色——<span style="color:#7eb8d8">增长(蓝)</span>、<span style="color:#e57373">通胀(红)</span>、<span style="color:#b8a8e0">流动性(紫)</span>。这是 Ray Dalio 全天候组合的理论基础。<div class="tut-example"><strong>建议工作流</strong>：先用 5 层视图建立细节认知（哪些边、哪些机制），再切换到三因子视图压缩成"判断 3 个变量方向"的可执行框架。点击单个因子可以高亮该因子链路，淡化其余。</div>',
  },
];

let tutStep = 0;

function startTutorial() {
  tutStep = 0;
  document.getElementById('tutorialOverlay').classList.add('active');
  renderTutorialStep();
}

function skipTutorial() {
  document.getElementById('tutorialOverlay').classList.remove('active');
  localStorage.setItem('macro_tutorial_seen', '1');
}

function nextTutorial() {
  if (tutStep < TUTORIAL_STEPS.length - 1) {
    tutStep++;
    renderTutorialStep();
  } else {
    skipTutorial();
  }
}

function prevTutorial() {
  if (tutStep > 0) {
    tutStep--;
    renderTutorialStep();
  }
}

function renderTutorialStep() {
  const step = TUTORIAL_STEPS[tutStep];
  document.getElementById('tutTitle').textContent = step.title;
  document.getElementById('tutBody').innerHTML = step.body;
  document.getElementById('tutStepNum').textContent = tutStep + 1;
  document.getElementById('tutBack').disabled = tutStep === 0;
  document.getElementById('tutNext').textContent =
    tutStep === TUTORIAL_STEPS.length - 1 ? '开始探索 ✓' : '下一步 →';

  // Render dots
  const dotsEl = document.getElementById('tutDots');
  dotsEl.innerHTML = TUTORIAL_STEPS.map((_, i) =>
    `<div class="tut-dot ${i === tutStep ? 'active' : ''}"></div>`
  ).join('');
}

window.startTutorial = startTutorial;
window.skipTutorial = skipTutorial;
window.nextTutorial = nextTutorial;
window.prevTutorial = prevTutorial;

// === 视图模式切换 ===
function setViewMode(mode) {
  viewMode = mode;

  // 更新 UI 按钮 active 状态
  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  // 显示/隐藏因子过滤器
  const filterEl = document.getElementById('factorFilter');
  if (mode === 'factors') {
    filterEl.style.display = 'flex';
    factorFilter = 'all';
    document.querySelectorAll('.factor-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.factor === 'all');
    });
    // 提示信息
    showFactorInfo();
  } else {
    filterEl.style.display = 'none';
    hideFactorInfo();
  }

  renderCanvas();
}

function setFactorFilter(factor) {
  factorFilter = factor;
  document.querySelectorAll('.factor-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.factor === factor);
  });
  if (factor === 'all') {
    showFactorInfo();
  } else {
    showFactorInfo(factor);
  }
  renderCanvas();
}

function showFactorInfo(factor) {
  // 在右侧 info panel 顶部显示因子说明（如果当前没有选中的节点）
  if (selectedNode) return;  // 节点详情优先

  const panel = document.getElementById('infoPanel');
  if (!factor) {
    // 总览：显示三因子并列
    panel.innerHTML = `
      <div class="info-empty" style="display:block;padding-top:0">
        <div style="font-family:'Fraunces',serif;font-size:20px;color:var(--ink);margin-bottom:6px">三因子简化视图</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink-mute);margin-bottom:18px;letter-spacing:0.05em">
          BRIDGEWATER ALL WEATHER FRAMEWORK
        </div>
        <div style="font-size:12px;color:var(--ink-soft);line-height:1.7;margin-bottom:18px">
          Ray Dalio 提出的简化框架：<strong style="color:var(--ink)">任何宏观环境都可以由 增长 × 通胀 两个维度决定</strong>，再叠加一层贯穿全局的流动性。这是从 22 节点 5 层架构到一个可执行投资框架的"压缩"——损失了一些中介变量的解释力，但给出了清晰的资产配置心智模型。
        </div>
        ${Object.keys(FACTOR_META).map(k => {
          const f = FACTOR_META[k];
          const count = Object.values(FACTOR_MAP).filter(v => v === k).length;
          return `
            <div style="margin-bottom:14px;padding:14px;background:var(--bg-soft);border-left:3px solid ${f.color};border-radius:0 4px 4px 0;cursor:pointer"
                 onclick="setFactorFilter('${k}')">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                <div style="font-family:'Fraunces',serif;font-size:16px;color:${f.color};font-weight:500">
                  ${f.name} <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink-mute);margin-left:6px">${f.en}</span>
                </div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink-mute)">${count} 节点</div>
              </div>
              <div style="font-size:11.5px;color:var(--ink-soft);line-height:1.6">${f.desc}</div>
            </div>
          `;
        }).join('')}
        <div style="margin-top:16px;padding:12px;background:var(--bg-deep);border-radius:4px;font-size:11px;color:var(--ink-mute);line-height:1.6">
          💡 <strong style="color:var(--ink)">使用建议</strong>：先用"5层架构"理解传导细节，再切换到"三因子"看大局。判断当前宏观环境时问：<br>
          • 增长上行还是下行？<br>
          • 通胀上行还是下行？<br>
          • 流动性扩张还是收缩？<br>
          四象限对应的最优资产类别即美林时钟。
        </div>
      </div>
    `;
  } else {
    // 单因子激活：显示该因子详情和该因子下的节点列表
    const f = FACTOR_META[factor];
    const factorNodes = NODES.filter(n => FACTOR_MAP[n.id] === factor);
    panel.innerHTML = `
      <div class="info-empty" style="display:block;padding-top:0">
        <div style="display:inline-block;padding:3px 10px;background:${f.color};color:#0a0b0d;border-radius:3px;font-size:10px;font-weight:600;letter-spacing:0.08em;margin-bottom:10px">
          ${f.en.toUpperCase()} 因子
        </div>
        <div style="font-family:'Fraunces',serif;font-size:24px;color:${f.color};margin-bottom:12px">${f.name}</div>
        <div style="font-size:12.5px;color:var(--ink-soft);line-height:1.75;margin-bottom:18px">${f.desc}</div>

        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--ink-mute);letter-spacing:0.1em;margin-bottom:8px;text-transform:uppercase">
          属于此因子的节点 (${factorNodes.length})
        </div>
        ${factorNodes.map(n => `
          <div style="padding:8px 12px;background:var(--bg-soft);border-radius:3px;margin-bottom:4px;cursor:pointer;display:flex;justify-content:space-between;align-items:center"
               onclick="selectNode('${n.id}')">
            <span style="font-size:12px;color:var(--ink)">${n.name}</span>
            <span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--ink-mute)">${n.en}</span>
          </div>
        `).join('')}

        <div style="margin-top:14px;font-size:11px;color:var(--ink-mute);line-height:1.6">
          点击节点查看详细传导机制。点击其他因子切换视角，点击"全部"返回三因子总览。
        </div>
      </div>
    `;
  }
}

function hideFactorInfo() {
  // 切换回 layers 模式时，恢复默认的空面板（如无选中节点）
  if (!selectedNode) {
    renderInfoPanel();
  }
}

window.setViewMode = setViewMode;
window.setFactorFilter = setFactorFilter;

// === 传导动画 ===
function startCascadeAnimation() {
  // 取消任何正在进行的动画
  if (animationTimer) {
    clearInterval(animationTimer);
    animationTimer = null;
  }

  // 计算每个节点的深度
  const computedDepths = computeNodeDepths();

  // 关键：给所有未被影响的节点显式设 depth=-998（无关，深度淡化）
  // 这样 render.js 会识别它们并保持深度淡化，不会"先于动画显现"
  animationDepths = {};
  NODES.forEach(n => {
    if (computedDepths[n.id] !== undefined) {
      animationDepths[n.id] = computedDepths[n.id];
    } else {
      animationDepths[n.id] = -998;  // 无关节点
    }
  });

  // 找出最大深度（只看会被影响的节点）
  const realDepths = Object.values(computedDepths).filter(d => d !== undefined);
  const maxDepth = realDepths.length > 0 ? Math.max(...realDepths) : 0;

  // 如果没有任何节点变化（baseline 状态），直接全显
  if (realDepths.length === 0) {
    animationProgress = 999;
    animationDepths = {};
    renderCanvas();
    return;
  }

  // 从 -1（全暗）开始，逐层点亮
  animationProgress = -1;
  renderCanvas();

  // 每 850ms 推进一层（更慢，让层次清晰）
  let currentDepth = -1;
  animationTimer = setInterval(() => {
    currentDepth++;
    animationProgress = currentDepth;
    renderCanvas();

    if (currentDepth >= maxDepth) {
      clearInterval(animationTimer);
      animationTimer = null;
      // 动画结束后保留最终状态
      // 让用户充分感受完整传导链路 700ms 后再触发淡出
      setTimeout(() => {
        animationProgress = 999;
        justFinishedAnimation = true;  // 标记：触发 factor-mode 平滑淡化
        renderCanvas();
        setTimeout(() => { justFinishedAnimation = false; }, 50);
      }, 700);
    }
  }, 850);

  // 更新重播按钮状态
  updateReplayButton();
}

function updateReplayButton() {
  const btn = document.getElementById('replayBtn');
  if (!btn) return;
  // 检查任何 lever 是否偏离 baseline
  const hasActive = LEVERS.some(lever => {
    return Math.abs(currentLevers[lever.id] - lever.baseline) > 0.001;
  });
  btn.style.display = hasActive ? '' : 'none';
}

window.startCascadeAnimation = startCascadeAnimation;

function updateZoomIndicator() {
  const ind = document.getElementById('zoomIndicator');
  if (ind) ind.textContent = `${Math.round(zoomLevel * 100)}%`;
}

window.addEventListener('load', init);
window.addEventListener('resize', () => {
  // 窗口大小变化时，重新计算 fit-to-screen（强制重新触发自动缩放）
  zoomLevel = 1;
  initCanvas();
  renderCanvas();
  updateZoomIndicator();
});
