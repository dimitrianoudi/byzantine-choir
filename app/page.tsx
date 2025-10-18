import SocialRegisterButton from "@/components/SocialRegisterButton";
import SectionDivider from "@/components/SectionDivider";

export default function HomePage() {
  return (
    <main className="container container--flush-left section section--flush-left">
      <div className="space-y-8 sm:space-y-10">   {/* <-- vertical gaps */}
        {/* Hero */}
        <section className="p-8 sm:p-10 text-center space-y-4">
          <h1 className="font-heading text-red" style={{ fontWeight: 800, fontSize: "clamp(22px, 3.2vw, 34px)" }}>
            Ψαλτική Παιδεία - Εκπαίδευση στη Βυζαντινή Μουσική
          </h1>
          <span className="font-heading text-muted" style={{ fontSize: "clamp(16px, 2.2vw, 20px)" }}>
            Ενορία Αγίου Αθανασίου &amp; Ευαγγελισμού Ευόσμου
          </span>
        </section>

        <SectionDivider />
        

        {/* Buttons */}
        <section className="stack">
          <div className="actions justify-center gap-4 sm:gap-6 block-gap">
            <SocialRegisterButton
              label="Ἐγγραφή για φυσική παρουσία στο Φροντιστήριο"
              className="btn btn-gold"
              redirectTo="/material"
            />
            <a href="/calendar" className="btn btn-outline">Πρόγραμμα</a>
          </div>
        </section>

        {/* Mission */}
        <section>
          <div className="mx-auto max-w-[760px] p-6 sm:p-8 text-center space-y-4">
            <h2 className="font-heading text-red" style={{ fontWeight: 700, fontSize: 20 }}>
              Αποστολή
            </h2>
            <p className="text-[15px] leading-relaxed text-muted max-w-lg mx-auto">
              Η Ψαλτική Παιδεία είναι ενοριακό πρόγραμμα της Ενορίας Αγίου Αθανασίου &amp; Ευαγγελισμού Ευόσμου.
              Στόχος μας είναι να σας βοηθήσουμε να καλλιεργήσετε τις μουσικές σας δεξιότητες και να συμμετάσχετε
              ενεργά στη λειτουργική ζωή της Ορθόδοξης Εκκλησίας.
            </p>
            <p className="text-[15px] leading-relaxed text-muted max-w-lg mx-auto">
              Η Ψαλτική Παιδεία δεν είναι μόνο μάθημα μουσικής∙ είναι τρόπος να ενωθείς με τη ζωντανή παράδοση της Εκκλησίας και να υπηρετήσεις το αναλόγιο με σιγουριά και ευπρέπεια. Στο μάθημα θα γνωρίσεις τα βασικά της βυζαντινής θεωρίας (ήχοι, μαθήματα, ρυθμός, σημειογραφία), θα καλλιεργήσεις την ακουστική σου αντίληψη και θα δουλέψεις σωστή φωνητική τοποθέτηση για υγιές και σταθερό ψάλσιμο. Με πρακτικές ασκήσεις και απλά παραδείγματα, μαθαίνεις να διαβάζεις, να ερμηνεύεις και να στέκεσαι στο αναλόγιο χωρίς άγχος.
            </p>
            <p className="text-[15px] leading-relaxed text-muted max-w-lg mx-auto">
              Παράλληλα, γίνεσαι μέλος μιας παρέας που αγαπά την κοινή λατρεία και το καλό ψάλσιμο. Θα μοιραζόμαστε υλικό, ηχογραφήσεις και μικρούς στόχους κάθε εβδομάδα, ώστε να βλέπεις καθαρή πρόοδο. Είτε ξεκινάς από την αρχή είτε θέλεις να βάλεις «τάξη» στις γνώσεις σου, το μάθημα θα σου δώσει σταθερό υπόβαθρο και χαρά στη διακονία: γνώση, ήθος, και μουσική έκφραση που υπηρετεί τον λόγο της προσευχής.
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}
