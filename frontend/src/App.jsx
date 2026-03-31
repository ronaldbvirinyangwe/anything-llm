import React, { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { AuthProvider } from "@/AuthContext";
import PrivateRoute, {
  AdminRoute,
  ManagerRoute,
} from "@/components/PrivateRoute";
import { AUTH_TOKEN } from "@/utils/constants";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Login from "@/pages/Login";
import SimpleSSOPassthrough from "@/pages/Login/SSO/simple";
import OnboardingFlow from "@/pages/OnboardingFlow";
import i18n from "./i18n";

import { PfpProvider } from "./PfpContext";
import { LogoProvider } from "./LogoContext";
import { FullScreenLoader } from "./components/Preloader";
import { ThemeProvider } from "./ThemeContext";
import KeyboardShortcutsHelp from "@/components/KeyboardShortcutsHelp";
import Register from "@/pages/Auth/Register";
import Enrol from "@/pages/Enrol/Enrol";
import PaymentPage from "./pages/PaymentPage/PaymentPage";
import Test from "./pages/QuizPage/Test";
import QuizPage from "./pages/QuizPage/QuizPage";
import ViewTest from "./pages/QuizPage/ViewTest";
import Reports from "./pages/Reports/Reports";
import TeacherDashboard from "./components/TeacherDashboard/TeacherDashboard";
import LessonPlanner from "./components/TeacherTools/LessonPlanner.jsx";
import SchemeOfWorkCreator from "./components/TeacherTools/SchemeofWorkCreator.jsx";
import ResourceFinder from "./components/TeacherTools/ResourceFinder.jsx";
import LinkStudent from "./components/TeacherTools/ LinkStudent.jsx";
import JoinClass from "./components/TeacherTools/JoinClass.jsx";
import StudentReport from "./components/TeacherTools/StudentReport";
import TeacherReport from "./components/TeacherTools/TeacherReports";
import QuizGenerator from "./components/TeacherTools/QuizGenerator.jsx";
import StudentQuiz from "./components/TeacherTools/StudentQuiz";
import PaymentHistory from "./components/Payments/PaymentHistory";
import PaymentManagement from "./components/Payments/PaymentManagement";
import ParentDashboard from "./components/Parents/ParentDashboard";
import LinkParent from "./components/Parents/LinkParent"
import GenerateLinkCode from "./components/Parents/GenerateLink";
import ParentReport from "./components/Parents/ParentReport";
import ExamPaperUpload from "./components/TeacherTools/ExamPaperUpload";
import StudentResults from "./components/TeacherTools/StudentResults";
import StudentResultDetail from "./components/TeacherTools/StudentResultDetail";
import TeacherStudentResults from "./components/TeacherTools/TeacherStudentResults";
import TeacherResultDetail from "./components/TeacherTools/TeacherResultDetail";
import TeacherQuizResults from "./components/TeacherTools/TeacherQuizResults";
import Pricing from "@/pages/Pricing";
import About from "@/pages/About";
import Blog from "@/pages/Blog";
import BestAiToolsZimbabwe2026 from "@/pages/Blog/BestAiToolsZimbabwe2026";
import HowToPassZimsecOLevelMaths from "@/pages/Blog/HowToPassZimsecOLevelMaths";
import Landing from "@/pages/Landing";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsofService";

const Main = lazy(() => import("@/pages/Main"));

function HomeRoute() {
  const token = localStorage.getItem(AUTH_TOKEN);
  if (token) return <PrivateRoute Component={Main} />;
  return <Landing />;
}
const InvitePage = lazy(() => import("@/pages/Invite"));
const WorkspaceChat = lazy(() => import("@/pages/WorkspaceChat"));
const AdminUsers = lazy(() => import("@/pages/Admin/Users"));
const AdminInvites = lazy(() => import("@/pages/Admin/Invitations"));
const AdminWorkspaces = lazy(() => import("@/pages/Admin/Workspaces"));
const AdminLogs = lazy(() => import("@/pages/Admin/Logging"));
const AdminAgents = lazy(() => import("@/pages/Admin/Agents"));
const GeneralChats = lazy(() => import("@/pages/GeneralSettings/Chats"));
const InterfaceSettings = lazy(
  () => import("@/pages/GeneralSettings/Settings/Interface")
);
const BrandingSettings = lazy(
  () => import("@/pages/GeneralSettings/Settings/Branding")
);

const ChatSettings = lazy(
  () => import("@/pages/GeneralSettings/Settings/Chat")
);

const GeneralApiKeys = lazy(() => import("@/pages/GeneralSettings/ApiKeys"));
const GeneralLLMPreference = lazy(
  () => import("@/pages/GeneralSettings/LLMPreference")
);
const GeneralTranscriptionPreference = lazy(
  () => import("@/pages/GeneralSettings/TranscriptionPreference")
);
const GeneralAudioPreference = lazy(
  () => import("@/pages/GeneralSettings/AudioPreference")
);
const GeneralEmbeddingPreference = lazy(
  () => import("@/pages/GeneralSettings/EmbeddingPreference")
);
const EmbeddingTextSplitterPreference = lazy(
  () => import("@/pages/GeneralSettings/EmbeddingTextSplitterPreference")
);
const GeneralVectorDatabase = lazy(
  () => import("@/pages/GeneralSettings/VectorDatabase")
);
const GeneralSecurity = lazy(() => import("@/pages/GeneralSettings/Security"));
const GeneralBrowserExtension = lazy(
  () => import("@/pages/GeneralSettings/BrowserExtensionApiKey")
);
const WorkspaceSettings = lazy(() => import("@/pages/WorkspaceSettings"));

const ChatEmbedWidgets = lazy(
  () => import("@/pages/GeneralSettings/ChatEmbedWidgets")
);
const PrivacyAndData = lazy(
  () => import("@/pages/GeneralSettings/PrivacyAndData")
);
const ExperimentalFeatures = lazy(
  () => import("@/pages/Admin/ExperimentalFeatures")
);
const LiveDocumentSyncManage = lazy(
  () => import("@/pages/Admin/ExperimentalFeatures/Features/LiveSync/manage")
);
const AgentBuilder = lazy(() => import("@/pages/Admin/AgentBuilder"));
const CommunityHubTrending = lazy(
  () => import("@/pages/GeneralSettings/CommunityHub/Trending")
);
const CommunityHubAuthentication = lazy(
  () => import("@/pages/GeneralSettings/CommunityHub/Authentication")
);
const CommunityHubImportItem = lazy(
  () => import("@/pages/GeneralSettings/CommunityHub/ImportItem")
);
const SystemPromptVariables = lazy(
  () => import("@/pages/Admin/SystemPromptVariables")
);
const MobileConnections = lazy(
  () => import("@/pages/GeneralSettings/MobileConnections")
);

export default function App() {
  return (
    <ThemeProvider>
      <Suspense fallback={<FullScreenLoader />}>
        <AuthProvider>
          <LogoProvider>
            <PfpProvider>
              <I18nextProvider i18n={i18n}>
                <Routes>
                  <Route path="/" element={<HomeRoute />} />
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/sso/simple"
                    element={<SimpleSSOPassthrough />}
                  />
                  <Route path="/register" element={<Register />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/best-ai-tools-homework-help-zimbabwe-2026" element={<BestAiToolsZimbabwe2026 />} />
                  <Route path="/blog/how-to-pass-zimsec-o-level-maths" element={<HowToPassZimsecOLevelMaths />} />
                  <Route path="/enrol" element={<Enrol />} />
                  <Route path="/payment" element={<PaymentPage />} />
                  <Route path="/test" element={<Test />} />
                  <Route path="/quiz" element={<QuizPage />} />
                  <Route path="/reports/:id" element={<Reports />} />
                   <Route path="/test/result/:id" element={<ViewTest readOnly={true} />} />
                    <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
                    <Route path="/teacher-tools/lesson-planner" element={<LessonPlanner />} />
                    <Route path="/teacher-tools/scheme-creator" element={<SchemeOfWorkCreator />} />
                    <Route path="/teacher-tools/resource-finder" element={<ResourceFinder />} />
                    <Route path="/teacher-tools/reports/:id" element={<Reports />} />
                    <Route path="/teacher/link-student" element={<LinkStudent />} />
                    <Route path="/join/:classCode" element={<JoinClass />} />
                   <Route path="/teacher/reports/student/:id" element={<StudentReport />} />
                    <Route path="/teacher/reports" element={<TeacherReport />} />
                    <Route path="/teacher-tools/quiz-generator" element={<QuizGenerator />} />
                    <Route path="/student/quiz/:quizCode" element={<StudentQuiz />} />
                    <Route path="/payments/manage" element={<PaymentManagement/ >} />
                    <Route path="/payments/history" element={<PaymentHistory/ >} />
                    <Route path="parent/dashboard" element={<ParentDashboard/ >} />
                    <Route path="/link-student" element={<LinkParent/ >} />
                    <Route path="/link-parent" element={<GenerateLinkCode/ >} />
                    <Route path="/parent/reports/:childId" element={<ParentReport/ >} />
                    <Route path="/upload-exam" element={<ExamPaperUpload/ >} />
<Route path="/student/results" element={<StudentResults />} />
<Route path="/student/result/:resultId" element={<StudentResultDetail />} />
<Route path="/teacher/reports/student/:studentId" element={<TeacherStudentResults />} />
<Route path="/teacher/result/:resultId" element={<TeacherResultDetail />} />
<Route path="/teacher/quiz-results/:quizId" element={<TeacherQuizResults />} />
<Route path="/teacher/quizzes" element={<TeacherQuizResults />} />
<Route path="/teacher/quizzes/:quizId" element={<TeacherQuizResults />} />
                  <Route
                    path="/workspace/:slug/settings/:tab"
                    element={<ManagerRoute Component={WorkspaceSettings} />}
                  />
                  <Route
                    path="/workspace/:slug"
                    element={<PrivateRoute Component={WorkspaceChat} />}
                  />
                  <Route
                    path="/workspace/:slug/t/:threadSlug"
                    element={<PrivateRoute Component={WorkspaceChat} />}
                  />
                  <Route path="/accept-invite/:code" element={<InvitePage />} />

                  {/* Admin */}
                  <Route
                    path="/settings/llm-preference"
                    element={<AdminRoute Component={GeneralLLMPreference} />}
                  />
                  <Route
                    path="/settings/transcription-preference"
                    element={
                      <AdminRoute Component={GeneralTranscriptionPreference} />
                    }
                  />
                  <Route
                    path="/settings/audio-preference"
                    element={<AdminRoute Component={GeneralAudioPreference} />}
                  />
                  <Route
                    path="/settings/embedding-preference"
                    element={
                      <AdminRoute Component={GeneralEmbeddingPreference} />
                    }
                  />
                  <Route
                    path="/settings/text-splitter-preference"
                    element={
                      <AdminRoute Component={EmbeddingTextSplitterPreference} />
                    }
                  />
                  <Route
                    path="/settings/vector-database"
                    element={<AdminRoute Component={GeneralVectorDatabase} />}
                  />
                  <Route
                    path="/settings/agents"
                    element={<AdminRoute Component={AdminAgents} />}
                  />
                  <Route
                    path="/settings/agents/builder"
                    element={
                      <AdminRoute
                        Component={AgentBuilder}
                        hideUserMenu={true}
                      />
                    }
                  />
                  <Route
                    path="/settings/agents/builder/:flowId"
                    element={
                      <AdminRoute
                        Component={AgentBuilder}
                        hideUserMenu={true}
                      />
                    }
                  />
                  <Route
                    path="/settings/event-logs"
                    element={<AdminRoute Component={AdminLogs} />}
                  />
                  <Route
                    path="/settings/embed-chat-widgets"
                    element={<AdminRoute Component={ChatEmbedWidgets} />}
                  />
                  {/* Manager */}
                  <Route
                    path="/settings/security"
                    element={<ManagerRoute Component={GeneralSecurity} />}
                  />
                  <Route
                    path="/settings/privacy"
                    element={<AdminRoute Component={PrivacyAndData} />}
                  />
                  <Route
                    path="/settings/interface"
                    element={<ManagerRoute Component={InterfaceSettings} />}
                  />
                  <Route
                    path="/settings/branding"
                    element={<ManagerRoute Component={BrandingSettings} />}
                  />
                  <Route
                    path="/settings/chat"
                    element={<ManagerRoute Component={ChatSettings} />}
                  />
                  <Route
                    path="/settings/beta-features"
                    element={<AdminRoute Component={ExperimentalFeatures} />}
                  />
                  <Route
                    path="/settings/api-keys"
                    element={<AdminRoute Component={GeneralApiKeys} />}
                  />
                  <Route
                    path="/settings/system-prompt-variables"
                    element={<AdminRoute Component={SystemPromptVariables} />}
                  />
                  <Route
                    path="/settings/browser-extension"
                    element={
                      <ManagerRoute Component={GeneralBrowserExtension} />
                    }
                  />
                  <Route
                    path="/settings/workspace-chats"
                    element={<ManagerRoute Component={GeneralChats} />}
                  />
                  <Route
                    path="/settings/invites"
                    element={<ManagerRoute Component={AdminInvites} />}
                  />
                  <Route
                    path="/settings/users"
                    element={<ManagerRoute Component={AdminUsers} />}
                  />
                  <Route
                    path="/settings/workspaces"
                    element={<ManagerRoute Component={AdminWorkspaces} />}
                  />
                  {/* Onboarding Flow */}
                  <Route path="/onboarding" element={<OnboardingFlow />} />
                  <Route
                    path="/onboarding/:step"
                    element={<OnboardingFlow />}
                  />

                  {/* Experimental feature pages  */}
                  {/* Live Document Sync feature */}
                  <Route
                    path="/settings/beta-features/live-document-sync/manage"
                    element={<AdminRoute Component={LiveDocumentSyncManage} />}
                  />

                  <Route
                    path="/settings/community-hub/trending"
                    element={<AdminRoute Component={CommunityHubTrending} />}
                  />
                  <Route
                    path="/settings/community-hub/authentication"
                    element={
                      <AdminRoute Component={CommunityHubAuthentication} />
                    }
                  />
                  <Route
                    path="/settings/community-hub/import-item"
                    element={<AdminRoute Component={CommunityHubImportItem} />}
                  />

                  <Route
                    path="/settings/mobile-connections"
                    element={<ManagerRoute Component={MobileConnections} />}
                  />
                </Routes>
                <ToastContainer />
                <KeyboardShortcutsHelp />
              </I18nextProvider>
            </PfpProvider>
          </LogoProvider>
        </AuthProvider>
      </Suspense>
    </ThemeProvider>
  );
}
