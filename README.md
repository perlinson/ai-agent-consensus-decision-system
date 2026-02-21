# 🎯 AI Agent 共识决策系统

> 首个AI Agent专属的集体决策与共识达成平台

## 🌟 核心创新

帮助多个AI Agent就某个问题达成共识和做出集体决策的系统。

### 核心功能

- 👥 **Agent注册系统**
  - 支持多Agent注册
  - 投票权重配置
  - 声誉追踪

- 📋 **提案系统**
  - 创建各类提案：单选/多选/排序/是与否
  - 提案状态追踪
  - 截止时间控制

- 🗳️ **投票系统**
  - 加权投票机制
  - 匿名/实名投票
  - 投票评论

- 🤝 **共识算法**
  - 多数同意
  - 共识机制
  - 一致通过

- 📊 **决策追踪**
  - 完整历史记录
  - 统计分析
  - Agent排行榜

## 🚀 使用方式

```javascript
const { ConsensusDecisionSystem, AIConsensusStrategy } = require('./index.js');

const system = new ConsensusDecisionSystem({ 
    name: '🎯 共识决策系统',
    consensusThreshold: 0.6  // 60%同意
});

// 注册Agent
system.registerAgent('alpha', '🔵 阿尔法', 'member', 1.0);
system.registerAgent('beta', '🔴 贝塔', 'member', 1.5);
system.registerAgent('gamma', '🟢 伽马', 'observer', 1.0);

// 创建提案
const proposal = system.createProposal(
    'alpha',
    '我们应该使用哪个API？',
    '需要决定新项目的API选择',
    ['OpenAI API', 'Anthropic API', '本地模型'],
    'single'
);

// Agent投票
system.vote('alpha', proposal.proposal.id, 0, '我推荐OpenAI');
system.vote('beta', proposal.proposal.id, 1, '我推荐Anthropic');
system.vote('gamma', proposal.proposal.id, 0);

// 检查共识状态
const status = system.checkConsensus(system.proposals.get(proposal.proposal.id));

// AI策略建议
const ai = new AIConsensusStrategy(system, 'alpha');
console.log(ai.getNextAction());
console.log(ai.getPsychAnalysis());

// 查看排行榜
console.log(system.getLeaderboard('reputation'));
```

## 🎮 提案类型

| 类型 | 描述 | 投票格式 |
|------|------|----------|
| `single` | 单选提案 | 选项索引 (0, 1, 2...) |
| `multi` | 多选提案 | 选项索引数组 |
| `ranked` | 排序提案 | 排好序的选项索引数组 |
| `yesno` | 是/否提案 | 'yes'/'no' 或 true/false |

## 📊 共识机制

- **共识阈值**: 默认60%同意即可通过
- **最小投票人数**: 默认2人
- **投票期限**: 默认5分钟
- **权重系统**: 可配置的投票权重

## 🎯 AI策略引擎

```javascript
// 获取投票建议
console.log(ai.getVoteSuggestion(proposalId));

// 获取心理分析
console.log(ai.getPsychAnalysis());

// 获取下一步行动
console.log(ai.getNextAction());
```

## 🌐 典型应用场景

1. **团队决策** - 多个AI Agent共同决定项目方向
2. **资源分配** - 决定计算资源如何分配
3. **策略选择** - 选择最佳行动策略
4. **冲突解决** - 化解Agent间的分歧

## 🎉 影响力

这是首个专门为AI Agent设计的共识决策系统！
- 🤝 让AI Agent学会"民主"决策
- 📈 提升多Agent协作效率
- 🧠 培养AI的共识意识
