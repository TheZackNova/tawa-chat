import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { 
  BookOpen, 
  Brain, 
  Network, 
  Cpu, 
  Lock, 
  Layout, 
  Download, 
  Folder, 
  Sparkles, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Key, 
  FileText,
  Workflow
} from 'lucide-react';

interface AppGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'overview' | 'memory' | 'graph' | 'agents' | 'privacy' | 'canvas' | 'export';

export function AppGuideModal({ isOpen, onClose }: AppGuideModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    { id: 'overview', title: 'Tổng quan 🌟', icon: Sparkles },
    { id: 'memory', title: 'Bộ nhớ Smart 🧠', icon: Brain },
    { id: 'graph', title: 'Đồ thị Tri thức 🕸️', icon: Network },
    { id: 'agents', title: 'Tác vụ Nền ⚙️', icon: Cpu },
    { id: 'privacy', title: 'Bảo mật Crypt 🔒', icon: Lock },
    { id: 'canvas', title: 'Live Canvas 🎨', icon: Layout },
    { id: 'export', title: 'Xuất dữ liệu 📤', icon: Download },
  ] as const;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Cẩm Nang Sử Dụng Tawa Chat 3.0 🌸"
      className="max-w-4xl w-full"
    >
      <div className="flex flex-col md:flex-row gap-6 h-[72vh] overflow-hidden -mx-2">
        {/* Left Sidebar Menu - Sticky tabs */}
        <div className="w-full md:w-56 shrink-0 flex md:flex-col overflow-x-auto md:overflow-y-auto gap-1 border-b md:border-b-0 md:border-r border-pink-100 dark:border-zinc-800 pb-2 md:pb-0 pr-0 md:pr-4 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 whitespace-nowrap px-3 py-2.5 text-sm rounded-lg transition-all text-left w-full cursor-pointer font-medium ${
                  isSelected 
                    ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md shadow-pink-200 dark:shadow-none' 
                    : 'text-zinc-600 hover:bg-pink-50 hover:text-pink-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-pink-400'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isSelected ? 'text-white' : 'text-pink-500/80'}`} />
                <span>{tab.title}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content Sheet */}
        <div className="flex-1 overflow-y-auto px-1 pr-2 space-y-6 scrollbar-thin scrollbar-thumb-pink-200 dark:scrollbar-thumb-zinc-800">
          
          {activeTab === 'overview' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-100/50 dark:from-pink-950/10 dark:to-zinc-900 border border-pink-100/60 dark:border-pink-900/10 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-300/10 rounded-full blur-3xl" />
                <div className="relative z-10 space-y-2">
                  <span className="inline-block px-3 py-1 text-xs font-bold text-pink-600 bg-pink-100 dark:bg-pink-950 dark:text-pink-300 rounded-full uppercase tracking-wider mb-2">Xin chào! 🌸</span>
                  <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-pink-300 tracking-tight leading-7">Chào mừng bạn đến với Tawa Chat 3.0</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
                    Một trợ lý AI đỉnh cao tích hợp các thuật toán trí tuệ thông minh nhân tạo, đồ thị tri thức cá nhân hóa, 
                    chạy các tác vụ ngầm tự động và mã hóa đầu cuối tối mật.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Workflow className="h-4.5 w-4.5 text-pink-500" />
                  Các Tính Năng Cốt Lõi Siêu Việt
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-pink-200 dark:hover:border-pink-900/30 transition-all bg-white dark:bg-zinc-900 shadow-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="p-1.5 rounded-lg bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 font-bold text-xs">🚀 1</span>
                      <h5 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Hai Chế Độ Thông Minh</h5>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Chuyển đổi linh hoạt giữa mode <strong>Performance</strong> (Tốc độ tối giản) và <strong>Reasoning</strong> (Kích hoạt suy nghĩ sâu, hiển thị sơ đồ lập luận).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-pink-200 dark:hover:border-pink-900/30 transition-all bg-white dark:bg-zinc-900 shadow-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="p-1.5 rounded-lg bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 font-bold text-xs">🧠 2</span>
                      <h5 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Unified Memory Extraction</h5>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Lắng nghe, tự động học hỏi sở thích, chuyên môn, tóm tắt phiên trò chuyện ngay trong nền chỉ qua một API duy nhất giúp tiết kiệm 66% token.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-pink-200 dark:hover:border-pink-900/30 transition-all bg-white dark:bg-zinc-900 shadow-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="p-1.5 rounded-lg bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 font-bold text-xs">🕸️ 3</span>
                      <h5 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Personal Knowledge Graph</h5>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Phân rã cuộc trò chuyện thành các quan hệ ngữ nghĩa <strong>Chủ thể - Quan hệ - Đối tượng</strong>. Lọc trùng lặp O(1) hiệu năng cao qua hash SHA256.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-pink-200 dark:hover:border-pink-900/30 transition-all bg-white dark:bg-zinc-900 shadow-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="p-1.5 rounded-lg bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 font-bold text-xs">⚡ 4</span>
                      <h5 className="font-bold text-sm text-zinc-800 dark:text-zinc-200">Event-driven Agent Worker</h5>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Các Robot Nền chạy ngầm, kích hoạt ngay lập tức qua trigger Dexie DB khi có Task mới thay vì chạy tuần hoàn tốn pin 5s/lần.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-amber-200/50 dark:border-amber-950/30 bg-amber-50/30 dark:bg-amber-950/10 flex items-start gap-3">
                <span className="text-lg">💡</span>
                <div className="space-y-1">
                  <h6 className="text-xs font-bold text-amber-800 dark:text-amber-400">Cách bắt đầu hoàn hảo:</h6>
                  <p className="text-xs text-zinc-700 dark:text-zinc-400 leading-relaxed">
                    Vào góc dưới cột Sidebar, chọn <strong>Cài đặt ⚙️</strong>, nhập <strong>API Key</strong> cùng <strong>Mã PIN khóa bảo mật</strong> để kích hoạt toàn diện lưu trữ mã hóa và AI! Sau đó, chỉ cần gõ lời chào và trò chuyện một cách tự nhiên.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'memory' && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-pink-500" />
                  Hệ Thống Bộ Nhớ Siêu Trí Tuệ (Smart Memory)
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Trợ lý luôn ghi nhớ một cách tự động các thói quen, sở thích, sự thật của bạn sau khi phản hồi trò chuyện. Hệ thống liên tục tự mài giũa dựa trên đường cong lãng quên tự nhiên (Forgetting Curve) để dọn dẹp các ký ức không còn được nhắc tới.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest text-[10px]">Cơ Chế Hoạt Động Của Hệ Thống Cải Tiến:</h4>
                <div className="relative border-l-2 border-pink-200 dark:border-pink-900/50 pl-4 ml-2 space-y-4">
                  <div className="relative">
                    <span className="absolute -left-6.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[10px] text-white font-bold">1</span>
                    <h5 className="font-bold text-xs text-zinc-800 dark:text-zinc-200">Trích xuất đồng bộ (Unified Extraction)</h5>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Ngay sau khi AI gửi tin nhắn thành công, một tiểu trình AI ngầm sẽ nhận transcript 10 tin nhắn gần nhất. Chỉ 1 lần gọi API duy nhất, hệ thống tự bóc tách ra cả facts rời rạc lẫn profile người dùng, tiết kiệm 66% token.
                    </p>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-6.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[10px] text-white font-bold">2</span>
                    <h5 className="font-bold text-xs text-zinc-800 dark:text-zinc-200">Đăng ký ngữ cảnh liên quan (RAG Injection)</h5>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Khi bạn gửi tin nhắn mới, hệ thống tự động quét bằng thuật toán so khớp từ khóa và tầm quan trọng (importance score), nhét phần kiến thức liên quan nhất vào system prompt thúc đẩy AI trả lời chân thực.
                    </p>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-6.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[10px] text-white font-bold">3</span>
                    <span className="absolute -left-4 inline-block font-bold text-xs text-pink-500">⚡ Mẹo Ghi Nhớ Nhanh</span>
                    <h5 className="font-bold text-xs text-zinc-800 dark:text-zinc-200 mt-5">Áp dụng Lệnh Thủ Công Ghi Ghim (Hard Pin):</h5>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Bạn có thể bắt buộc trợ lý luôn ghi nhớ cứng một sự thật bằng cách gõ: <code className="bg-pink-100/70 dark:bg-zinc-800 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded text-[11px] font-mono">/pin [Nội dung cần nhớ]</code>. Rất hữu dụng khi muốn ghim một rule hay công thức cố định!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'graph' && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Network className="h-5 w-5 text-pink-500" />
                  Đồ Thị Tri Thức Cá Nhân (Personal Knowledge Graph)
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Tawa Chat 3.0 không chỉ lưu trữ text trơn, mà còn liên kết tất cả các định nghĩa lại với nhau qua Đồ thị tri thức (Knowledge Graph - SPO Triples). Điều này giúp trợ lý hiểu sâu sắc các liên hệ chồng chéo của bạn (ví dụ: Tú có anh trai là Nam, Nam đang công tác tại Tokyo).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-pink-50/30 dark:bg-zinc-900/50 border border-pink-100/40 dark:border-zinc-800/60">
                  <h4 className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-2">Đồ Thị Được Hình Thành Thế Nào?</h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Mỗi lần phân tích, AI tự động chuyển hóa câu nói sang các liên kết định lý:
                    <br /><br />
                    <span className="font-mono text-[11px] bg-white dark:bg-zinc-950 p-1 rounded inline-block border border-pink-100 dark:border-zinc-800">
                      (Tú) ───[yêu thích]───▶ (Yuri Anime)
                    </span>
                    <br />
                    <span className="font-mono text-[11px] bg-white dark:bg-zinc-950 p-1 rounded inline-block border border-pink-100 dark:border-zinc-800 mt-1">
                      (Yuri Anime) ───[gồm có]───▶ (Bloom Into You)
                    </span>
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-pink-50/30 dark:bg-zinc-900/50 border border-pink-100/40 dark:border-zinc-800/60">
                  <h4 className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-2">Thuật Toán Dedup O(1) Bằng SHA256</h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Hệ thống cũ phải đối chiếu và decrypt toàn bộ đồ thị để tránh thêm trùng lặp định lý. Hệ thống mới tạo khóa hash duy nhất:
                    <br />
                    <code className="text-[10px] bg-white dark:bg-zinc-800 block p-1.5 rounded border dark:border-zinc-700 font-mono mt-1 mb-1 truncate text-pink-500">
                      SHA256("chủ thể|mối quan hệ|đối tượng")
                    </code>
                    nhờ đó tra cứu cực nhanh O(1) kiểm tra trùng lặp tức thời trước khi ghi dữ liệu.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-pink-500" />
                  Hệ Thống Tác Vụ Chạy Ngầm (Agent Background Task)
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Tawa Chat hỗ trợ ủy quyền cho các Agent Robot (như Developer Agent, Researcher Agent) thực thi các tác vụ thời gian dài ngầm dưới nền. Khi robot tìm ra câu trả lời, hệ thống thông báo cho bạn ngay lập tức.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/20 text-emerald-800 dark:text-emerald-300">
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Đã nâng cấp: Động Cơ Sự Kiện (Event-driven với Dexie Observable)
                </h4>
                <p className="text-xs text-zinc-700 dark:text-zinc-400 leading-relaxed">
                  Trước đây hệ thống liên tục lặp mỗi 5 giây để kiểm tra tác vụ mới, gây hao mòn CPU và pin thiết bị. 
                  Giờ đây nhờ <strong>Dexie sub-observable</strong>, agent worker sẽ ngủ say hoàn toàn và chỉ thức giấc lập tức 
                  khi có tín hiệu thông báo ghi tác vụ mới vào IndexedDB.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Cách thử nghiệm tính năng Agent Chạy Nền:</h4>
                <ol className="list-decimal pl-4 space-y-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  <li>Bấm vào nút <strong>Kích hoạt System Event ⚡</strong> ở menu Sidebar.</li>
                  <li>Nhập nội dung sự kiện ngầm, ví dụ: <code className="bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 truncate rounded text-pink-500">"Sếp vừa gửi email yêu cầu tóm tắt báo cáo tài chính"</code>.</li>
                  <li>Bấm gửi, hệ thống sẽ ngầm ghim sự kiện này và tự động kích hoạt Agent phân tích, sau đó AI tự động thông báo hiển thị lên màn hình chat chính khi có lời giải hoàn tất!</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-pink-500" />
                  Bảo Mật Cryptographic Tuyệt Đối (Security)
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Sự riêng tư của bạn là ưu tiên hàng đầu của Tawa Chat. Mọi thông tin nhạy cảm của bạn, bao gồm cả tri thức đồ thị, thông tin cá nhân, API Key hay lịch sử hội thoại, đều có thể khóa chặt bằng khóa mã hóa thiết bị dựa trên mã PIN an toàn.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-rose-200/50 dark:border-rose-950/20 bg-rose-50/20 dark:bg-rose-950/5 text-xs text-zinc-700 dark:text-zinc-400 space-y-2">
                <h4 className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <Key className="h-4 w-4" />
                  Cơ Chế Cryptography Hoạt Động Như Thế Nào?
                </h4>
                <p className="leading-relaxed">
                  Khi bạn đặt mã PIN bảo mật trong mục Auth, mã này không bao giờ được lưu trực tiếp lên DB. Ứng dụng dùng mã PIN này để sinh khóa mã hóa đối xứng AES-256. Tất cả các dữ liệu nhạy cảm trước khi chui vào IndexedDB đều biến thành chuỗi nhị phân mã hóa vô nghĩa. Chỉ khi bạn nhập đúng mã PIN lúc mở app, dữ liệu mới được dập cấu trúc giải mã (decrypt) trên bộ nhớ RAM nội bộ của trình duyệt. Không ai có thể trộm dữ liệu này, kể cả khi họ mở máy tính của bạn lên!
                </p>
              </div>

              <div className="p-4 rounded-xl bg-pink-100/20 dark:bg-zinc-900 border border-pink-200/50 dark:border-zinc-800 flex items-center gap-3">
                <div className="font-mono text-xs bg-pink-500 text-white rounded-full h-8 w-8 shrink-0 flex items-center justify-center font-bold">PIN</div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Không bao giờ lo mất API Key</h4>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Khóa API Key của bạn được bảo mật tuyệt đối cục bộ, không gửi lên bất kỳ server trung gian nào, giao tiếp trực tiếp qua Proxy.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'canvas' && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Layout className="h-5 w-5 text-pink-500" />
                  Live Canvas Trình Diễn Mã Nguồn (Code Preview & Render)
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Tawa Chat 3.0 được trang bị khung hiển thị Canvas song song, cho phép bạn thiết kế, tùy biến và chiêm ngưỡng các thiết kế giao diện HTML/React do AI lập trình trực tiếp ngay trên khung nhìn mà không cần copy code ra ngoài.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 shadow-xs">
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Cách ra lệnh tạo giao diện UI sống động:</h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Trong lúc trò chuyện, chỉ cần bạn yêu cầu: <code className="bg-pink-50 text-pink-600 px-1 py-0.5 rounded text-[11px] dark:bg-zinc-800 dark:text-pink-400">"Vẽ cho tôi website bán quần áo"</code> hay <code className="bg-pink-50 text-pink-600 px-1 py-0.5 rounded text-[11px] dark:bg-zinc-800 dark:text-pink-400">"Tạo clone game Flappy Bird"</code>, Tawa AI sẽ tự động trả về toàn bộ mã tích hợp trong một khối lệnh <code className="font-mono bg-pink-100/50 p-0.5 text-pink-600 dark:bg-zinc-850 dark:text-pink-400">```html</code>.
                  <br /><br />
                  Một khung màn hình **CanvasArea** sẽ tự động mở ra bên phải màn hình để hiển thị và tương tác trực tiếp lập tức với game/website!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 p-4 rounded-xl bg-pink-50/20 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/80">
                  <h5 className="font-bold text-xs text-zinc-800 dark:text-zinc-200 mb-1">📐 Auto Resize Stage</h5>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Sử dụng các thuật toán Resize Observer thông minh để bám sát chiều ngang khung nhìn của bạn, không bị lệch hoặc đứt dòng vỡ khung.
                  </p>
                </div>
                <div className="flex-1 p-4 rounded-xl bg-pink-50/20 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/80">
                  <h5 className="font-bold text-xs text-zinc-800 dark:text-zinc-200 mb-1">🎮 Tương Tác Trực Tiếp</h5>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Khung render được tách biệt độc lập qua iFrame bảo mật, hỗ trợ bạn tương tác (click, bấm phím điều khiển) như môi trường thật!
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Download className="h-5 w-5 text-pink-500" />
                  Xuất Bản & Chia Sẻ Đa Dạng (Export Platform)
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Bạn vừa hoàn thành một phiên lập trình xuất sắc cùng AI và muốn lưu giữ kết quả hay chia sẻ cho đồng đội? Tawa Chat cung cấp kho tùy chọn xuất bản thông minh nhất.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Định Dạng Xuất Bản Hỗ Trợ:</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex gap-3">
                    <span className="text-xl">📝</span>
                    <div className="space-y-0.5">
                      <h5 className="font-bold text-xs text-zinc-800 dark:text-zinc-200">Markdown (.md)</h5>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        Định dạng chuẩn phong cách Developer giữ nguyên highlight cú pháp code và sơ đồ Mermaid.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex gap-3">
                    <span className="text-xl">📄</span>
                    <div className="space-y-0.5">
                      <h5 className="font-bold text-xs text-zinc-800 dark:text-zinc-200">Microsoft Word (.docx)</h5>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        Tự động biên tập cấu trúc tệp DOCX đẹp đẽ, dùng nộp bài tập hoặc báo cáo văn phòng trực tiếp.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex gap-3">
                    <span className="text-xl">📕</span>
                    <div className="space-y-0.5">
                      <h5 className="font-bold text-xs text-zinc-800 dark:text-zinc-200">Adobe PDF Document</h5>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        Xuất file cứng không đổi dạng chữ và ảnh trực quan, dùng để lưu trữ lâu dài hoàn hảo.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex gap-3">
                    <span className="text-xl">🐱</span>
                    <div className="space-y-0.5">
                      <h5 className="font-bold text-xs text-zinc-800 dark:text-zinc-200">GitHub Gist</h5>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        Đẩy thẳng đoạn hội thoại lên đám mây GitHub Gist để có link chia sẻ tức thời tuyệt hảo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-pink-50/50 dark:bg-pink-950/10 text-center text-xs text-pink-600 dark:text-pink-400 border border-pink-100/50 dark:border-pink-900/30">
                Hãy click vào biểu tượng <strong>Tải xuống / Chia sẻ (Export)</strong> ở thanh tiêu đề Chat Area để bắt đầu ngay! 🚀
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="flex justify-end border-t border-pink-100 dark:border-zinc-800 pt-4 mt-4">
        <Button 
          onClick={onClose} 
          className="bg-pink-500 hover:bg-pink-600 text-white font-medium flex items-center gap-1.5 cursor-pointer shadow-md shadow-pink-100 dark:shadow-none"
        >
          <span>Đóng cẩm nang</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Modal>
  );
}
