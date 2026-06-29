import { ChatSession } from '../store/useStore';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

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

export const exportToPDF = (session: ChatSession) => {
  // A simple PDF export using jsPDF text. For complex UI, html2canvas is better,
  // but for chat text, this is cleaner.
  const doc = new jsPDF();
  let y = 20;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const maxWidth = doc.internal.pageSize.width - margin * 2;

  doc.setFontSize(16);
  doc.text(session.title, margin, y);
  y += 15;

  doc.setFontSize(12);
  
  session.messages.forEach(m => {
    const role = m.role === 'user' ? 'Bạn:' : 'Trợ lý AI:';
    doc.setFont('helvetica', 'bold');
    
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
    
    doc.text(role, margin, y);
    y += 7;
    
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(m.content, maxWidth);
    
    lines.forEach((line: string) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 7;
    });
    
    y += 5;
  });

  doc.save(`${session.title}.pdf`);
};
