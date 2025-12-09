import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";
import PrivacyModal from "./components/PrivacyModal";
import Navbar from "./components/Navbar";
import { useLockBodyScroll } from "./hooks/useLockBodyScroll";
import HomePage from "./pages/HomePage";
import FormPage from "./pages/FormPage";
import AdminConvocatorias from "./pages/AdminConvocatorias";
import AdminAspirantes from "./pages/AdminAspirantes";
import ConvocatoriasPage from "./pages/admin/ConvocatoriasPage";
import ConcursosPage from "./pages/admin/ConcursosPage";
import EspecialistasPage from "./pages/admin/EspecialistasPage";

export default function App() {
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [consentName, setConsentName] = useState<string | null>(null);

  useLockBodyScroll(isPrivacyOpen);

  const handleAccept = ({ fullName }: { fullName: string }) => {
    setConsentName(fullName);
    setIsPrivacyOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="pt-16 flex-1">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                consentName={consentName}
                onOpenPrivacy={() => setIsPrivacyOpen(true)}
              />
            }
          />
          <Route path="/form/:token" element={<FormPage />} />
          <Route path="/admin/plazas" element={<AdminConvocatorias />} />
          <Route path="/admin/aspirantes" element={<AdminAspirantes />} />
          <Route path="/admin/convocatorias" element={<ConvocatoriasPage />} />
          <Route path="/admin/concursos" element={<ConcursosPage />} />
          <Route path="/admin/especialistas" element={<EspecialistasPage />} />
        </Routes>
      </div>
      <PrivacyModal open={isPrivacyOpen} onAccept={handleAccept} />
    </div>
  );
}
