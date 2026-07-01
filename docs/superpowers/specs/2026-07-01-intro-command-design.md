# Design: Command Registry + `/intro` Skill

**Date:** 2026-07-01  
**Status:** Approved

## Problem

`ChatInput.tsx` xử lý tất cả slash commands bằng một chuỗi `if/else` inline, khó mở rộng. Cần thêm lệnh `/intro` (Tạo mở đầu) — một skill tạo 4 kịch bản mở đầu roleplay từ mô tả tự do của người dùng.

## Thiết kế

### 1. File mới: `src/lib/commands.ts`

Định nghĩa interface `PromptCommand` và export mảng `COMMANDS`:

```typescript
export interface PromptCommand {
  name: string;         // tên lệnh (không có dấu /), e.g. 'intro'
  description: string;  // mô tả ngắn
  handler: (arg: string) => string; // nhận args, trả prompt string
}

export const COMMANDS: PromptCommand[] = [ ... ];
```

**Lệnh được migrate từ `ChatInput.tsx` vào registry:**

| Lệnh | Arg | Hành vi |
|------|-----|---------|
| `/summarize` | (none) | Tóm tắt cuộc trò chuyện |
| `/code <lang>` | tên ngôn ngữ | Đóng vai chuyên gia lập trình |
| `/search <query>` | chuỗi tìm kiếm | Tìm kiếm web |
| `/memory <query>` | chuỗi tìm kiếm | Tìm trong Smart Memory |
| `/workflow paper` | `paper` | Quy trình xử lý văn bản đa bước |

**Lệnh giữ nguyên inline trong `ChatInput.tsx`** (UI action, không gọi `onSend`):
- `/clear` — gọi `store.clearHistory()`
- `/export` — download file

### 2. Thay đổi `ChatInput.tsx`

Trong `handleSubmit`, thay toàn bộ chuỗi if/else của prompt commands bằng:

```typescript
import { COMMANDS } from '../../lib/commands';

// trong handleSubmit, sau khi xử lý /clear và /export:
const cmd = COMMANDS.find(c => c.name === command.slice(1));
if (cmd) {
  onSend(cmd.handler(arg), attachments);
  setInput('');
  return;
}
```

### 3. Lệnh `/intro` mới

**Cú pháp:** `/intro <mô tả tự do>`

**Ví dụ:**
- `/intro Thế giới Okaasan Online, OC gặp Mamako lần đầu tại quán trọ`
- `/intro Cyberpunk 2077, thám tử tư nhận vụ án bí ẩn`
- `/intro Trường phổ thông hiện đại Nhật Bản, ngày khai giảng`

**Handler prompt template:**

```
Thiết kế 4 kịch bản mở đầu cho Roleplay dựa trên mô tả: "${arg}"

Yêu cầu bắt buộc:
- Tạo đúng 4 kịch bản hoàn toàn độc lập với nhau
- Mỗi kịch bản nằm trong một khối ```markdown ... ``` RIÊNG BIỆT
- Mỗi kịch bản bắt đầu bằng header:
    **Địa điểm:** ...
    **Thời gian:** ...
    **Nhân vật xung quanh:** ...
- Phần nội dung 300–500 từ, phù hợp thế giới quan và bối cảnh được mô tả
- <user> là nhân vật OC của người chơi
- Kết thúc tại điểm mở — không resolve, để người chơi tiếp tục
- Không bọc tất cả 4 kịch bản trong 1 block duy nhất
```

## Luồng dữ liệu

```
User gõ: /intro Okaasan Online, gặp Mamako
       ↓
handleSubmit() parse command='intro', arg='Okaasan Online, gặp Mamako'
       ↓
COMMANDS.find(c => c.name === 'intro')
       ↓
handler(arg) → prompt string
       ↓
onSend(prompt, attachments)
       ↓
handleSend() → API call → AI trả 4 markdown blocks
```

## Phạm vi thay đổi

- **Tạo mới:** `src/lib/commands.ts`
- **Sửa:** `src/components/Chat/ChatInput.tsx` — `handleSubmit`
- **Không thay đổi:** store, ChatArea, API layer, kiến trúc tổng thể

## Không nằm trong scope

- UI autocomplete/hint cho lệnh `/`
- Lệnh `/intro` với tham số cờ (số kịch bản tùy chỉnh)
- Lưu template vào settings
