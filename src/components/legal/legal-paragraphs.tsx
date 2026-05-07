/** Split section body on blank lines into paragraphs for legal copy readability. */
export function LegalParagraphs({ text }: { text: string }) {
  const blocks = text
    .trim()
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);
  return (
    <div className="space-y-3 text-sm leading-7 text-slate-700">
      {blocks.map((b, i) => (
        <p key={i}>{b}</p>
      ))}
    </div>
  );
}
