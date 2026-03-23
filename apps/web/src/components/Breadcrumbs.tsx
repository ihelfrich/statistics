import { Link } from 'react-router-dom'

export function Breadcrumbs({
  items,
}: {
  items: Array<{ label: string; to?: string }>
}) {
  return (
    <nav className="breadcrumb-row" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="breadcrumb-item">
          {item.to ? <Link to={item.to}>{item.label}</Link> : <strong>{item.label}</strong>}
          {index < items.length - 1 ? <span className="breadcrumb-sep">/</span> : null}
        </span>
      ))}
    </nav>
  )
}
