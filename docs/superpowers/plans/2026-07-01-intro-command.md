# Command Registry + `/intro` Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tách các slash commands thành một registry riêng (`src/lib/commands.ts`) và thêm lệnh `/intro` để tạo 4 kịch bản mở đầu roleplay từ mô tả tự do.

**Architecture:** Tạo `src/lib/commands.ts` định nghĩa interface `PromptCommand` và mảng `COMMANDS` chứa tất cả lệnh tạo prompt. `ChatInput.tsx` thay thế chuỗi if/else bằng một registry lookup. `/clear` và `/export` vẫn giữ inline vì chúng là UI action không gọi `onSend`.

**Tech Stack:** TypeScript, React 19, Zustand. Không có test framework — verification bằng `tsc --noEmit` + kiểm tra thủ công trên dev server (`npm run dev`).

## Global Constraints

- Không thay đổi kiến trúc store, ChatArea, hay API layer
- `/clear` và `/export` phải giữ nguyên inline trong `ChatInput.tsx`
- Prompt của `/intro` phải dùng `<user>` (không phải tên cụ thể) cho nhân vật OC
- Output `/intro` phải yêu cầu từng kịch bản trong block ` ```markdown ``` ` riêng biệt

---

## File Map

| File | Action | Mô tả |
|------|--------|-------|
| `src/lib/commands.ts` | **Create** | Registry với `PromptCommand` interface và `COMMANDS[]` |
| `src/components/Chat/ChatInput.tsx` | **Modify** | Import COMMANDS, thay if/else chain bằng registry lookup |

---

### Task 1: Tạo command registry `src/lib/commands.ts`

**Files:**
- Create: `src/lib/commands.ts`

**Interfaces:**
- Produces: `PromptCommand` type, `COMMANDS` array — dùng bởi Task 2

- [ ] **Step 1: Tạo file với interface và các lệnh đã migrate**

Tạo `src/lib/commands.ts` với nội dung sau:

```typescript
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
```

- [ ] **Step 2: Kiểm tra TypeScript**

```bash
npm run lint
```

Expected: không có lỗi TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/lib/commands.ts
git commit -m "feat: add command registry with existing commands and /intro skill"
```

---

### Task 2: Refactor `ChatInput.tsx` dùng command registry

**Files:**
- Modify: `src/components/Chat/ChatInput.tsx` — dòng 32–103 (khối xử lý slash commands trong `handleSubmit`)

**Interfaces:**
- Consumes: `COMMANDS: PromptCommand[]` từ `src/lib/commands.ts`

- [ ] **Step 1: Thêm import COMMANDS vào đầu file**

Ở dòng 6 của `ChatInput.tsx`, sau dòng import `useStore`:

```typescript
import { COMMANDS } from '../../lib/commands';
```

- [ ] **Step 2: Thay thế các if/else của prompt commands bằng registry lookup**

Trong `handleSubmit`, tìm và thay thế khối từ `if (command === '/summarize')` đến hết `if (command === '/workflow')` (dòng 36–103) bằng:

```typescript
    const cmd = COMMANDS.find(c => c.name === command.slice(1));
    if (cmd) {
      const prompt = cmd.handler(arg);
      if (prompt) {
        onSend(prompt, attachments);
        setInput('');
        return;
      }
    }
```

Kết quả toàn bộ khối `if (text.startsWith('/'))` sau khi sửa (dòng 32–108):

```typescript
    if (text.startsWith('/')) {
        const parts = text.split(' ');
        const command = parts[0].toLowerCase();
        const arg = parts.slice(1).join(' ');

        if (command === '/clear') {
            store.clearHistory();
            setInput('');
            return;
        }

        if (command === '/export') {
            const format = arg.toLowerCase() || 'markdown';
            let content = '';
            
            const session = store.sessions.find((s) => s.id === store.currentSessionId);
            const messages = session ? session.messages : [];

            if (format === 'json') {
                content = JSON.stringify(messages, null, 2);
            } else {
                content = messages.map(m => `**${m.role === 'user' ? 'You' : 'Tawa'}**:\n${m.content}\n`).join('\n---\n\n');
            }

            const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chat_export_${new Date().toISOString().slice(0,10)}.${format === 'json' ? 'json' : 'md'}`;
            a.click();
            URL.revokeObjectURL(url);
            
            setInput('');
            return;
        }

        const cmd = COMMANDS.find(c => c.name === command.slice(1));
        if (cmd) {
          const prompt = cmd.handler(arg);
          if (prompt) {
            onSend(prompt, attachments);
            setInput('');
            return;
          }
        }
    }
```

- [ ] **Step 3: Kiểm tra TypeScript**

```bash
npm run lint
```

Expected: không có lỗi TypeScript.

- [ ] **Step 4: Kiểm tra thủ công trên dev server**

```bash
npm run dev
```

Mở `http://localhost:3000`, đăng nhập, và kiểm tra lần lượt:

| Lệnh | Expected |
|------|----------|
| `/summarize` | AI tóm tắt cuộc trò chuyện |
| `/code python` | AI đóng vai chuyên gia Python |
| `/search mèo dễ thương` | AI tìm kiếm web |
| `/memory nhân vật` | AI tìm trong Smart Memory |
| `/workflow paper` | AI xử lý văn bản đa bước |
| `/clear` | Xóa lịch sử chat (vẫn hoạt động bình thường) |
| `/intro Thế giới Okaasan Online, gặp Mamako` | AI trả về 4 block markdown riêng biệt |

- [ ] **Step 5: Commit**

```bash
git add src/components/Chat/ChatInput.tsx
git commit -m "refactor: replace inline slash command if/else with command registry lookup"
```

---

## Self-Review

**Spec coverage:**
- ✅ Command registry (`src/lib/commands.ts`) với `PromptCommand` interface
- ✅ Migrate 5 lệnh cũ: `/summarize`, `/code`, `/search`, `/memory`, `/workflow paper`
- ✅ Lệnh mới `/intro` với prompt 4 kịch bản, mỗi cái trong block markdown riêng
- ✅ `/clear` và `/export` giữ nguyên inline
- ✅ `/workflow` với arg không phải `paper` trả về `''` → không gọi `onSend` → fallthrough gửi raw text (giữ behavior cũ)

**Placeholder scan:** Không có TBD hoặc "implement later".

**Type consistency:** `COMMANDS` (Task 1) → `COMMANDS.find(...)` (Task 2) — tên nhất quán. `cmd.handler(arg)` trả `string` — được dùng đúng.
