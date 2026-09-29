import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import UploadReport from './pages/UploadReport';
import Analysis from './pages/Analysis';
import History from './pages/History';
import Settings from './pages/Settings';

const isElectron = typeof window !== 'undefined' && (
  window.location.protocol === 'file:' || 
  !!(window as any).isElectron || 
  navigator.userAgent.toLowerCase().includes('electron')
);
const Router = isElectron ? HashRouter : BrowserRouter;

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<UploadReport />} />
          <Route path="analysis/:id" element={<Analysis />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
