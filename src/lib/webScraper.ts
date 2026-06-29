export async function searchWeb(query: string): Promise<string> {
  try {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
    let html = '';
    let successful = false;
    let lastError = null;

    // Try robust proxies 
    const proxies = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`,
      `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(searchUrl)}`
    ];

    for (const proxyUrl of proxies) {
      try {
        const response = await fetch(proxyUrl);
        if (!response.ok) continue;

        if (proxyUrl.includes('allorigins')) {
           try {
             // Depending on how allorigins responds, it could be JSON or raw text if it failed
             const text = await response.text();
             try {
               const data = JSON.parse(text);
               if (data.contents) {
                 html = data.contents;
                 successful = true;
                 break;
               }
             } catch(e) {
               // Ignore JSON parse error from allorigins (typically Cloudflare 520 HTML)
             }
           } catch(err) {
             continue;
           }
        } else {
           html = await response.text();
           if (html && html.includes('b_algo')) {
             successful = true;
             break;
           }
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!successful || !html) {
      throw lastError || new Error("All proxies failed to fetch Bing Search");
    }
    
    // Basic HTML parsing
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const results: string[] = [];
    const elements = doc.querySelectorAll('.b_algo');
    
    elements.forEach((el, idx) => {
      if (idx > 5) return; // limit to top 6
      const titleEl = el.querySelector('h2 a');
      const snippetEl = el.querySelector('.b_caption p, .b_algoSlug, .b_paractl');
      
      const title = titleEl?.textContent?.trim() || '';
      const link = titleEl?.getAttribute('href') || '';
      const snippet = snippetEl?.textContent?.trim() || '';
      
      if (title && snippet) {
         results.push(`Title: ${title}\nLink: ${link}\nSnippet: ${snippet}`);
      }
    });

    if (results.length === 0) {
       return "Không tìm thấy kết quả từ web.";
    }
    
    return results.join('\n\n');
  } catch (e: any) {
    console.error(`Failed to search web for ${query}:`, e);
    
    // Fallback to Wikipedia search if everything fails
    try {
      const wikiRes = await fetch(`https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`);
      const wikiData = await wikiRes.json();
      if (wikiData.query?.search?.length > 0) {
         let fallbackRes = "Kết quả từ Wikipedia (Fallback do lỗi mạng):\n\n";
         wikiData.query.search.slice(0, 5).forEach((item: any) => {
             const cleanSnippet = item.snippet.replace(/<[^>]*>?/gm, '');
             fallbackRes += `Title: ${item.title}\nSnippet: ${cleanSnippet}\n\n`;
         });
         return fallbackRes;
      }
    } catch(err) {
       console.error("Wikipedia fallback also failed:", err);
    }
    
    return `Lỗi khi tìm kiếm trên web: ${e.message}`;
  }
}

export async function fetchWebpages(urls: string[]): Promise<{url: string, content: string}[]> {
  const results: {url: string, content: string}[] = [];
  
  for (const url of urls) {
    try {
      let html = '';
      let successful = false;
      let lastError = null;

      // Try multiple proxies in case of ad-blockers or failures
      const proxies = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`
      ];

      for (const proxyUrl of proxies) {
        try {
          const response = await fetch(proxyUrl);
          if (!response.ok) continue;

          if (proxyUrl.includes('allorigins')) {
             try {
               const data = await response.json();
               if (data.contents) {
                 html = data.contents;
                 successful = true;
                 break;
               }
             } catch(err) {
               // Fallback if allorigins returns HTML instead of JSON (which happens on some errors)
               continue;
             }
          } else {
             html = await response.text();
             if (html) {
               successful = true;
               break;
             }
          }
        } catch (err: any) {
          lastError = err;
        }
      }

      if (!successful) {
        throw lastError || new Error("All proxies failed");
      }
      
      // Basic HTML stripping
      const doc = new DOMParser().parseFromString(html, 'text/html');
      // Remove scripts, styles
      const scripts = doc.querySelectorAll('script, style, noscript, iframe, link, meta, nav, footer, header');
      scripts.forEach(s => s.remove());
      
      const text = doc.body?.innerText || doc.documentElement.innerText || '';
      
      // Clean up whitespace
      const cleanedText = text.replace(/\s+/g, ' ').trim();
      
      results.push({ url, content: cleanedText });
    } catch (e: any) {
      console.error(`Failed to fetch ${url}:`, e);
      results.push({ url, content: `Lỗi không thể truy cập trang web: ${e.message}` });
    }
  }
  
  return results;
}
