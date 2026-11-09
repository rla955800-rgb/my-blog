// 글 상단의 --- 로 감싼 key: value 메타데이터를 읽는다

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

const unquote = (value) => value.replace(/^(['"])(.*)\1$/, '$2');

export const toTags = (value) => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== 'string') return [];
  return value
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((tag) => unquote(tag.trim()))
    .filter(Boolean);
};

export const parseFrontMatter = (text) => {
  const source = text.replace(/^﻿/, '');
  const match = FRONT_MATTER.exec(source);
  if (!match) return { data: {}, body: source };

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^\s*([\w-]+)\s*:\s*(.*)$/.exec(line);
    if (!pair) continue;
    const [, key, raw] = pair;
    const value = unquote(raw.trim());
    data[key] = key === 'tags' ? toTags(value) : value;
  }

  return { data, body: source.slice(match[0].length) };
};
