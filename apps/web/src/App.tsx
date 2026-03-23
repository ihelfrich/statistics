import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import { AppShell } from './components/index.ts'
import {
  AssessIndexPage,
  AssessmentPage,
  HomePage,
  LearnIndexPage,
  MeasurementPage,
  ModulePage,
  NotFoundPage,
  PracticeIndexPage,
  PracticeModulePage,
} from './pages/index.ts'

const basename = import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '')

function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="learn" element={<LearnIndexPage />} />
          <Route path="learn/:moduleKey" element={<ModulePage />} />
          <Route path="practice" element={<PracticeIndexPage />} />
          <Route path="practice/:moduleKey" element={<PracticeModulePage />} />
          <Route path="assess" element={<AssessIndexPage />} />
          <Route path="assess/:assessmentId" element={<AssessmentPage />} />
          <Route path="measurement" element={<MeasurementPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
