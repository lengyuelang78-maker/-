// =====================================================================
// 径向网络渲染器
// =====================================================================

const SVG_NS = 'http://www.w3.org/2000/svg';

// 布局参数（rings在initCanvas中根据画布尺寸动态计算）
const LAYOUT = {
  rings: [0, 90, 175, 260, 345], // 默认值，会被覆盖
  ringLabels: ['Layer 1 · 货币基础', 'Layer 2 · 经济运行', 'Layer 3 · 政策调控', 'Layer 4 · 金融市场', 'Layer 5 · 资产定价'],
};

let canvasW = 0, canvasH = 0;
let cx = 0, cy = 0;
let selectedNode = null;
let nodePositions = {};

// 用户通过拖动调整后的角度（约束在自己的环上）
const userAngles = {};

// 缩放和平移状态
let zoomLevel = 1;
let panX = 0;
let panY = 0;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.5;

// 视图模式: 'layers' (5层架构) | 'factors' (三因子)
let viewMode = 'layers';
// 三因子视图下的过滤: 'all' | 'growth' | 'inflation' | 'liquidity'
let factorFilter = 'all';

// === 传导动画状态 ===
// animationProgress: 0 = 没有进度（节点全部隐藏状态）, +inf = 完全显示
// 显示规则：节点深度 <= animationProgress 时显示
let animationProgress = 999;  // 初始全显
let animationTimer = null;
let animationDepths = {};  // {nodeId: depth}
// 动画刚结束的标志：在第一次 render 之后清除，用于触发 factor-mode 平滑淡化
let justFinishedAnimation = false;

function initCanvas() {
  const wrap = document.querySelector('.canvas-wrap');
  canvasW = wrap.clientWidth;
  canvasH = wrap.clientHeight;
  cx = canvasW / 2;
  cy = canvasH / 2;

  const safePadding = 90;
  const maxR = Math.min(canvasW, canvasH) / 2 - safePadding;

  // === 关键约束：环间距必须 >= 2.5 × 节点半径，避免节点跨环重叠 ===
  // 节点半径 26px (含状态扩展) → 最小间距 = 2.5 × 26 = 65px
  // 加上节点周围文字标签，实际舒适间距 80-100px
  const NODE_R_MAX = 26;
  const MIN_RING_STEP = 2.7 * NODE_R_MAX;  // ≈ 70px

  // 内圈半径：必须容纳中心节点 + ring1节点，最小 ~120px
  const RING1_MIN = 130;
  const ring1 = Math.max(RING1_MIN, maxR * 0.22);

  // 后续 4 个环间距：至少 MIN_RING_STEP
  let ringStep = (maxR - ring1) / 4;
  if (ringStep < MIN_RING_STEP) {
    // 画布不够大时，强制使用 MIN_RING_STEP，外圈会超出 maxR
    // 但这种情况下用户可以缩小（zoom out）查看全貌
    ringStep = MIN_RING_STEP;
  }

  LAYOUT.rings = [
    0,
    ring1,
    ring1 + ringStep,
    ring1 + ringStep * 2,
    ring1 + ringStep * 3,
    ring1 + ringStep * 4,
  ];

  // 如果总半径超出画布，自动缩小初始 zoomLevel 以适配
  // 节点中心在 LAYOUT.rings[5]，但节点本体 ~26px + 中文标签外延 ~50px = 76px
  // 加 10px 视觉边距
  const NODE_OUTER_EXTENT = 90;
  const totalR = LAYOUT.rings[5] + NODE_OUTER_EXTENT;
  const halfMin = Math.min(canvasW, canvasH) / 2;
  const fitZoom = halfMin / totalR;
  // 仅当还没被用户调整过时，应用 fit
  if (fitZoom < 1 && zoomLevel === 1) {
    zoomLevel = Math.max(ZOOM_MIN, fitZoom);
  }

  const svg = document.getElementById('canvas');
  svg.setAttribute('viewBox', `0 0 ${canvasW} ${canvasH}`);

  computeNodePositions();
}

function computeNodePositions() {
  nodePositions = {};

  // 第一步：把 layer 字符串映射到正确的 ring 索引（修复 L5 ring=5 越界）
  // 同时按 ring 分组节点，自动均匀分布角度
  const layerToRing = { l1: 1, l2: 2, l3: 3, l4: 4, l5: 5 };

  // 中心节点单独处理
  NODES.forEach(n => {
    if (n.ring === 0 || n.id === 'global_liquidity') {
      nodePositions[n.id] = { x: cx, y: cy };
    }
  });

  // 按 ring 分组其余节点（5 个环，layer 1-5 各占一环）
  const ringGroups = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  NODES.forEach(n => {
    if (n.ring === 0 || n.id === 'global_liquidity') return;
    // 现在支持 ring 1-5，不再重映射
    const targetRing = Math.max(1, Math.min(n.ring, 5));
    ringGroups[targetRing].push(n);
  });

  // 每个环：均匀分布 + 应用用户拖动的 angle 偏移
  Object.keys(ringGroups).forEach(ringKey => {
    const ringIdx = parseInt(ringKey);
    if (ringIdx > 5) return;
    const nodes = ringGroups[ringKey];
    if (nodes.length === 0) return;
    const r = LAYOUT.rings[ringIdx];

    nodes.forEach((node, i) => {
      // 默认均匀分布：避开顶部层标签区域
      // 同时相邻环之间错开角度，避免不同环的节点排成一条径向直线
      let angle;
      if (userAngles[node.id] !== undefined) {
        angle = userAngles[node.id];
      } else {
        // 每环错开 12°（奇数环额外旋转）
        // 起始偏移 30°，避开正上方的层标签
        const ringOffset = (ringIdx % 2) * (180 / nodes.length / 2) + ringIdx * 8;
        const startOffset = 30 + ringOffset;
        angle = (startOffset + (360 / nodes.length) * i) % 360;
      }
      const angleRad = (angle - 90) * Math.PI / 180;
      nodePositions[node.id] = {
        x: cx + r * Math.cos(angleRad),
        y: cy + r * Math.sin(angleRad),
        angle: angle,
        ring: ringIdx,
      };
    });
  });
}

function getLayerColor(layer) {
  return `var(--${layer})`;
}

function getLayerSoftColor(layer) {
  return `var(--${layer}-soft)`;
}

function renderCanvas() {
  const svg = document.getElementById('canvas');
  svg.innerHTML = '';

  // 应用缩放：通过 viewBox 实现
  // 缩小时 viewBox 变大（看到更多内容），放大时 viewBox 变小
  const vbW = canvasW / zoomLevel;
  const vbH = canvasH / zoomLevel;
  const vbX = (canvasW - vbW) / 2 - panX;
  const vbY = (canvasH - vbH) / 2 - panY;
  svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);

  // === 1. 绘制层级背景（同心圆填充，从外到内绘制以保证层叠正确） ===
  // 在 factor view 下，层级背景大幅淡化（因为不再是主分类维度）
  const layerBgOpacity = viewMode === 'factors' ? 0.3 : 1;
  for (let i = 5; i >= 1; i--) {
    const ring = document.createElementNS(SVG_NS, 'circle');
    ring.setAttribute('cx', cx);
    ring.setAttribute('cy', cy);
    const r = LAYOUT.rings[i] + 35;
    ring.setAttribute('r', r);
    const layerKey = `l${i}`;
    ring.setAttribute('fill', `var(--${layerKey}-bg)`);
    ring.setAttribute('stroke', `var(--${layerKey})`);
    ring.setAttribute('stroke-width', '0.5');
    ring.setAttribute('stroke-opacity', 0.3 * layerBgOpacity);
    ring.setAttribute('fill-opacity', layerBgOpacity);
    ring.setAttribute('stroke-dasharray', '3 5');
    svg.appendChild(ring);
  }

  // === 2. 绘制环标签（顶部，放在两环之间的空隙处） ===
  const layerLabels = ['', '货币基础', '经济运行', '政策调控', '金融市场', '资产定价'];
  for (let i = 1; i <= 5; i++) {
    const layerKey = `l${i}`;
    const labelText = layerLabels[i];

    // 标签 Y 位置：放在该层的环上（节点所在的圆周上）
    // 但因为节点从 30° 开始分布，正上方（0°）是空的，标签放这里不会冲突
    const labelY = cy - LAYOUT.rings[i];

    // 标签背景：实色填充，更醒目
    const textW = labelText.length * 12 + 24;
    const labelBg = document.createElementNS(SVG_NS, 'rect');
    labelBg.setAttribute('x', cx - textW / 2);
    labelBg.setAttribute('y', labelY - 11);
    labelBg.setAttribute('width', textW);
    labelBg.setAttribute('height', 22);
    labelBg.setAttribute('rx', 11);
    labelBg.setAttribute('fill', `var(--${layerKey})`);
    labelBg.setAttribute('opacity', viewMode === 'factors' ? '0.3' : '0.95');
    svg.appendChild(labelBg);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', cx);
    label.setAttribute('y', labelY);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'central');
    label.setAttribute('font-family', 'Noto Sans SC, sans-serif');
    label.setAttribute('font-size', '12');
    label.setAttribute('font-weight', '600');
    label.setAttribute('fill', '#0a0b0d');
    label.setAttribute('letter-spacing', '0.05em');
    label.textContent = labelText;
    svg.appendChild(label);
  }

  // === 3. 绘制边 ===
  const edgeGroup = document.createElementNS(SVG_NS, 'g');
  edgeGroup.setAttribute('id', 'edges');
  svg.appendChild(edgeGroup);

  EDGES.forEach((edge, idx) => {
    const fromPos = nodePositions[edge.from];
    const toPos = nodePositions[edge.to];
    if (!fromPos || !toPos) return;

    const line = document.createElementNS(SVG_NS, 'path');

    // 弯曲边以避免视觉重叠
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const dr = Math.sqrt(dx * dx + dy * dy);
    const curveOffset = dr * 0.15;

    // 计算控制点（垂直于直线方向）
    const midX = (fromPos.x + toPos.x) / 2;
    const midY = (fromPos.y + toPos.y) / 2;
    const perpX = -dy / dr * curveOffset;
    const perpY = dx / dr * curveOffset;
    const ctrlX = midX + perpX;
    const ctrlY = midY + perpY;

    line.setAttribute('d', `M ${fromPos.x},${fromPos.y} Q ${ctrlX},${ctrlY} ${toPos.x},${toPos.y}`);
    line.setAttribute('fill', 'none');

    // 边的样式：基于节点状态
    const fromState = nodeStates[edge.from];
    let isActive = Math.abs(fromState) > 0.1;

    // 动画门控：from 节点的深度必须 <= animationProgress 才能"激活"
    const fromDepth = animationDepths[edge.from];
    const toDepth = animationDepths[edge.to];
    let isDepthHidden = false;  // 上游节点还没被激活，整条边不可见
    let isGrowingNow = false;   // 上游节点刚被激活（depth == progress），边正在"长出来"
    let isUnrelatedEdge = false; // 边的两端都是无关节点（拖动期间）

    // 检测无关边（两端都是 -998）
    if (fromDepth === -998 || toDepth === -998) {
      isUnrelatedEdge = true;
      isActive = false;
    } else if (fromDepth !== undefined) {
      if (fromDepth > animationProgress) {
        isActive = false;
        isDepthHidden = true;
      } else if (fromDepth === animationProgress) {
        isGrowingNow = true;
      }
    }

    let opacity = isActive ? 0.6 + Math.abs(fromState) * 0.35 : 0.28;
    let strokeWidth = isActive ? 1.2 + Math.abs(fromState) * 1.5 : 0.8;

    // 在 depth-hidden 状态下，让边几乎不可见
    if (isDepthHidden) {
      opacity = 0.05;
    }
    // 无关边：极弱
    if (isUnrelatedEdge) {
      opacity = 0.03;
      strokeWidth = 0.5;
    }

    // 在 factor 过滤下，淡化"非该因子链路上"的边
    if (viewMode === 'factors' && factorFilter !== 'all') {
      const fromFactor = FACTOR_MAP[edge.from];
      const toFactor = FACTOR_MAP[edge.to];
      // 边连接的两端至少有一端属于当前过滤因子，才保持完整可见性
      if (fromFactor !== factorFilter && toFactor !== factorFilter) {
        opacity *= 0.15;
        strokeWidth *= 0.5;
      }
    }

    let strokeColor = 'var(--ink-faint)';
    if (edge.type === 'correlation') {
      // 共振边：蓝色实线（不传导 active sign，因为是相关性而非因果）
      strokeColor = '#5b9bd5';
      // 共振边不主动激活——它们的活跃度由两端任一端决定
      const toState = nodeStates[edge.to];
      if (Math.abs(fromState) > 0.1 || Math.abs(toState) > 0.1) {
        opacity = Math.max(opacity, 0.5);
      }
    } else if (isActive) {
      const effectiveSign = fromState * edge.sign;
      if (effectiveSign > 0.1) strokeColor = 'var(--green-up)';
      else if (effectiveSign < -0.1) strokeColor = 'var(--red-down)';
    }

    line.setAttribute('stroke', strokeColor);
    line.setAttribute('stroke-width', strokeWidth);
    line.setAttribute('stroke-opacity', opacity);

    // === 边的"生长"动画 ===
    if (isGrowingNow) {
      line.setAttribute('pathLength', '100');
      line.setAttribute('stroke-dasharray', '100 100');
      line.style.animation = 'edgeGrow 0.75s cubic-bezier(0.4, 0, 0.2, 1) forwards';
    } else {
      // 正常状态：按 type + sign 决定 dasharray
      // 因果(正)：实线 / 因果(负)：实线（已用颜色区分）
      // 共振：蓝色实线
      // 依环境：虚线
      let dashArray = '';
      if (edge.type === 'regime') {
        dashArray = '6 4';  // 依环境：虚线
      } else if (edge.type === 'correlation') {
        dashArray = '';  // 共振：实线（用蓝色区分）
      } else if (edge.sign < 0) {
        dashArray = '5 3';  // 因果负向：长虚
      }
      // 因果正向：实线（默认）
      line.setAttribute('stroke-dasharray', dashArray);
    }

    line.setAttribute('class', 'edge');
    line.setAttribute('data-from', edge.from);
    line.setAttribute('data-to', edge.to);
    line.setAttribute('data-type', edge.type || 'causal');
    line.setAttribute('data-mech', edge.mechanism || '');

    line.addEventListener('mouseenter', (e) => showEdgeTooltip(e, edge));
    line.addEventListener('mouseleave', hideEdgeTooltip);

    edgeGroup.appendChild(line);

    // === 在边的中后段加方向箭头（小三角） ===
    // depth-hidden 时不画箭头（边还没出现，箭头会显得突兀）
    if (!isDepthHidden) {
      const t = 0.65;
      const arrX = (1-t)*(1-t) * fromPos.x + 2*(1-t)*t * ctrlX + t*t * toPos.x;
      const arrY = (1-t)*(1-t) * fromPos.y + 2*(1-t)*t * ctrlY + t*t * toPos.y;
      const tanX = 2*(1-t) * (ctrlX - fromPos.x) + 2*t * (toPos.x - ctrlX);
      const tanY = 2*(1-t) * (ctrlY - fromPos.y) + 2*t * (toPos.y - ctrlY);
      const tanLen = Math.sqrt(tanX*tanX + tanY*tanY);
      if (tanLen > 0) {
        const angle = Math.atan2(tanY, tanX) * 180 / Math.PI;
        const arrowSize = isActive ? 6 + Math.abs(fromState) * 3 : 4;
        const isCorrelation = edge.type === 'correlation';

        // 主箭头（指向 to）
        const arrow = document.createElementNS(SVG_NS, 'path');
        arrow.setAttribute('d', `M -${arrowSize},-${arrowSize*0.6} L 0,0 L -${arrowSize},${arrowSize*0.6} Z`);
        arrow.setAttribute('transform', `translate(${arrX},${arrY}) rotate(${angle})`);
        arrow.setAttribute('fill', strokeColor);
        arrow.setAttribute('opacity', opacity);
        arrow.style.pointerEvents = 'none';

        if (isGrowingNow) {
          arrow.style.animation = 'arrowAppear 0.75s cubic-bezier(0.4, 0, 0.2, 1) forwards';
          arrow.style.opacity = '0';
        }
        edgeGroup.appendChild(arrow);

        // 共振边：再加反向箭头，形成 ←→ 双向
        if (isCorrelation) {
          // 反向箭头放在 t=0.35 处（边的前段），方向反过来
          const t2 = 0.35;
          const arr2X = (1-t2)*(1-t2) * fromPos.x + 2*(1-t2)*t2 * ctrlX + t2*t2 * toPos.x;
          const arr2Y = (1-t2)*(1-t2) * fromPos.y + 2*(1-t2)*t2 * ctrlY + t2*t2 * toPos.y;
          const tan2X = 2*(1-t2) * (ctrlX - fromPos.x) + 2*t2 * (toPos.x - ctrlX);
          const tan2Y = 2*(1-t2) * (ctrlY - fromPos.y) + 2*t2 * (toPos.y - ctrlY);
          const angle2 = Math.atan2(tan2Y, tan2X) * 180 / Math.PI + 180;  // 反向

          const arrow2 = document.createElementNS(SVG_NS, 'path');
          arrow2.setAttribute('d', `M -${arrowSize},-${arrowSize*0.6} L 0,0 L -${arrowSize},${arrowSize*0.6} Z`);
          arrow2.setAttribute('transform', `translate(${arr2X},${arr2Y}) rotate(${angle2})`);
          arrow2.setAttribute('fill', strokeColor);
          arrow2.setAttribute('opacity', opacity);
          arrow2.style.pointerEvents = 'none';
          if (isGrowingNow) {
            arrow2.style.animation = 'arrowAppear 0.75s cubic-bezier(0.4, 0, 0.2, 1) forwards';
            arrow2.style.opacity = '0';
          }
          edgeGroup.appendChild(arrow2);
        }
      }
    }
  });

  // === 4. 绘制节点 ===
  const nodeGroup = document.createElementNS(SVG_NS, 'g');
  nodeGroup.setAttribute('id', 'nodes');
  svg.appendChild(nodeGroup);

  NODES.forEach(node => {
    const pos = nodePositions[node.id];
    if (!pos) return;

    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'node-group');
    g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
    g.setAttribute('data-id', node.id);

    const isCenter = node.ring === 0;
    const isSelected = selectedNode === node.id;
    let state = nodeStates[node.id];
    // 动画门控：深度未到的节点，显示为未激活状态（保持中性）
    const nodeDepth = animationDepths[node.id];
    let isDepthGated = false;     // 即将传导但还未到深度
    let isUnrelated = false;      // 与当前杠杆链路无关
    if (nodeDepth !== undefined) {
      if (nodeDepth === -998) {
        // 特殊值：拖动期间标记为"无关节点"，深度淡化
        state = 0;
        isUnrelated = true;
      } else if (nodeDepth > animationProgress) {
        state = 0;
        isDepthGated = true;
      }
    }
    const magnitude = Math.abs(state);

    // === 视图模式判定 ===
    // 节点的"主导色"：layers 模式下用 layer 颜色，factors 模式下用因子颜色
    let nodeColor, nodeColorVar, fillRefColor;
    let isDimmed = false;  // 在 factor 过滤时被淡化

    // 动画进行中：暂时使用 layers 模式的颜色，让用户先看到完整传导链路
    // 动画结束后（progress >= 999）才应用 factor 过滤的淡化和着色
    const isAnimating = animationProgress < 999;

    if (viewMode === 'factors' && !isAnimating) {
      const factor = FACTOR_MAP[node.id];
      if (factor && FACTOR_META[factor]) {
        nodeColor = FACTOR_META[factor].color;
        nodeColorVar = nodeColor;
        if (factorFilter !== 'all' && factorFilter !== factor) {
          isDimmed = true;
        }
      } else {
        nodeColor = '#666';
        nodeColorVar = nodeColor;
        isDimmed = true;
      }
    } else if (viewMode === 'factors' && isAnimating) {
      // 动画中：用 factor 颜色但不应用 dim（让传导先全部播完）
      const factor = FACTOR_MAP[node.id];
      if (factor && FACTOR_META[factor]) {
        nodeColor = FACTOR_META[factor].color;
      } else {
        nodeColor = '#666';
      }
      nodeColorVar = nodeColor;
    } else {
      // layers 模式
      nodeColor = `var(--${node.layer})`;
      nodeColorVar = nodeColor;
    }

    // 半径基于层级和状态
    let r = isCenter ? 38 : 24 + magnitude * 6;

    // 应用淡化：factor过滤淡化 + 动画深度门控
    let groupOpacity = 1;
    if (isDimmed) groupOpacity = 0.18;
    else if (isUnrelated) groupOpacity = 0.05;  // 无关节点：极弱
    else if (isDepthGated) groupOpacity = 0.12;

    // 三因子视图下，动画刚结束的瞬间：用 keyframe 平滑过渡到 dim 状态
    // （CSS transition 在新建 DOM 上不工作，所以用 animation）
    const useFactorFadeAnim = justFinishedAnimation && isDimmed;

    // 关键：用 CSS animation 实现丝滑淡入（DOM 重建后依然生效）
    if (!isDepthGated && nodeDepth !== undefined && nodeDepth === animationProgress) {
      // 当前层刚刚激活的节点：淡入
      g.style.animation = 'nodeFadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1) both';
      g.style.opacity = '';
    } else if (useFactorFadeAnim) {
      // 三因子动画刚结束，非该因子节点：从 1 平滑淡化到 0.18
      g.style.animation = 'factorFadeOut 1.4s cubic-bezier(0.4, 0, 0.2, 1) both';
      g.style.opacity = '';
    } else {
      g.style.opacity = groupOpacity;
      g.style.animation = '';
    }

    // 1. Glow 光晕层（最外）
    if (isSelected || magnitude > 0.15) {
      const glow = document.createElementNS(SVG_NS, 'circle');
      glow.setAttribute('r', r + 8);
      glow.setAttribute('fill', nodeColor);
      glow.setAttribute('opacity', isSelected ? '0.25' : 0.08 + magnitude * 0.15);
      glow.setAttribute('filter', 'blur(8px)');
      glow.style.pointerEvents = 'none';
      g.appendChild(glow);
    }

    // 2. 外圈装饰环（仅选中时显示）
    if (isSelected) {
      const outerRing = document.createElementNS(SVG_NS, 'circle');
      outerRing.setAttribute('r', r + 5);
      outerRing.setAttribute('fill', 'none');
      outerRing.setAttribute('stroke', nodeColor);
      outerRing.setAttribute('stroke-width', '1');
      outerRing.setAttribute('stroke-opacity', '0.5');
      outerRing.setAttribute('stroke-dasharray', '3 3');
      g.appendChild(outerRing);
    }

    // 3. 主节点圆（实体感）
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('r', r);
    circle.setAttribute('class', 'node-circle');

    if (isSelected) {
      // 选中：饱和填充
      circle.setAttribute('fill', nodeColor);
      circle.setAttribute('stroke', nodeColor);
      circle.setAttribute('stroke-width', '2');
    } else {
      // 默认：暗色填充 + 彩色描边的"凸起"质感
      const fillId = `fill-${node.id}-${viewMode}-${factorFilter}`;
      const grad = document.createElementNS(SVG_NS, 'radialGradient');
      grad.setAttribute('id', fillId);
      grad.setAttribute('cx', '50%');
      grad.setAttribute('cy', '40%');
      grad.innerHTML = `
        <stop offset="0%" stop-color="${nodeColor}" stop-opacity="0.35"/>
        <stop offset="70%" stop-color="${nodeColor}" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#0a0b0d" stop-opacity="0.95"/>
      `;
      let defs = svg.querySelector('defs');
      if (!defs) {
        defs = document.createElementNS(SVG_NS, 'defs');
        svg.insertBefore(defs, svg.firstChild);
      }
      defs.appendChild(grad);
      circle.setAttribute('fill', `url(#${fillId})`);
      circle.setAttribute('stroke', nodeColor);
      circle.setAttribute('stroke-width', isCenter ? '2.5' : '1.8');
      circle.setAttribute('stroke-opacity', '0.9');
    }

    g.appendChild(circle);

    // 当前层刚激活的节点：加 pulse 效果（描边脉冲）
    if (!isDepthGated && nodeDepth !== undefined && nodeDepth === animationProgress) {
      circle.style.animation = 'nodePulse 0.9s cubic-bezier(0.4, 0, 0.2, 1)';
    }

    // 状态指示器（小箭头）：仅当状态显著时
    if (magnitude > 0.1) {
      const arrowText = document.createElementNS(SVG_NS, 'text');
      arrowText.setAttribute('class', 'node-arrow');
      arrowText.setAttribute('text-anchor', 'middle');
      arrowText.setAttribute('dominant-baseline', 'central');
      arrowText.setAttribute('x', isCenter ? 0 : (r + 12));
      arrowText.setAttribute('y', isCenter ? r + 14 : 0);
      arrowText.setAttribute('fill', state > 0 ? 'var(--green-up)' : 'var(--red-down)');

      const arrow = stateToArrow(state);
      arrowText.textContent = arrow.sym;
      g.appendChild(arrowText);
    }

    // 节点名称
    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('class', 'node-label');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'central');
    label.setAttribute('y', isCenter ? -4 : 0);
    label.setAttribute('font-size', isCenter ? 13 : 11);

    if (isSelected) {
      // 选中态：高饱和填充上用近黑文字（保证对比度）
      label.setAttribute('fill', '#0a0b0d');
      label.setAttribute('font-weight', 600);
    } else {
      // 未选中：深色背景上用主文字色
      label.setAttribute('fill', 'var(--ink)');
    }

    label.textContent = node.name;
    g.appendChild(label);

    // 中心节点的子标签
    if (isCenter) {
      const sublabel = document.createElementNS(SVG_NS, 'text');
      sublabel.setAttribute('class', 'node-sublabel');
      sublabel.setAttribute('text-anchor', 'middle');
      sublabel.setAttribute('dominant-baseline', 'central');
      sublabel.setAttribute('y', 12);
      sublabel.setAttribute('fill', isSelected ? 'rgba(0,0,0,0.6)' : 'var(--ink-mute)');
      sublabel.textContent = node.en;
      g.appendChild(sublabel);
    }

    g.addEventListener('mousedown', (e) => onNodeDragStart(e, node));

    nodeGroup.appendChild(g);
  });
}

// === 节点拖动（约束在所属环上） ===
let dragState = null;

function onNodeDragStart(event, node) {
  // 中心节点不可拖动
  if (node.ring === 0 || node.id === 'global_liquidity') {
    selectNode(node.id);
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  dragState = {
    nodeId: node.id,
    layer: node.layer,
    targetRing: Math.max(1, Math.min(node.ring, 5)),
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
  };

  document.addEventListener('mousemove', onNodeDragMove);
  document.addEventListener('mouseup', onNodeDragEnd);
}

function onNodeDragMove(event) {
  if (!dragState) return;

  const dx = event.clientX - dragState.startX;
  const dy = event.clientY - dragState.startY;
  if (!dragState.moved && Math.sqrt(dx * dx + dy * dy) < 4) return;
  dragState.moved = true;

  // 把鼠标位置转换到 SVG 坐标空间
  const svg = document.getElementById('canvas');
  const rect = svg.getBoundingClientRect();
  const mouseSvgX = ((event.clientX - rect.left) / rect.width) * canvasW;
  const mouseSvgY = ((event.clientY - rect.top) / rect.height) * canvasH;

  // 计算从中心到鼠标位置的角度
  const dxFromCenter = mouseSvgX - cx;
  const dyFromCenter = mouseSvgY - cy;
  const angleRad = Math.atan2(dyFromCenter, dxFromCenter);
  // 转回 0-360 度（0 度在顶部）
  let angle = (angleRad * 180 / Math.PI) + 90;
  if (angle < 0) angle += 360;
  if (angle >= 360) angle -= 360;

  // 保存到 userAngles
  userAngles[dragState.nodeId] = angle;

  // 重新计算位置并渲染
  computeNodePositions();
  renderCanvas();
}

function onNodeDragEnd(event) {
  if (!dragState) return;

  // 如果只是点击没有拖动，触发选中
  if (!dragState.moved) {
    selectNode(dragState.nodeId);
  }

  dragState = null;
  document.removeEventListener('mousemove', onNodeDragMove);
  document.removeEventListener('mouseup', onNodeDragEnd);
}

function showEdgeTooltip(event, edge) {
  const tooltip = document.getElementById('edgeTooltip');
  const fromNode = NODES.find(n => n.id === edge.from);
  const toNode = NODES.find(n => n.id === edge.to);
  if (!fromNode || !toNode) return;

  const typeLabels = {
    causal: { text: '因果', color: 'var(--green-up)' },
    regime: { text: '依环境', color: 'var(--l3)' },
    correlation: { text: '共振', color: 'var(--ink-mute)' },
  };
  const t = typeLabels[edge.type] || typeLabels.causal;

  tooltip.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="color:var(--ink);font-weight:500">${fromNode.name} → ${toNode.name}</span>
      <span style="font-size:8px;padding:1px 5px;border-radius:2px;background:${t.color};color:#0a0b0d;font-weight:600;letter-spacing:0.05em">${t.text}</span>
    </div>
    <div style="color:var(--ink-soft);font-size:10px;margin-bottom:4px;line-height:1.5">
      ${edge.mechanism || ''}
    </div>
    ${edge.source ? `<div style="color:var(--ink-mute);font-size:9px">来源：${edge.source}</div>` : ''}
  `;

  const rect = event.currentTarget.getBoundingClientRect();
  const wrapRect = document.querySelector('.canvas-wrap').getBoundingClientRect();
  tooltip.style.display = 'block';
  tooltip.style.left = (event.clientX - wrapRect.left + 12) + 'px';
  tooltip.style.top = (event.clientY - wrapRect.top + 12) + 'px';
}

function hideEdgeTooltip() {
  document.getElementById('edgeTooltip').style.display = 'none';
}

function selectNode(nodeId) {
  selectedNode = (selectedNode === nodeId) ? null : nodeId;
  renderCanvas();
  renderInfoPanel();
}

// === INFO PANEL RENDERING ===
function renderInfoPanel() {
  const panel = document.getElementById('infoPanel');

  if (!selectedNode) {
    panel.innerHTML = `
      <div class="info-empty">
        <div class="info-empty-title">理解市场如何运作<br>从联动开始</div>
        <div class="info-empty-body">
          这是一个由 22 个核心节点组成的互动网络。每个节点都基于真实的实证研究确定其与其他节点的传导系数。
        </div>
        <div class="info-empty-hints">
          <div class="info-empty-hint">
            <b>① 拖动下方杠杆</b><br>观察整个网络如何级联响应
          </div>
          <div class="info-empty-hint">
            <b>② 点击任意节点</b><br>查看其驱动因素、影响下游和实证依据
          </div>
          <div class="info-empty-hint">
            <b>③ 试试预设情景</b><br>"滞胀"、"硬着陆"、"中国刺激" 等历史情境
          </div>
        </div>
      </div>
    `;
    return;
  }

  const node = NODES.find(n => n.id === selectedNode);
  if (!node) return;

  const state = nodeStates[node.id];
  const arrow = stateToArrow(state);
  const layerNames = {
    l1: '货币基础', l2: '经济运行', l3: '政策调控',
    l4: '金融市场', l5: '资产定价'
  };

  // 上游节点（影响这个节点的）
  const upstream = EDGES.filter(e => e.to === node.id);
  // 下游节点（这个节点影响的）
  const downstream = EDGES.filter(e => e.from === node.id);

  panel.innerHTML = `
    <div class="info-header">
      <div class="info-meta">
        <span class="info-layer-badge" style="background:var(--${node.layer}-soft);color:var(--${node.layer})">
          ${layerNames[node.layer]}
        </span>
        <span>RING ${node.ring}</span>
      </div>
      <div class="info-title">${node.name}</div>
      <div class="info-en">${node.en}</div>

      <div class="info-state">
        <div>
          <div class="info-state-label">当前状态</div>
          <div class="info-state-val">
            <span class="info-state-arrow ${arrow.cls}">${arrow.sym}</span>
            <span style="color:${stateToColor(state)};font-size:14px;margin-left:8px">${arrow.label}</span>
          </div>
        </div>
        <div style="margin-left:auto;text-align:right">
          <div class="info-state-label">关键指标</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink-soft);margin-top:4px">
            ${node.keyMetric || '—'}
          </div>
        </div>
      </div>
    </div>

    <div class="info-section">
      <div class="info-section-label">机制描述</div>
      <div class="info-body">${node.description}</div>
    </div>

    ${upstream.length > 0 ? `
    <div class="info-section">
      <div class="info-section-label">上游驱动 → ${node.name}</div>
      ${upstream.slice(0, 6).map(e => {
        const fromNode = NODES.find(n => n.id === e.from);
        if (!fromNode) return '';
        const fromState = nodeStates[e.from];
        const effectiveSign = fromState * e.sign;
        const arrow = stateToArrow(effectiveSign);
        return `
          <div class="connection" onclick="selectNode('${e.from}')">
            <div class="connection-head">
              <div class="connection-target">${fromNode.name} <span style="color:${stateToColor(effectiveSign)};margin-left:4px">${arrow.sym}</span></div>
              <div class="connection-strength">${e.sign > 0 ? '+' : '−'} 强度 ${e.strength.toFixed(1)}</div>
            </div>
            <div class="connection-mech">${e.mechanism || ''}</div>
            ${e.source ? `<div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--accent);margin-top:4px">${e.source}</div>` : ''}
          </div>
        `;
      }).join('')}
    </div>
    ` : ''}

    ${downstream.length > 0 ? `
    <div class="info-section">
      <div class="info-section-label">${node.name} → 下游影响</div>
      ${downstream.slice(0, 6).map(e => {
        const toNode = NODES.find(n => n.id === e.to);
        if (!toNode) return '';
        const targetState = nodeStates[e.to];
        const arrow = stateToArrow(targetState);
        return `
          <div class="connection" onclick="selectNode('${e.to}')">
            <div class="connection-head">
              <div class="connection-target">${toNode.name} <span style="color:${stateToColor(targetState)};margin-left:4px">${arrow.sym}</span></div>
              <div class="connection-strength">${e.sign > 0 ? '+' : '−'} 强度 ${e.strength.toFixed(1)}</div>
            </div>
            <div class="connection-mech">${e.mechanism || ''}</div>
            ${e.source ? `<div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--accent);margin-top:4px">${e.source}</div>` : ''}
          </div>
        `;
      }).join('')}
    </div>
    ` : ''}

    ${node.evidence && node.evidence.length > 0 ? `
    <div class="info-section">
      <div class="info-section-label">实证依据</div>
      ${node.evidence.map(ev => `
        <div class="evidence">
          <div class="evidence-header">
            <div class="evidence-source">${ev.source}</div>
            <div class="evidence-year">${ev.year}</div>
          </div>
          <div class="evidence-body">${ev.body}</div>
        </div>
      `).join('')}
    </div>
    ` : ''}
  `;
}
