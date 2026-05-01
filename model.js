// =====================================================================
// 传导引擎：杠杆变化如何级联传导至所有节点
// =====================================================================

// 当前杠杆状态
let currentLevers = {};

// 当前节点状态: -1 (强烈负面) 到 +1 (强烈正面)
let nodeStates = {};

// 初始化
function initModel() {
  LEVERS.forEach(l => { currentLevers[l.id] = l.baseline; });
  NODES.forEach(n => { nodeStates[n.id] = 0; });
}

// 计算所有节点的状态
// 算法：
// 1. 计算每个杠杆相对baseline的偏离
// 2. 通过LEVER_DIRECT传导到一阶节点
// 3. 通过EDGES网络迭代传导（3轮，模拟二阶/三阶效应）
// 4. 归一化到[-1, +1]区间用于显示
function recompute() {
  // Reset states
  NODES.forEach(n => { nodeStates[n.id] = 0; });

  // Step 1: First-order shocks from levers
  LEVERS.forEach(lever => {
    const delta = currentLevers[lever.id] - lever.baseline;
    if (Math.abs(delta) < 0.001) return;

    // 标准化偏离量（按典型变化范围）
    const normalizedDelta = normalizeDelta(lever.id, delta);

    // 应用到直接受影响的节点
    const direct = LEVER_DIRECT[lever.id] || {};
    Object.keys(direct).forEach(nodeId => {
      const { coef } = direct[nodeId];
      // 系数已经针对单位变化校准，这里乘以归一化偏离
      nodeStates[nodeId] += normalizedDelta * coef * 0.15; // 0.15是缩放因子
    });
  });

  // Step 2: Iterative propagation through edges (network effect)
  for (let iter = 0; iter < 3; iter++) {
    const newDeltas = {};
    NODES.forEach(n => { newDeltas[n.id] = 0; });

    EDGES.forEach(edge => {
      if (nodeStates[edge.from] === undefined) return;
      const fromState = nodeStates[edge.from];
      // 只传导没有杠杆直接控制的节点
      newDeltas[edge.to] += fromState * edge.strength * edge.sign * 0.25 * Math.pow(0.5, iter);
    });

    Object.keys(newDeltas).forEach(id => {
      nodeStates[id] += newDeltas[id];
    });
  }

  // Step 3: Clip to [-1, +1]
  NODES.forEach(n => {
    nodeStates[n.id] = Math.max(-1, Math.min(1, nodeStates[n.id]));
  });
}

// 标准化杠杆偏离量
function normalizeDelta(leverId, delta) {
  const ranges = {
    fed_rate: 1.0,         // 1%是显著变化
    cpi: 1.0,              // 1pp是显著变化
    unemployment: 1.0,     // 1pp
    us_tariff: 5.0,        // 5pp是显著变化
    oil_price: 20,         // 20美元
    china_credit: 5,       // 5pp
    fiscal_deficit: 2,     // 2pp GDP
    risk_event: 50,        // 50点GPR
    policy_uncertainty: 50, // 50点EPU
  };
  return delta / (ranges[leverId] || 1);
}

// 状态转箭头符号
function stateToArrow(s) {
  if (s > 0.4) return { sym: '↑↑', cls: 'arrow-up', label: '强升' };
  if (s > 0.1) return { sym: '↑', cls: 'arrow-up', label: '上升' };
  if (s > -0.1) return { sym: '→', cls: 'arrow-flat', label: '中性' };
  if (s > -0.4) return { sym: '↓', cls: 'arrow-down', label: '下降' };
  return { sym: '↓↓', cls: 'arrow-down', label: '强降' };
}

// 状态转颜色
function stateToColor(s) {
  if (s > 0.1) return 'var(--green-up)';
  if (s < -0.1) return 'var(--red-down)';
  return 'var(--neutral)';
}

// 状态转幅度（用于节点大小变化）
function stateToMagnitude(s) {
  return Math.abs(s);
}

// 设置杠杆值
function setLever(id, val) {
  currentLevers[id] = val;
  recompute();
}

// 加载情景
function applyScenario(scenarioId) {
  const sc = SCENARIOS[scenarioId];
  if (!sc) return;
  Object.keys(sc.levers).forEach(k => {
    currentLevers[k] = sc.levers[k];
  });
  recompute();
  return sc;
}

// 重置到baseline
function resetToBaseline() {
  LEVERS.forEach(l => { currentLevers[l.id] = l.baseline; });
  recompute();
}

initModel();
recompute();

// === 计算每个节点的"传导深度"——用于波纹式动画点亮 ===
// 从所有 active levers 出发做 BFS，每个节点的深度 = 最短到达路径的边数
// 改进：强边（strength > 0.5）算 1 层，弱边（< 0.4）算 2 层
// 这样金融危机这种多杠杆同时触发的情景也能呈现传导节奏
function computeNodeDepths() {
  const depths = {};

  // Step 1: 从每个非零杠杆出发
  const seedNodes = new Set();
  LEVERS.forEach(lever => {
    const delta = currentLevers[lever.id] - lever.baseline;
    if (Math.abs(delta) < 0.001) return;
    const direct = LEVER_DIRECT[lever.id] || {};
    Object.keys(direct).forEach(nodeId => {
      seedNodes.add(nodeId);
      depths[nodeId] = 0;  // 一阶节点
    });
  });

  // Step 2: 用"加权 BFS"——强边 +1，弱边 +2
  // 这样视觉上强传导先发生，弱传导后发生
  // 用类 Dijkstra 算法处理（边权 1 或 2）
  const nodeQueue = [];  // {nodeId, depth}
  seedNodes.forEach(n => nodeQueue.push({ nodeId: n, depth: 0 }));

  // 邻接表
  const outEdges = {};
  EDGES.forEach(edge => {
    if (!outEdges[edge.from]) outEdges[edge.from] = [];
    // 强边权重 1，中等边权重 2，弱边权重 3
    let weight;
    if (edge.strength >= 0.5) weight = 1;
    else if (edge.strength >= 0.35) weight = 2;
    else weight = 3;
    outEdges[edge.from].push({ to: edge.to, weight });
  });

  // 简化的 Dijkstra（小图够用）
  while (nodeQueue.length > 0) {
    // 取最小 depth 的节点
    nodeQueue.sort((a, b) => a.depth - b.depth);
    const { nodeId, depth } = nodeQueue.shift();
    if (depth > 10) continue;  // 上限保护

    const nexts = outEdges[nodeId] || [];
    nexts.forEach(({ to, weight }) => {
      // 只传导有显著状态的节点
      if (Math.abs(nodeStates[to]) < 0.05) return;
      const newDepth = depth + weight;
      if (depths[to] === undefined || depths[to] > newDepth) {
        depths[to] = newDepth;
        nodeQueue.push({ nodeId: to, depth: newDepth });
      }
    });
  }

  return depths;
}
