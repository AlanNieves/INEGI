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
        <a
          href="https://www.inegi.org.mx/app/spc/guias.aspx"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link  inline-block underline hover:text-cyan-200 transition-colors mb-2"
        >
          https://www.inegi.org.mx/app/spc/guias.aspx
        </a>
      </div>
    </main>
  );
}
