import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import LoadingPage from './components/LoadingPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminSetupPage = lazy(() => import('./pages/AdminSetupPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SubjectsPage = lazy(() => import('./pages/SubjectsPage'));
const SubjectDetailPage = lazy(() => import('./pages/SubjectDetailPage'));
const ModulesPage = lazy(() => import('./pages/ModulesPage'));
const QuickAccessPage = lazy(() => import('./pages/QuickAccessPage'));
const CodingPracticePage = lazy(() => import('./pages/CodingPracticePage'));
const ToolsPage = lazy(() => import('./pages/ToolsPage'));
const ToolDetailPage = lazy(() => import('./pages/ToolDetailPage'));
const CloudLearningPage = lazy(() => import('./pages/CloudLearningPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const ResumePage = lazy(() => import('./pages/ResumePage'));
const CertificatesPage = lazy(() => import('./pages/CertificatesPage'));
const CareerPreparationPage = lazy(() => import('./pages/CareerPreparationPage'));
const PublicPortfolioPage = lazy(() => import('./pages/PublicPortfolioPage'));
const DigitalLibraryPage = lazy(() => import('./pages/DigitalLibraryPage'));
const BookDetailPage = lazy(() => import('./pages/BookDetailPage'));
const BorrowingHistoryPage = lazy(() => import('./pages/BorrowingHistoryPage'));
const LibraryAdminPage = lazy(() => import('./pages/LibraryAdminPage'));
const ModulePreviewPage = lazy(() => import('./pages/ModulePreviewPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const modulePaths = [
  '/my-learning',
  '/lab-experiments',
  '/study-materials',
  '/references',
  '/images',
  '/assignments',
  '/quizzes-tests',
  '/datasets',
  '/settings',
];

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route path="/login" element={<Navigate to="/student/login" replace />} />
        <Route path="/student/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<LoginPage role="admin" />} />
        <Route path="/admin/setup" element={<AdminSetupPage />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/portfolio/:slug" element={<PublicPortfolioPage />} />
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="/admin/users/create" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsersPage /></ProtectedRoute>} />
          <Route path="/modules" element={<ModulesPage />} />
          <Route path="/coding-practice" element={<ProtectedRoute allowedRoles={['student']}><CodingPracticePage /></ProtectedRoute>} />
          <Route path="/tools" element={<ProtectedRoute allowedRoles={['student']}><ToolsPage /></ProtectedRoute>} />
          <Route path="/tools/:toolKey" element={<ProtectedRoute allowedRoles={['student']}><ToolDetailPage /></ProtectedRoute>} />
          <Route path="/cloud-aws" element={<ProtectedRoute allowedRoles={['student']}><CloudLearningPage /></ProtectedRoute>} />
          <Route path="/projects" element={<ProtectedRoute allowedRoles={['student']}><ProjectsPage /></ProtectedRoute>} />
          <Route path="/my-resume" element={<ProtectedRoute allowedRoles={['student']}><ResumePage /></ProtectedRoute>} />
          <Route path="/certificates" element={<ProtectedRoute allowedRoles={['student']}><CertificatesPage /></ProtectedRoute>} />
          <Route path="/career-preparation" element={<ProtectedRoute allowedRoles={['student']}><CareerPreparationPage /></ProtectedRoute>} />
          <Route path="/digital-library" element={<DigitalLibraryPage />} />
          <Route path="/digital-library/books/:bookId" element={<BookDetailPage />} />
          <Route path="/library/my-borrowing" element={<ProtectedRoute allowedRoles={['student']}><BorrowingHistoryPage /></ProtectedRoute>} />
          <Route path="/library/admin" element={<ProtectedRoute allowedRoles={['admin']}><LibraryAdminPage /></ProtectedRoute>} />
          <Route path="/my-subjects" element={<ProtectedRoute allowedRoles={['student']}><SubjectsPage /></ProtectedRoute>} />
          <Route path="/my-subjects/:subjectId" element={<ProtectedRoute allowedRoles={['student']}><SubjectDetailPage /></ProtectedRoute>} />
          <Route path="/quick-access" element={<QuickAccessPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route
            path="/my-profile"
            element={<ProtectedRoute allowedRoles={['student']}><ProfilePage /></ProtectedRoute>}
          />
          {modulePaths.map((path) => (
            <Route key={path} path={path} element={<ModulePreviewPage />} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
