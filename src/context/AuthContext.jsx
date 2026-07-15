import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);
const STORAGE_KEY = 'pending_orders_employee';

const readStoredEmployee = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [employee, setEmployeeState] = useState(readStoredEmployee);

  const login = (employeeData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employeeData));
    setEmployeeState(employeeData);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setEmployeeState(null);
  };

  return (
    <AuthContext.Provider value={{ employee, isAuthenticated: Boolean(employee), login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
