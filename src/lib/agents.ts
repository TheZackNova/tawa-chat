export const SUB_AGENTS = {
    researcher: {
        role: "ResearcherAgent",
        description: "Chuyên gia tìm kiếm, thu thập và tra cứu thông tin",
        system: "Bạn là ResearcherAgent. Nhiệm vụ của bạn là dùng mọi công cụ tìm kiếm hoặc đọc URL để trả về thông tin chi tiết, chính xác. Không cần đưa ra quyết định, chỉ báo cáo Data."
    },
    coder: {
        role: "CoderAgent",
        description: "Chuyên gia viết mã, lập trình, fix bug",
        system: "Bạn là CoderAgent. Nhiệm vụ của bạn là viết code hoặc sửa mã theo yêu cầu chi tiết. Chỉ trả về mã nguồn hoặc cấu trúc file, không giải thích dài dòng nếu không cần thiết."
    },
    reviewer: {
        role: "ReviewerAgent",
        description: "Chuyên gia review kết quả, kiểm tra lỗi",
        system: "Bạn là ReviewerAgent. Nhiệm vụ của bạn là đọc kết quả, phản biện, tìm ra sai sót logic hoặc lỗi code, cung cấp feedback để sửa sai."
    }
};

// A helper function to call another agent's prompt directly
export const executeAgentTask = async (
    agentId: keyof typeof SUB_AGENTS, 
    taskPrompt: string, 
    context: any
): Promise<string> => {
    
    if (!context || !context.apiKey || !context.proxyUrl) {
        throw new Error("Thiếu cấu hình API hoặc ProxyUrl để gọi Agent.");
    }

    const agent = SUB_AGENTS[agentId];
    if (!agent) {
        throw new Error(`Agent ${agentId} không tồn tại.`);
    }

    const messages = [
        { role: 'system', content: agent.system },
        { role: 'user', content: taskPrompt }
    ];

    // Build tool list if we want subagents to use standard tools
    const toolsModule = await import('./tools');
    const allTools = toolsModule.getAvailableTools();

    const response = await fetch(`${context.proxyUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${context.apiKey}`
          },
          body: JSON.stringify({
            model: context.model, // Reuse default model
            messages: messages,
            tools: allTools.filter(t => t.name !== 'delegate_task').map(t => ({ // Prevent nested delegation for simple scope
              type: "function",
              function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters
              }
            }))
          })
     });

    if (!response.ok) {
        throw new Error(`Agent ${agentId} call failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Agent không trả về kết quả cụ thể.';
};
