import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { formal_assessment_catalog } from '../data/assessmentData.ts'
import { useCourseProgress } from '../utils/progress.ts'

const primaryNav = [
  { to: '/', label: 'Home', exact: true },
  { to: '/learn', label: 'Learn' },
  { to: '/practice', label: 'Practice' },
  { to: '/assess', label: 'Assess' },
  { to: '/guide', label: 'Guide' },
]

function linkClassName(isActive: boolean) {
  return `shell-link ${isActive ? 'active' : ''}`
}

export function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const progress = useCourseProgress()

  return (
    <div className="site-shell">
      <aside className={`shell-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="shell-brand">
          <NavLink to="/" className="brand-mark">
            Statistics Studio
          </NavLink>
          <p>Probability, inference, and applied advertising analytics for real decisions.</p>
        </div>

        <nav className="shell-nav" aria-label="Primary">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => linkClassName(isActive)}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <section className="sidebar-panel">
          <span className="panel-label">Progress</span>
          <div className="sidebar-metric-grid">
            <div className="sidebar-metric">
              <strong>{progress.visited_modules.length}</strong>
              <span>modules visited</span>
            </div>
            <div className="sidebar-metric">
              <strong>{Object.keys(progress.checkpoint_results).length}</strong>
              <span>checkpoints scored</span>
            </div>
            <div className="sidebar-metric">
              <strong>{Object.keys(progress.formal_results).length}</strong>
              <span>diagnostics finished</span>
            </div>
          </div>
        </section>

        <section className="sidebar-panel">
          <span className="panel-label">Featured Diagnostics</span>
          <div className="sidebar-stack">
            {formal_assessment_catalog.map((entry) => (
              <NavLink
                key={entry.assessment_id}
                to={entry.route_path}
                className="sidebar-link-card"
                onClick={() => setMobileMenuOpen(false)}
              >
                <strong>{entry.title}</strong>
                <span>{entry.duration_minutes} minutes</span>
              </NavLink>
            ))}
          </div>
        </section>
      </aside>

      <div className="shell-main">
        <header className="shell-mobile-bar">
          <NavLink to="/" className="brand-mark compact">
            Statistics Studio
          </NavLink>
          <button
            type="button"
            className="secondary-button mobile-menu-button"
            onClick={() => setMobileMenuOpen((current) => !current)}
          >
            {mobileMenuOpen ? 'Close' : 'Menu'}
          </button>
        </header>

        <main className="page-main">
          <Outlet />
        </main>

        <footer className="app-footer">
          <p>&copy; {new Date().getFullYear()} Ian Helfrich. All rights reserved.</p>
          <p className="footer-license">
            This material is provided for individual personal educational use only. No part
            of this application, including code, visualizations, text, data, or design, may
            be copied, reproduced, distributed, modified, reverse-engineered, or used for
            commercial or derivative purposes without prior written permission from the author.
          </p>
        </footer>

        <nav className="mobile-bottom-nav" aria-label="Mobile primary navigation">
          {primaryNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => linkClassName(isActive)}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
