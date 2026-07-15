import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import LoginPage from './pages/LoginPage';
import ScanOrderPage from './pages/ScanOrderPage';
import PendingOrdersPage from './pages/PendingOrdersPage';
import ReadyForCuttingPage from './pages/ReadyForCuttingPage';
import PendingToCuttingPage from './pages/PendingToCuttingPage';
import CancelRequestsPage from './pages/CancelRequestsPage';
import ShipOrderPage from './pages/ShipOrderPage';
import ShippedOrdersPage from './pages/ShippedOrdersPage';
import AllOrdersPage from './pages/AllOrdersPage';
import { useAuth } from './context/AuthContext';
import { OrdersOverviewProvider } from './context/OrdersOverviewContext';

const App = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <OrdersOverviewProvider>
      <div className="min-h-screen bg-slate-50 w-full">
        <Header />
        <main className="mx-auto max-w-7xl px-4 pb-6 pt-20 sm:px-6 md:pt-6 lg:px-8">
          <Routes>
            <Route path="/" element={<ScanOrderPage />} />
            <Route path="/pending" element={<PendingOrdersPage />} />
            <Route path="/ready-for-cutting" element={<ReadyForCuttingPage />} />
            <Route path="/pending-to-cutting" element={<PendingToCuttingPage />} />
            <Route path="/cancel-requests" element={<CancelRequestsPage />} />
            <Route path="/ship-order" element={<ShipOrderPage />} />
            <Route path="/shipped" element={<ShippedOrdersPage />} />
            <Route path="/all-orders" element={<AllOrdersPage />} />
          </Routes>
        </main>
      </div>
    </OrdersOverviewProvider>
  );
};

export default App;
