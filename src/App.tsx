import { Routes, Route, Navigate } from "react-router-dom";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProtectedRoute from "./components/ProtectedRoute";
import DeckDetailPage from "./pages/DeckDetailPage";
import StudySessionPage from "./pages/StudySessionPage";
import FreeStudyPage from "./pages/FreeStudyPage";
import CsvImportPage from "./pages/CsvImportPage";
import SettingsPage from "./pages/SettingsPage"; // 1. Importe a nova página

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/decks/:deckId" element={<DeckDetailPage />} />
        <Route path="/decks/:deckId/study" element={<StudySessionPage />} />
        <Route path="/decks/:deckId/study-all" element={<FreeStudyPage />} />
        <Route path="/decks/:deckId/import" element={<CsvImportPage />} />
        <Route path="/settings" element={<SettingsPage />} />{" "}
        {/* 2. Adicione a nova rota */}
      </Route>
    </Routes>
  );
}

export default App;
