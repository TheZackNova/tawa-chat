import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function (...args: Parameters<T>) {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export class PromptPipeline {
  private sections: Map<string, { content: string; priority: number }> = new Map();

  addSection(name: string, content: string, priority: number = 5) {
    if (content && content.trim()) {
      this.sections.set(name, { content: content.trim(), priority });
    }
  }

  build(): string {
    return [...this.sections.entries()]
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([name, { content }]) => `[${name}]\n${content}`)
      .join('\n\n');
  }
}
