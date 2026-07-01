export interface PromptCommand {
  name: string;
  description: string;
  handler: (arg: string) => string;
}

export const COMMANDS: PromptCommand[] = [
  {
    name: 'summarize',
    description: 'Tóm tắt cuộc trò chuyện hiện tại',
    handler: () => 'Hãy tóm tắt cuộc trò chuyện hiện tại một cách ngắn gọn.',
  },
  {
    name: 'code',
    description: 'Đóng vai chuyên gia lập trình',
    handler: (arg) =>
      `Hãy đóng vai một chuyên gia lập trình ${arg}. Chỉ trả lời bằng source code, không giải thích.`,
  },
  {
    name: 'search',
    description: 'Tìm kiếm web',
    handler: (arg) => `Hãy dùng công cụ tìm kiếm web để tìm thông tin về: ${arg}`,
  },
  {
    name: 'memory',
    description: 'Tìm kiếm trong Smart Memory',
    handler: (arg) => `Tìm kiếm trong bộ nhớ hệ thống (Smart Memory) về: ${arg}`,
  },
  {
    name: 'workflow',
    description: 'Quy trình xử lý đa bước',
    handler: (arg) => {
      if (arg === 'paper') {
        return `[WORKFLOW_TRIGGER] Thực hiện quy trình xử lý văn bản đa bước: \n1. Đọc và phân tích kỹ nội dung tài liệu.\n2. Dịch toàn bộ nội dung sang tiếng Việt một cách tự nhiên.\n3. Tóm tắt 5 điểm cốt lõi nhất.\n4. Trình bày các điểm cốt lõi dưới dạng flashcards để dễ ôn tập.`;
      }
      return '';
    },
  },
  {
    name: 'intro',
    description: 'Tạo 4 kịch bản mở đầu roleplay từ mô tả tự do',
    handler: (arg) =>
      `Thiết kế 4 kịch bản mở đầu cho Roleplay dựa trên mô tả: "${arg}"\n\nYêu cầu bắt buộc:\n- Tạo đúng 4 kịch bản hoàn toàn độc lập với nhau\n- Mỗi kịch bản nằm trong một khối \`\`\`markdown ... \`\`\` RIÊNG BIỆT\n- Mỗi kịch bản bắt đầu bằng header:\n    **Địa điểm:** ...\n    **Thời gian:** ...\n    **Nhân vật xung quanh:** ...\n- Phần nội dung 300–500 từ, phù hợp thế giới quan và bối cảnh được mô tả\n- <user> là nhân vật OC của người chơi\n- Kết thúc tại điểm mở — không resolve, để người chơi tiếp tục\n- Không bọc tất cả 4 kịch bản trong 1 block duy nhất`,
  },
];
