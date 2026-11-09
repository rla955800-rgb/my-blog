// 마크다운 → HTML 변환기
// 외부 라이브러리 없이 이 블로그에 필요한 문법만 지원한다 (지원 범위는 CLAUDE.md 참고).

export const escapeHtml = (text) => String(text)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const RE = {
  fence: /^\s*(`{3,}|~{3,})\s*([\w+#.-]*)\s*$/,
  heading: /^(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/,
  hr: /^\s{0,3}([-*_])(\s*\1){2,}\s*$/,
  quote: /^\s{0,3}>\s?/,
  listItem: /^(\s*)([-*+]|\d+[.)])\s+(.*)$/,
  tableSep: /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/,
};

const BLOCKED_PROTOCOL = /^(javascript|vbscript|data):/i;
const ABSOLUTE_URL = /^([a-z][a-z\d+.-]*:|\/|#)/i;
// (url "제목") 부분. 주소 안의 괄호는 한 겹까지 허용한다 (예: 위키백과 주소)
const LINK_TARGET = String.raw`\(((?:[^()\s]|\([^()\s]*\))+)(?:\s+&quot;[^)]*&quot;)?\)`;

// ===== 인라인 =====

const isSafeUrl = (url) => {
  // 공백·제어 문자를 끼워 넣어 검사를 피하는 경우까지 막는다
  const cleaned = url.replace(/[\u0000- ]/g, '');
  return !BLOCKED_PROTOCOL.test(cleaned);
};

const applyEmphasis = (text) => text
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/__(.+?)__/g, '<strong>$1</strong>')
  .replace(/~~(.+?)~~/g, '<del>$1</del>')
  .replace(/\*(?!\s)(.+?)\*/g, '<em>$1</em>')
  // snake_case 같은 단어 속 밑줄은 기울임으로 바꾸지 않는다
  .replace(/(^|[^\p{L}\p{N}_])_(?!\s)(.+?)_(?![\p{L}\p{N}_])/gu, '$1<em>$2</em>');

const renderInline = (text, ctx) => {
  const tokens = [];
  // 이미 완성된 HTML 조각은 자리표시자로 빼 두어 이후 처리에서 건드리지 않게 한다
  const stash = (html) => `\u0000${tokens.push(html) - 1}\u0000`;

  let out = text.replace(/\u0000/g, '');
  out = out.replace(/`([^`]+)`/g, (_, code) => stash(`<code>${escapeHtml(code)}</code>`));
  out = out.replace(/\\([\\`*_{}[\]()#+\-.!~|>])/g, (_, ch) => stash(escapeHtml(ch)));
  out = escapeHtml(out);

  out = out.replace(new RegExp(`!\\[([^\\]]*)\\]${LINK_TARGET}`, 'g'), (_, alt, src) => {
    if (!isSafeUrl(src)) return stash(alt);
    const url = ctx.imageBase && !ABSOLUTE_URL.test(src) ? ctx.imageBase + src : src;
    return stash(`<img src="${url}" alt="${alt}" loading="lazy">`);
  });

  out = out.replace(new RegExp(`\\[([^\\]]+)\\]${LINK_TARGET}`, 'g'), (_, label, href) => {
    if (!isSafeUrl(href)) return stash(applyEmphasis(label));
    const external = /^https?:\/\//i.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return stash(`<a href="${href}"${external}>${applyEmphasis(label)}</a>`);
  });

  out = applyEmphasis(out).replace(/ {2,}\n/g, '<br>\n');

  // 링크 안의 코드처럼 자리표시자가 겹칠 수 있어 모두 풀릴 때까지 복원
  while (out.includes('\u0000')) {
    out = out.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[index] ?? '');
  }
  return out;
};

// ===== 블록 =====

const indentOf = (line) => line.match(/^ */)[0].length;

const dedent = (line, size) => line.replace(new RegExp(`^ {0,${size}}`), '');

const isBlockStart = (line) => RE.fence.test(line)
  || RE.heading.test(line)
  || RE.hr.test(line)
  || RE.quote.test(line)
  || RE.listItem.test(line);

const isTableStart = (lines, i) => i + 1 < lines.length
  && lines[i].includes('|')
  && lines[i + 1].includes('|')
  && RE.tableSep.test(lines[i + 1]);

const slugify = (text) => text
  .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s-]/gu, '')
  .trim()
  .replace(/\s+/g, '-') || 'section';

const uniqueId = (text, ctx) => {
  const base = slugify(text);
  const count = ctx.ids.get(base) || 0;
  ctx.ids.set(base, count + 1);
  return count ? `${base}-${count}` : base;
};

const isFenceClose = (line, marker) => {
  const trimmed = line.trim();
  return /^(`{3,}|~{3,})$/.test(trimmed) && trimmed[0] === marker[0] && trimmed.length >= marker.length;
};

const parseCodeBlock = (lines, start, fence) => {
  const [, marker, lang] = fence;
  const body = [];
  let i = start + 1;
  while (i < lines.length && !isFenceClose(lines[i], marker)) {
    body.push(lines[i]);
    i++;
  }
  const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';
  return {
    html: `<pre tabindex="0"><code${langClass}>${escapeHtml(body.join('\n'))}</code></pre>`,
    next: i + 1,
  };
};

const parseHeading = (match, ctx) => {
  const level = match[1].length;
  const id = uniqueId(match[2], ctx);
  return `<h${level} id="${escapeHtml(id)}">${renderInline(match[2], ctx)}</h${level}>`;
};

const parseBlockquote = (lines, start, ctx) => {
  const inner = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (RE.quote.test(line)) {
      inner.push(line.replace(RE.quote, ''));
    } else if (line.trim() !== '' && inner[inner.length - 1]?.trim() && !isBlockStart(line)) {
      // '>' 없이 이어지는 줄은 앞 문단에 붙인다
      inner.push(line);
    } else {
      break;
    }
    i++;
  }
  return { html: `<blockquote>\n${parseBlocks(inner, ctx)}\n</blockquote>`, next: i };
};

const renderListItem = (itemLines, ctx) => {
  let j = 0;
  while (j < itemLines.length && itemLines[j].trim() !== '' && (j === 0 || !isBlockStart(itemLines[j]))) j++;
  const text = renderInline(itemLines.slice(0, j).join('\n'), ctx);
  const rest = itemLines.slice(j);
  return rest.length ? `${text}\n${parseBlocks(rest, ctx)}` : text;
};

const parseList = (lines, start, ctx) => {
  const first = lines[start].match(RE.listItem);
  const baseIndent = first[1].length;
  const ordered = /\d/.test(first[2]);
  const isSameListItem = (match) => match && match[1].length <= baseIndent && /\d/.test(match[2]) === ordered;
  const items = [];
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    const item = line.match(RE.listItem);

    if (item && item[1].length <= baseIndent) {
      if (!isSameListItem(item)) break;
      items.push({ lines: [item[3]], contentIndent: item[1].length + item[2].length + 1 });
      i++;
      continue;
    }

    const current = items[items.length - 1];

    if (line.trim() === '') {
      const nextIndex = lines.findIndex((l, j) => j > i && l.trim() !== '');
      if (nextIndex === -1) break;
      const next = lines[nextIndex];
      if (isSameListItem(next.match(RE.listItem))) {
        i = nextIndex;
        continue;
      }
      if (indentOf(next) > baseIndent) {
        current.lines.push('');
        i++;
        continue;
      }
      break;
    }

    if (indentOf(line) > baseIndent) {
      current.lines.push(dedent(line, current.contentIndent));
      i++;
      continue;
    }

    if (!isBlockStart(line) && !isTableStart(lines, i)) {
      current.lines.push(line.trim());
      i++;
      continue;
    }

    break;
  }

  const tag = ordered ? 'ol' : 'ul';
  const startNumber = ordered ? parseInt(first[2], 10) : 1;
  const startAttr = startNumber !== 1 ? ` start="${startNumber}"` : '';
  const body = items.map((item) => `<li>${renderListItem(item.lines, ctx)}</li>`).join('\n');
  return { html: `<${tag}${startAttr}>\n${body}\n</${tag}>`, next: i };
};

const splitRow = (line) => line.trim()
  .replace(/^\|/, '')
  .replace(/\|$/, '')
  .split('|')
  .map((cell) => cell.trim());

const toAlign = (cell) => {
  const left = cell.startsWith(':');
  const right = cell.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return '';
};

const parseTable = (lines, start, ctx) => {
  const header = splitRow(lines[start]);
  const aligns = splitRow(lines[start + 1]).map(toAlign);
  const cell = (tag, text, index) => {
    const align = aligns[index] ? ` style="text-align: ${aligns[index]}"` : '';
    return `<${tag}${align}>${renderInline(text, ctx)}</${tag}>`;
  };

  const rows = [];
  let i = start + 2;
  while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
    rows.push(splitRow(lines[i]));
    i++;
  }

  const head = header.map((text, index) => cell('th', text, index)).join('');
  const body = rows
    .map((row) => `<tr>${header.map((_, index) => cell('td', row[index] ?? '', index)).join('')}</tr>`)
    .join('\n');

  return {
    html: `<div class="table-wrap" tabindex="0"><table>\n<thead><tr>${head}</tr></thead>\n<tbody>\n${body}\n</tbody>\n</table></div>`,
    next: i,
  };
};

const parseParagraph = (lines, start, ctx) => {
  const text = [lines[start]];
  let i = start + 1;
  while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i]) && !isTableStart(lines, i)) {
    text.push(lines[i]);
    i++;
  }
  return { html: `<p>${renderInline(text.map((line) => line.trimStart()).join('\n'), ctx)}</p>`, next: i };
};

const parseBlocks = (lines, ctx) => {
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i++;
      continue;
    }

    let block;
    const fence = line.match(RE.fence);
    const heading = line.match(RE.heading);

    if (fence) block = parseCodeBlock(lines, i, fence);
    else if (heading) block = { html: parseHeading(heading, ctx), next: i + 1 };
    else if (RE.hr.test(line)) block = { html: '<hr>', next: i + 1 };
    else if (RE.quote.test(line)) block = parseBlockquote(lines, i, ctx);
    else if (RE.listItem.test(line)) block = parseList(lines, i, ctx);
    else if (isTableStart(lines, i)) block = parseTable(lines, i, ctx);
    else block = parseParagraph(lines, i, ctx);

    html.push(block.html);
    i = block.next;
  }

  return html.join('\n');
};

// imageBase: 상대 경로 이미지 앞에 붙일 경로 (글 파일 기준으로 이미지를 쓰기 위해)
export const markdownToHtml = (markdown, { imageBase = '' } = {}) => {
  const lines = markdown.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  return parseBlocks(lines, { ids: new Map(), imageBase });
};
