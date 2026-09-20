import { Route, Routes } from 'react-router-dom';
import { RequireAuth } from './components/auth/RequireAuth';
import { AppShell } from './components/AppShell';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { CustomerNewPage } from './pages/CustomerNewPage';
import { CustomersPage } from './pages/CustomersPage';
import { HomePage } from './pages/HomePage';
import { HistoryPage } from './pages/HistoryPage';
import { LineUnmatchedPage } from './pages/LineUnmatchedPage';
import { ListPage } from './pages/ListPage';
import { QuoteEditPage } from './pages/QuoteEditPage';
import { LoginPage } from './pages/LoginPage';
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="lists/:rule" element={<ListPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/new" element={<CustomerNewPage />} />
          <Route path="customers/:id" element={<CustomerDetailPage />} />
          <Route path="quotes/:vehicleId" element={<QuoteEditPage />} />
          <Route path="line-unmatched" element={<LineUnmatchedPage />} />
          <Route path="history" element={<HistoryPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
