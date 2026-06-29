export interface ToolContext {
  apiKey?: string;
  proxyUrl?: string;
  model?: string;
  sessionId?: string;
  messages?: any[];
  addMessage?: (msg: any) => void;
}

export interface Tool {
  name: string;
  description: string;
  parameters: object;
  execute: (args: any, context?: ToolContext) => Promise<string>;
}

export const getAvailableTools = (): Tool[] => {
  return [
    {
      name: "search_web",
      description: "Tìm kiếm thông tin trên Web (Internet). Sử dụng tự động khi bạn thiếu thông tin cập nhật, cần facts thực tế, hoặc người dùng yêu cầu search.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Từ khóa truy vấn tìm kiếm" }
        },
        required: ["query"]
      },
      execute: async (args: { query: string }) => {
        const importWebScraper = await import('./webScraper');
        return await importWebScraper.searchWeb(args.query);
      }
    },
    {
      name: "read_url",
      description: "Đọc nội dung văn bản chi tiết từ một đường dẫn URL web.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Đường dẫn URL hợp lệ bắt đầu bằng http:// hoặc https://" }
        },
        required: ["url"]
      },
      execute: async (args: { url: string }) => {
        const importWebScraper = await import('./webScraper');
        const results = await importWebScraper.fetchWebpages([args.url]);
        if (results.length > 0 && results[0].content) {
          return results[0].content;
        }
        return "Lỗi: Không thể đọc nội dung từ URL này.";
      }
    },
    {
      name: "get_current_time",
      description: "Lấy thời gian hiện tại của hệ thống. Sử dụng khi cần trả lời câu hỏi về ngày giờ thực tế.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      },
      execute: async () => {
        return new Date().toISOString();
      }
    },
    {
      name: "delegate_task",
      description: "Điều phối (Multi-Agent). Cấp một công việc phụ cho một Assistant chuyên sâu (coder, researcher, reviewer). Khi nhiệm vụ nằm ngoài khả năng trả lời tức thì hoặc cần chuyên môn sâu độc lập.",
      parameters: {
        type: "object",
        properties: {
          agent: { type: "string", enum: ["coder", "researcher", "reviewer"], description: "Loại agent cần điều phối" },
          task: { type: "string", description: "Bản báo cáo chi tiết/Yêu cầu task chi tiết để agent phụ thực hiện" }
        },
        required: ["agent", "task"]
      },
      execute: async (args: { agent: string, task: string }, context?: ToolContext) => {
        if (!context) throw new Error("Missing context");
        const agentsModule = await import('./agents');
        return await agentsModule.executeAgentTask(args.agent as any, args.task, context);
      }
    },
    {
      name: "run_background_task",
      description: "Chạy xử lý task dưới nền (Background Processing). Dùng để chạy một công việc cần nhiều thời gian, ví dụ scrape nhiều link, phân tích dài hạn. Hệ thống sẽ tự trả kết quả khi xong.",
      parameters: {
        type: "object",
        properties: {
          agent: { type: "string", enum: ["coder", "researcher", "reviewer"], description: "Loại agent sẽ phụ trách task này" },
          task: { type: "string", description: "Mô tả công việc chi tiết" }
        },
        required: ["agent", "task"]
      },
      execute: async (args: { agent: string, task: string }, context?: ToolContext) => {
        if (!context || !context.sessionId) throw new Error("Missing context or sessionId");
        
        const { db } = await import('./db');
        const { v4: uuidv4 } = await import('uuid');

        const taskId = uuidv4();
        await db.backgroundTasks.put({
            id: taskId,
            sessionId: context.sessionId,
            agentRole: args.agent,
            taskDescription: args.task,
            status: 'pending',
            createdAt: Date.now()
        });

        return `[Hệ thống] Đã đưa tác vụ vào hàng đợi ẩn dưới ID: ${taskId}. Quá trình đang chạy nền. Bạn có thể tiếp tục nói chuyện với user và nói rằng tôi đang chạy ngầm.`;
      }
    }
  ];
};
