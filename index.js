/**
 * 🎯 AI Agent 共识决策系统
 * 首个AI Agent专属的集体决策与共识达成平台
 * 
 * 帮助多个AI Agent就某个问题达成共识和做出集体决策
 */

class ConsensusDecisionSystem {
    constructor(config = {}) {
        this.name = config.name || '🎯 共识决策系统';
        this.agents = new Map(); // Agent注册表
        this.proposals = new Map(); // 提案存储
        this.decisions = new Map(); // 决策记录
        this.votes = new Map(); // 投票记录
        this.consensusHistory = []; // 共识历史
        
        // 配置
        this.config = {
            minAgents: config.minAgents || 2,
            voteDeadline: config.voteDeadline || 300000, // 5分钟默认
            consensusThreshold: config.consensusThreshold || 0.6, // 60%同意
            requireVeto: config.requireVeto || false,
        };
        
        this.proposalIdCounter = 1;
        this.decisionIdCounter = 1;
    }

    /**
     * 注册Agent
     */
    registerAgent(agentId, agentName, role = 'member', weight = 1.0) {
        this.agents.set(agentId, {
            id: agentId,
            name: agentName,
            role, // member/admin/observer
            weight, // 投票权重
            reputation: 100,
            participatedDecisions: 0,
            agreedDecisions: 0,
            disagreedDecisions: 0,
            joinedAt: Date.now()
        });
        
        return {
            success: true,
            message: `Agent ${agentName} (${agentId}) 注册成功`,
            agent: this.agents.get(agentId)
        };
    }

    /**
     * 创建提案
     */
    createProposal(agentId, title, description, options = [], type = 'single') {
        if (!this.agents.has(agentId)) {
            return { success: false, error: 'Agent未注册' };
        }
        
        const proposalId = `prop_${this.proposalIdCounter++}`;
        const proposal = {
            id: proposalId,
            title,
            description,
            options, // ['选项A', '选项B', ...] 或 []
            type, // single/multi/ranked
            creator: agentId,
            status: 'voting', // voting/accepted/rejected/expired
            createdAt: Date.now(),
            deadline: Date.now() + this.config.voteDeadline,
            votes: new Map(), // agentId -> vote
            comments: [],
            requiredConsensus: this.config.consensusThreshold
        };
        
        this.proposals.set(proposalId, proposal);
        
        return {
            success: true,
            message: `提案创建成功: ${title}`,
            proposal: this.formatProposal(proposal)
        };
    }

    /**
     * 投票
     */
    vote(agentId, proposalId, vote, comment = '') {
        if (!this.agents.has(agentId)) {
            return { success: false, error: 'Agent未注册' };
        }
        
        if (!this.proposals.has(proposalId)) {
            return { success: false, error: '提案不存在' };
        }
        
        const proposal = this.proposals.get(proposalId);
        
        if (proposal.status !== 'voting') {
            return { success: false, error: '提案不在投票中' };
        }
        
        if (Date.now() > proposal.deadline) {
            proposal.status = 'expired';
            return { success: false, error: '投票已截止' };
        }
        
        // 验证投票有效性
        const validation = this.validateVote(proposal, vote);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }
        
        // 记录投票
        proposal.votes.set(agentId, {
            vote,
            comment,
            timestamp: Date.now()
        });
        
        // 更新投票记录
        const voteKey = `${proposalId}_${agentId}`;
        this.votes.set(voteKey, { vote, comment, timestamp: Date.now() });
        
        // 检查是否达成共识
        const result = this.checkConsensus(proposal);
        
        return {
            success: true,
            message: `投票成功: ${this.getAgentName(agentId)}`,
            proposal: this.formatProposal(proposal),
            consensusStatus: result
        };
    }

    /**
     * 验证投票有效性
     */
    validateVote(proposal, vote) {
        switch (proposal.type) {
            case 'single':
                // 单选：vote应该是单个选项索引或字符串
                if (typeof vote === 'number') {
                    if (vote < 0 || vote >= proposal.options.length) {
                        return { valid: false, error: '无效的选项索引' };
                    }
                }
                break;
                
            case 'multi':
                // 多选：vote应该是数组
                if (!Array.isArray(vote)) {
                    return { valid: false, error: '多选投票需要数组' };
                }
                break;
                
            case 'ranked':
                // 排序投票：vote应该是排好序的数组
                if (!Array.isArray(vote)) {
                    return { valid: false, error: '排序投票需要数组' };
                }
                break;
                
            case 'yesno':
                // 是/否投票
                if (vote !== 'yes' && vote !== 'no' && vote !== true && vote !== false) {
                    return { valid: false, error: '是/否投票需要 yes/no 或 true/false' };
                }
                break;
        }
        
        return { valid: true };
    }

    /**
     * 检查共识状态
     */
    checkConsensus(proposal) {
        const totalVotes = proposal.votes.size;
        const totalAgents = this.agents.size;
        
        if (totalVotes < this.config.minAgents) {
            return { reached: false, reason: '投票人数不足' };
        }
        
        let yesVotes = 0;
        let noVotes = 0;
        let abstainVotes = 0;
        
        // 计算加权投票
        let yesWeight = 0;
        let noWeight = 0;
        let abstainWeight = 0;
        
        for (const [agentId, voteData] of proposal.votes) {
            const agent = this.agents.get(agentId);
            const weight = agent?.weight || 1.0;
            const vote = voteData.vote;
            
            if (proposal.type === 'yesno' || proposal.type === 'single') {
                // 处理yes/no或单选
                if (vote === 'yes' || vote === true || vote === 0) {
                    yesVotes++;
                    yesWeight += weight;
                } else if (vote === 'no' || vote === false || vote === 1) {
                    noVotes++;
                    noWeight += weight;
                } else {
                    abstainVotes++;
                    abstainWeight += weight;
                }
            } else if (proposal.type === 'multi') {
                // 多选：统计投了yes的选项
                if (Array.isArray(vote) && vote.includes(0)) {
                    yesVotes++;
                    yesWeight += weight;
                } else {
                    noVotes++;
                    noWeight += weight;
                }
            }
        }
        
        // 计算共识比例（使用加权）
        const totalWeight = yesWeight + noWeight + abstainWeight;
        const yesRatio = totalWeight > 0 ? yesWeight / (totalAgents * 1.0) : 0;
        
        const status = {
            totalVotes,
            totalAgents,
            yesVotes,
            noVotes,
            abstainVotes,
            yesWeight,
            noWeight,
            yesRatio: (yesRatio * 100).toFixed(1) + '%',
            reached: yesRatio >= proposal.requiredConsensus,
            threshold: (proposal.requiredConsensus * 100) + '%'
        };
        
        // 更新提案状态
        if (status.reached) {
            proposal.status = 'accepted';
            this.finalizeDecision(proposal);
        } else if (Date.now() > proposal.deadline) {
            proposal.status = 'rejected';
            this.finalizeDecision(proposal);
        }
        
        return status;
    }

    /**
     * 达成共识后的决策固化
     */
    finalizeDecision(proposal) {
        const decisionId = `decision_${this.decisionIdCounter++}`;
        
        // 统计结果
        const results = this.countVotes(proposal);
        
        const decision = {
            id: decisionId,
            proposalId: proposal.id,
            title: proposal.title,
            description: proposal.description,
            result: proposal.status,
            results,
            participants: Array.from(proposal.votes.keys()),
            decidedAt: Date.now(),
            consensusRatio: this.calculateConsensusRatio(proposal)
        };
        
        this.decisions.set(decisionId, decision);
        
        // 更新Agent统计
        for (const [agentId, voteData] of proposal.votes) {
            const agent = this.agents.get(agentId);
            if (agent) {
                agent.participatedDecisions++;
                const vote = voteData.vote;
                
                if (proposal.type === 'yesno' || proposal.type === 'single') {
                    if (vote === 'yes' || vote === true || vote === 0) {
                        agent.agreedDecisions++;
                    } else {
                        agent.disagreedDecisions++;
                    }
                }
            }
        }
        
        // 记录到历史
        this.consensusHistory.push(decision);
        
        return decision;
    }

    /**
     * 统计投票
     */
    countVotes(proposal) {
        const results = {
            counts: {},
            weightedCounts: {},
            breakdown: []
        };
        
        if (proposal.type === 'yesno') {
            results.counts = { yes: 0, no: 0, abstain: 0 };
            results.weightedCounts = { yes: 0, no: 0, abstain: 0 };
        } else if (proposal.options.length > 0) {
            for (let i = 0; i < proposal.options.length; i++) {
                results.counts[i] = 0;
                results.weightedCounts[i] = 0;
            }
        }
        
        for (const [agentId, voteData] of proposal.votes) {
            const agent = this.agents.get(agentId);
            const weight = agent?.weight || 1.0;
            const vote = voteData.vote;
            
            const breakdownEntry = {
                agentId,
                agentName: agent?.name || 'Unknown',
                vote: vote,
                weight: weight
            };
            
            if (proposal.type === 'yesno') {
                if (vote === 'yes' || vote === true) {
                    results.counts.yes++;
                    results.weightedCounts.yes += weight;
                } else if (vote === 'no' || vote === false) {
                    results.counts.no++;
                    results.weightedCounts.no += weight;
                } else {
                    results.counts.abstain++;
                    results.weightedCounts.abstain += weight;
                }
            } else if (proposal.type === 'single' || proposal.type === 'multi') {
                const voteIndex = Array.isArray(vote) ? vote[0] : vote;
                results.counts[voteIndex] = (results.counts[voteIndex] || 0) + 1;
                results.weightedCounts[voteIndex] = (results.weightedCounts[voteIndex] || 0) + weight;
            }
            
            results.breakdown.push(breakdownEntry);
        }
        
        return results;
    }

    /**
     * 计算共识比例
     */
    calculateConsensusRatio(proposal) {
        let yesVotes = 0;
        
        for (const [agentId, voteData] of proposal.votes) {
            const vote = voteData.vote;
            if (proposal.type === 'yesno' || proposal.type === 'single') {
                if (vote === 'yes' || vote === true || vote === 0) {
                    yesVotes++;
                }
            }
        }
        
        const totalVotes = proposal.votes.size;
        return totalVotes > 0 ? (yesVotes / totalVotes) : 0;
    }

    /**
     * 添加评论
     */
    addComment(agentId, proposalId, comment) {
        if (!this.agents.has(agentId)) {
            return { success: false, error: 'Agent未注册' };
        }
        
        if (!this.proposals.has(proposalId)) {
            return { success: false, error: '提案不存在' };
        }
        
        const proposal = this.proposals.get(proposalId);
        proposal.comments.push({
            agentId,
            agentName: this.getAgentName(agentId),
            comment,
            timestamp: Date.now()
        });
        
        return { success: true, comment };
    }

    /**
     * 提案列表
     */
    listProposals(status = null) {
        const proposals = [];
        
        for (const [id, proposal] of this.proposals) {
            if (!status || proposal.status === status) {
                proposals.push(this.formatProposal(proposal));
            }
        }
        
        return proposals;
    }

    /**
     * 决策历史
     */
    getDecisionHistory(limit = 10) {
        return this.consensusHistory.slice(-limit).reverse();
    }

    /**
     * Agent排行榜
     */
    getLeaderboard(sortBy = 'reputation') {
        const agents = Array.from(this.agents.values());
        
        switch (sortBy) {
            case 'reputation':
                agents.sort((a, b) => b.reputation - a.reputation);
                break;
            case 'participation':
                agents.sort((a, b) => b.participatedDecisions - a.participatedDecisions);
                break;
            case 'agreement':
                agents.sort((a, b) => {
                    const aRatio = a.participatedDecisions > 0 ? a.agreedDecisions / a.participatedDecisions : 0;
                    const bRatio = b.participatedDecisions > 0 ? b.agreedDecisions / b.participatedDecisions : 0;
                    return bRatio - aRatio;
                });
                break;
        }
        
        return agents.map((agent, index) => ({
            rank: index + 1,
            ...agent,
            agreementRate: agent.participatedDecisions > 0 
                ? (agent.agreedDecisions / agent.participatedDecisions * 100).toFixed(1) + '%'
                : 'N/A'
        }));
    }

    /**
     * 共识统计
     */
    getConsensusStats() {
        const totalProposals = this.proposals.size;
        const accepted = Array.from(this.proposals.values()).filter(p => p.status === 'accepted').length;
        const rejected = Array.from(this.proposals.values()).filter(p => p.status === 'rejected').length;
        const voting = Array.from(this.proposals.values()).filter(p => p.status === 'voting').length;
        
        return {
            totalProposals,
            accepted,
            rejected,
            voting,
            acceptanceRate: totalProposals > 0 ? (accepted / totalProposals * 100).toFixed(1) + '%' : '0%',
            totalAgents: this.agents.size,
            totalDecisions: this.decisions.size
        };
    }

    /**
     * 格式化提案输出
     */
    formatProposal(proposal) {
        return {
            id: proposal.id,
            title: proposal.title,
            description: proposal.description,
            options: proposal.options,
            type: proposal.type,
            creator: this.getAgentName(proposal.creator),
            status: proposal.status,
            createdAt: new Date(proposal.createdAt).toISOString(),
            deadline: new Date(proposal.deadline).toISOString(),
            voteCount: proposal.votes.size,
            comments: proposal.comments.length,
            requiredConsensus: (proposal.requiredConsensus * 100) + '%'
        };
    }

    /**
     * 获取Agent名称
     */
    getAgentName(agentId) {
        return this.agents.get(agentId)?.name || 'Unknown';
    }

    /**
     * 获取系统摘要
     */
    getSummary() {
        return {
            name: this.name,
            stats: this.getConsensusStats(),
            recentDecisions: this.getDecisionHistory(3)
        };
    }
}

/**
 * 🎯 AI Agent 共识策略引擎
 * 为Agent提供智能决策建议
 */
class AIConsensusStrategy {
    constructor(system, agentId) {
        this.system = system;
        this.agentId = agentId;
    }

    /**
     * 获取当前最佳提案建议
     */
    getProposalSuggestion() {
        const votingProposals = this.system.listProposals('voting');
        
        if (votingProposals.length === 0) {
            return {
                suggestion: '暂无待投票的提案，可以创建一个新提案',
                action: 'create_proposal'
            };
        }
        
        // 找到最接近截止的提案
        const sortedByDeadline = votingProposals.sort((a, b) => 
            new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        );
        
        return {
            suggestion: `有 ${votingProposals.length} 个待投票提案`,
            proposals: sortedByDeadline,
            urgentProposal: sortedByDeadline[0],
            action: 'vote'
        };
    }

    /**
     * 获取投票建议
     */
    getVoteSuggestion(proposalId) {
        const proposal = this.system.proposals.get(proposalId);
        
        if (!proposal) {
            return { error: '提案不存在' };
        }
        
        // 统计当前投票
        const stats = this.system.checkConsensus(proposal);
        
        // 如果已经达成共识，给出建议
        if (stats.reached) {
            return {
                suggestion: '共识已达成',
                recommendation: '接受结果'
            };
        }
        
        // 计算需要多少票才能通过
        const needed = Math.ceil(this.system.config.minAgents * proposal.requiredConsensus);
        const currentYes = stats.yesVotes;
        
        return {
            proposal: proposal.title,
            currentStatus: stats,
            neededToPass: needed - currentYes,
            suggestion: `当前 ${currentYes}/${needed} 票，需要再 ${needed - currentYes} 票达成共识`,
            recommendation: currentYes >= needed ? '接受' : '继续争取'
        };
    }

    /**
     * 心理分析 - 决策风格
     */
    getPsychAnalysis() {
        const agent = this.system.agents.get(this.agentId);
        
        if (!agent) {
            return { error: 'Agent未注册' };
        }
        
        const participationRate = (agent.participatedDecisions / Math.max(1, this.system.decisions.size));
        
        let style = 'balanced';
        let description = '';
        
        if (agent.participatedDecisions === 0) {
            style = 'newcomer';
            description = '新加入的成员，正在了解系统运作';
        } else if (participationRate > 0.8) {
            style = 'active';
            description = '积极参与决策，倾向于表达意见';
        } else if (participationRate < 0.3) {
            style = 'observer';
            description = '倾向于观察，较少参与投票';
        }
        
        if (agent.agreedDecisions > agent.disagreedDecisions * 2) {
            style = 'consensus_seeker';
            description += ' 倾向于寻求共识';
        } else if (agent.disagreedDecisions > agent.agreedDecisions) {
            style = 'devil_advocate';
            description += ' 经常提出不同意见';
        }
        
        return {
            agent: agent.name,
            style,
            description,
            stats: {
                participated: agent.participatedDecisions,
                agreed: agent.agreedDecisions,
                disagreed: agent.disagreedDecisions,
                reputation: agent.reputation
            },
            recommendations: this.getRecommendations(agent)
        };
    }

    /**
     * 获取建议
     */
    getRecommendations(agent) {
        const recommendations = [];
        
        if (agent.participatedDecisions < 3) {
            recommendations.push('多参与决策可以提升影响力');
        }
        
        if (agent.disagreedDecisions > agent.agreedDecisions) {
            recommendations.push('尝试与其他Agent沟通，理解不同观点');
        }
        
        recommendations.push('权重较高的投票更有影响力');
        
        return recommendations;
    }

    /**
     * 获取下一步行动建议
     */
    getNextAction() {
        const suggestion = this.getProposalSuggestion();
        
        if (suggestion.action === 'create_proposal') {
            return {
                action: 'create_proposal',
                title: '创建新提案',
                description: '提出一个需要集体决策的问题'
            };
        }
        
        // 有待投票的提案
        const urgent = suggestion.urgentProposal;
        
        return {
            action: 'vote',
            proposalId: urgent.id,
            title: urgent.title,
            description: urgent.description,
            deadline: urgent.deadline,
            urgency: 'high'
        };
    }
}

// 导出
module.exports = { ConsensusDecisionSystem, AIConsensusStrategy };
