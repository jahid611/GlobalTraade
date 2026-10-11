import React from 'react';

// Rendu sûr du Markdown léger de Globi : paragraphes, listes à puces, listes
// numérotées, gras. Tout passe par des nœuds React (aucun HTML injecté).

type Block =
  | { type: 'p'; lines: string[] }
  | { type: 'h'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; start: number; items: string[] };

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  // `open` : le dernier bloc peut encore recevoir des lignes (pas de ligne vide depuis).
  let open = false;
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) { open = false; continue; }
    const last = open ? blocks[blocks.length - 1] : undefined;

    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) { blocks.push({ type: 'h', text: heading[1] }); open = false; continue; }

    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      if (last?.type === 'ul') last.items.push(bullet[1]);
      else blocks.push({ type: 'ul', items: [bullet[1]] });
      open = true;
      continue;
    }

    const numbered = /^(\d{1,3})[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      if (last?.type === 'ol') last.items.push(numbered[2]);
      else blocks.push({ type: 'ol', start: Number(numbered[1]), items: [numbered[2]] });
      open = true;
      continue;
    }

    // Ligne indentée sous un élément de liste : suite de cet élément.
    if (last && (last.type === 'ul' || last.type === 'ol') && /^\s{2,}/.test(raw)) {
      last.items[last.items.length - 1] += ` ${line}`;
      continue;
    }

    if (last?.type === 'p') last.lines.push(line);
    else blocks.push({ type: 'p', lines: [line] });
    open = true;
  }
  return blocks;
}

// Gras `**…**`. Un gras encore ouvert en fin de texte (réponse en cours
// d'écriture) est déjà affiché en gras plutôt qu'avec ses astérisques.
function renderInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const pattern = /\*\*([^*]+?)\*\*|\*\*([^*]+)$/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > cursor) out.push(text.slice(cursor, match.index));
    out.push(<strong key={match.index} className="font-semibold text-white">{match[1] ?? match[2]}</strong>);
    cursor = pattern.lastIndex;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

export function AssistantMarkdown({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className="space-y-2.5">
      {blocks.map((block, i) => {
        if (block.type === 'h') return <p key={i} className="font-semibold text-white">{renderInline(block.text)}</p>;
        if (block.type === 'ul') {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1 marker:text-primary">
              {block.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
            </ul>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol key={i} start={block.start} className="list-decimal pl-5 space-y-1 marker:text-primary marker:font-medium">
              {block.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
            </ol>
          );
        }
        return (
          <p key={i}>
            {block.lines.map((line, j) => (
              <React.Fragment key={j}>{j > 0 && <br />}{renderInline(line)}</React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
