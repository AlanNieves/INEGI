import SavedForms from "../features/forms/SavedForms";
import LinkGenerator from "../features/links/LinkGenerator";
export default function HomePage({
 
  
}: {
  consentName: string | null;
  onOpenPrivacy: () => void;
}) {
  return (
    <main className="flex flex-col flex-1 justify-center items-center">
      <LinkGenerator />

      
      <SavedForms/>
    
      {/* Pie */}
      <div className="footer-inegi text-center">
        <p className="footer-text">© 2025 INEGI. Todos los derechos reservados.</p>
      </div>
    </main>
  );
}
