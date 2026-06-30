import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './lib/store';
import { Toaster } from './components/ui/toaster';
import PageLoader from './components/PageLoader';
import Layout from './components/Layout';
import Login from './pages/Login';

const Patients = lazy(() => import('./pages/Patients'));
const Reporting = lazy(() => import('./pages/Reporting'));
const HFSDashboard = lazy(() => import('./pages/HFSDashboard'));
const HFS = lazy(() => import('./pages/HFS'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Users = lazy(() => import('./pages/Users'));
const Permissions = lazy(() => import('./pages/Permissions'));
const Roles = lazy(() => import('./pages/Roles'));
const Sites = lazy(() => import('./pages/Sites'));
const Devices = lazy(() => import('./pages/Devices'));
const QuestionManager = lazy(() => import('./pages/QuestionManager'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const Settings = lazy(() => import('./pages/Settings'));
const SurveyAnalysis = lazy(() => import('./pages/SurveyAnalysis'));
const ClientQuestionnaire = lazy(() => import('./pages/ClientQuestionnaire'));
const ProviderQuestionnaire = lazy(() => import('./pages/ProviderQuestionnaire'));
const SiteSelection = lazy(() => import('./pages/SiteSelection'));
const QRCodeGenerator = lazy(() => import('./pages/QRCodeGenerator'));

function PrivateRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  return token ? children : <Navigate to="/login" />;
}

function LazyPage({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/client" element={<Navigate to="/client/index/kh" replace />} />
        <Route path="/provider" element={<Navigate to="/provider/index/kh" replace />} />
        <Route
          path="/client/index/:locale?"
          element={
            <LazyPage>
              <SiteSelection />
            </LazyPage>
          }
        />
        <Route
          path="/provider/index/:locale?"
          element={
            <LazyPage>
              <SiteSelection />
            </LazyPage>
          }
        />
        <Route
          path="/client/:token/:locale?"
          element={
            <LazyPage>
              <ClientQuestionnaire />
            </LazyPage>
          }
        />
        <Route
          path="/client/:token/:locale/:uuid/:index"
          element={
            <LazyPage>
              <ClientQuestionnaire />
            </LazyPage>
          }
        />
        <Route
          path="/provider/:token/:locale?"
          element={
            <LazyPage>
              <ProviderQuestionnaire />
            </LazyPage>
          }
        />
        <Route
          path="/provider/:token/:locale/:uuid/:index"
          element={
            <LazyPage>
              <ProviderQuestionnaire />
            </LazyPage>
          }
        />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Layout>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/patients" replace />} />
                    <Route path="/patients" element={<Patients />} />
                    <Route path="/reporting" element={<Reporting />} />
                    <Route path="/hfs_dashboard" element={<HFSDashboard />} />
                    <Route path="/hfs" element={<HFS />} />
                    <Route path="/admin_dashboard" element={<AdminDashboard />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/permissions" element={<Permissions />} />
                    <Route path="/roles" element={<Roles />} />
                    <Route path="/sites" element={<Sites />} />
                    <Route path="/devices" element={<Devices />} />
                    <Route path="/questions" element={<QuestionManager />} />
                    <Route path="/survey-analysis" element={<SurveyAnalysis />} />
                    <Route path="/qr-codes" element={<QRCodeGenerator />} />
                    <Route path="/change_password" element={<ChangePassword />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Suspense>
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
