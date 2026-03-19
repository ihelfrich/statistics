export function FormulaCard({ title, expression }: { title: string; expression: string }) {
  return (
    <div className="formula-card">
      <span>{title}</span>
      <code>{expression}</code>
    </div>
  )
}
