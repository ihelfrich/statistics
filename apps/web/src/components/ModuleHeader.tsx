export function ModuleHeader({
  kicker,
  title,
  description,
}: {
  kicker: string
  title: string
  description: string
}) {
  return (
    <div className="module-header">
      <span className="panel-label">{kicker}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}
