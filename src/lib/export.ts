import { ChatSession } from '../store/useStore';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

const escHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const exportToMarkdown = (session: ChatSession) => {
  let md = `# ${session.title}\n\n`;
  session.messages.forEach(m => {
    const role = m.role === 'user' ? 'Bạn' : 'Trợ lý AI';
    md += `### ${role}:\n\n${m.content}\n\n---\n\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, `${session.title}.md`);
};

export const exportToGithubGist = async (session: ChatSession, token: string) => {
  if (!token) {
    throw new Error("Vui lòng cấu hình GitHub Token trong phần Cài đặt để sử dụng tính năng này.");
  }

  let md = `# ${session.title}\n\n`;
  session.messages.forEach(m => {
    const role = m.role === 'user' ? 'Bạn' : 'Trợ lý AI';
    md += `### ${role}:\n\n${m.content}\n\n---\n\n`;
  });

  const response = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      description: `Chat Session: ${session.title}`,
      public: false,
      files: {
        [`${session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'chat'}.md`]: {
          content: md
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Lỗi khi tạo Gist: ${response.statusText}`);
  }

  const data = await response.json();
  return data.html_url;
};

export const exportToWord = async (session: ChatSession) => {
  const children: any[] = [
    new Paragraph({
      children: [
        new TextRun({ text: session.title, bold: true, size: 32 }),
      ],
    }),
    new Paragraph({ text: "" }),
  ];

  session.messages.forEach(m => {
    const role = m.role === 'user' ? 'Bạn' : 'Trợ lý AI';
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: role + ":", bold: true, size: 24 }),
        ],
      })
    );
    
    // Split by newlines to create separate paragraphs
    const lines = m.content.split('\n');
    lines.forEach(line => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 22 })],
        })
      );
    });
    
    children.push(new Paragraph({ text: "" }));
    children.push(new Paragraph({ text: "---" }));
    children.push(new Paragraph({ text: "" }));
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${session.title}.docx`);
};

export const exportToPDF = async (session: ChatSession) => {
  // Use html2canvas to render Vietnamese text correctly (jsPDF built-in fonts lack Vietnamese)
  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;left:-9999px;top:0;width:794px;padding:48px 60px;background:#ffffff;' +
    'font-family:"Segoe UI",Arial,sans-serif;box-sizing:border-box;color:#1a1a1a;';

  let html = `<h1 style="font-size:18px;margin:0 0 24px;color:#1a1a1a;">${escHtml(session.title)}</h1>`;
  session.messages.forEach(m => {
    const role = m.role === 'user' ? 'Bạn' : 'Trợ lý AI';
    const color = m.role === 'user' ? '#be185d' : '#1d4ed8';
    html += `<div style="margin-bottom:18px;">
      <div style="font-weight:700;color:${color};font-size:12px;margin-bottom:4px;">${role}</div>
      <div style="font-size:12px;line-height:1.75;white-space:pre-wrap;">${escHtml(m.content)}</div>
    </div>
    <hr style="border:0;border-top:1px solid #e5e7eb;margin:14px 0;">`;
  });

  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const html2canvasModule = await import('html2canvas');
    const canvas = await html2canvasModule.default(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgH = (canvas.height / canvas.width) * pageW * (canvas.width / (canvas.width / 2));
    const scaledH = (canvas.height / 2) * (pageW / (canvas.width / 2));

    let heightLeft = scaledH;
    let posY = 0;
    pdf.addImage(imgData, 'JPEG', 0, posY, pageW, scaledH);
    heightLeft -= pageH;

    while (heightLeft > 0) {
      posY -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, posY, pageW, scaledH);
      heightLeft -= pageH;
    }

    pdf.save(`${session.title}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
};

export const exportToJSON = (session: ChatSession) => {
  const data = {
    title: session.title,
    exportedAt: new Date().toISOString(),
    messages: session.messages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  saveAs(blob, `${session.title}.json`);
};

export const importFromJSON = (file: File): Promise<{ title: string; messages: { role: string; content: string; timestamp: number }[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.title || !Array.isArray(data.messages)) {
          throw new Error('File JSON không hợp lệ: thiếu trường title hoặc messages.');
        }
        for (const m of data.messages) {
          if (!m.role || typeof m.content !== 'string') {
            throw new Error('File JSON không hợp lệ: mỗi tin nhắn phải có role và content.');
          }
        }
        resolve({ title: data.title, messages: data.messages });
      } catch (err: any) {
        reject(new Error(err.message || 'Không thể đọc file JSON.'));
      }
    };
    reader.onerror = () => reject(new Error('Lỗi khi đọc file.'));
    reader.readAsText(file, 'utf-8');
  });
};
