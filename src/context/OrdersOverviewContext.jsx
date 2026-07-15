import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchAllPendingOrders, fetchStockList } from '../lib/api';
import { categorizeOrders } from '../lib/orderCategories';
import { fetchstyleDetailsFromGoogleSheet } from '../components/services/google_sheet.service';

const OrdersOverviewContext = createContext(null);

// Fetches the full order list + external stock list exactly once per session
// (instead of once per page visit) and shares the categorized result across
// every nav page via context.
export const OrdersOverviewProvider = ({ children }) => {
  const [orders, setOrders] = useState(null);
  const [stockList, setStockList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [googleSheetData, setGoogleSheetData] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchAllPendingOrders(), fetchStockList(), fetchstyleDetailsFromGoogleSheet()])
      .then(([ordersResult, stockResult, styles]) => {
        setOrders(ordersResult);
        setStockList(stockResult);
        setGoogleSheetData(styles);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = categorizeOrders(orders || [], stockList);

  const value = {
    ...categories,
    orders: orders || [],
    loading,
    error,
    reload: load,
    styles: googleSheetData,
  };

  return <OrdersOverviewContext.Provider value={value}>{children}</OrdersOverviewContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useOrdersOverview = () => {
  const ctx = useContext(OrdersOverviewContext);
  if (!ctx) {
    throw new Error('useOrdersOverview must be used within an OrdersOverviewProvider');
  }
  return ctx;
};

// custom hook for google sheet data fetching
// eslint-disable-next-line react-refresh/only-export-components
export const useGlobalContext = () => {
  return useContext(OrdersOverviewContext);
};
