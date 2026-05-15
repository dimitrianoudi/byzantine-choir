export type StudentTestGroup = "kids" | "women" | "men";

export type StudentTestStudent = {
  id: string;
  name: string;
};

export const STUDENT_TEST_ROOT = "student-tests";

export const STUDENT_TEST_GROUPS: Record<
  StudentTestGroup,
  {
    label: string;
    courseLabel: string;
    students: StudentTestStudent[];
  }
> = {
  kids: {
    label: "Παιδικής Φωνής",
    courseLabel: "Α. Παιδικής Φωνής",
    students: [
      { id: "amprazi-nina", name: "Αμπράζη Νίνα" },
      { id: "mechteridis-loukas", name: "Μεχτερίδης Λουκάς" },
    ],
  },
  women: {
    label: "Γυναικείας Φωνής",
    courseLabel: "Β. Γυναικείας Φωνής",
    students: [
      { id: "karaoglou-panagiota", name: "Καράογλου Παναγιώτα" },
      { id: "karasaridou-varvara", name: "Καρασαρίδου Βαρβάρα" },
      { id: "chasapi-despoina", name: "Χασάπη Δέσποινα" },
      { id: "vourtsela-anastasia", name: "Βουρτσέλα Αναστασία" },
      { id: "samolada-glykeria", name: "Σαμολαδά Γλυκερία" },
      { id: "tereziou-athanasia", name: "Τερεζίου Αθανασία" },
      { id: "tsiadiou-sotiria", name: "Σωτηρία Τσιαδήμου" },
      { id: "katzouri-maria", name: "Κατζούρη Μαρία" },
      { id: "efraimidou-panagiota", name: "Εφραιμίδου Παναγιώτα" },
    ],
  },
  men: {
    label: "Ανδρικής Φωνής",
    courseLabel: "Γ. Ανδρικής Φωνής",
    students: [
      { id: "tzontas-konstantinos", name: "Τζόντας Κωνσταντίνος" },
      { id: "tzontas-athanasios", name: "Τζόντας Αθανάσιος" },
      { id: "katzigkas-stylianos", name: "Κατζιγκάς Στυλιανός" },
      { id: "rados-thomas", name: "Ράδος Θωμάς" },
      { id: "seferidis-pantelis", name: "Σεφερίδης Παντελής" },
      { id: "psathas-odysseas", name: "Ψαθάς Οδυσσέας" },
      { id: "tyritidis-georgios", name: "Τυριτίδης Γεώργιος" },
      { id: "katharopoulos-themistoklis", name: "Καθαρόπουλος Θεμιστοκλής" },
      { id: "rountos-konstantinos", name: "Ρούντος Κωνσταντίνος" },
      { id: "nimvroglou-nikolaos", name: "Νιμβρόγλου Νικόλαος" },
      { id: "raptidis-kyriakos", name: "Ραπτίδης Κυριάκος" },
      { id: "patridis-athanasios", name: "Πατρίδης Αθανάσιος" },
      { id: "apostolou-georgios", name: "Αποστόλου Γεώργιος" },
      { id: "christodoulidis-theodoros-1", name: "Χριστοδουλίδης Θεόδωρος" },
      { id: "konstantinou-panagiotis", name: "Κωνσταντίνου Παναγιώτης" },
      { id: "amprazis-asterios", name: "Αμπραζης Αστέριος" },
      { id: "saravakos-georgios", name: "Σαραβάκος Γεώργιος" },
      { id: "anoudis-dimitrios", name: "Ανούδης Δημήτριος" },
      { id: "moschos-fistas", name: "Μόσχος Φίστας" },
      { id: "tsiridis-georgios", name: "Τσιρίδης Γεώργιος" },
      { id: "klitsinikos-dionysios", name: "Κλιτσινίκος Διονύσιος" },
      { id: "giagkou-athanasios", name: "Γιάγκου Αθανάσιος" },
      { id: "angistalis-georgios", name: "Αγγιστάλης Γεώργιος" },
      { id: "samios-evangelos", name: "Σάμιος Ευάγγελος" },
      { id: "malioufas-georgios", name: "Μαλιούφας Γεώργιος" },
      { id: "avramidis-dionysis", name: "Αβραμίδης Διονύσης" },
      { id: "christodoulidis-theodoros-2", name: "Χριστοδουλίδης Θεόδωρος" },
      { id: "itsios-georgios", name: "Ίτσιος Γεώργιος" },
      { id: "koranas-vasileios", name: "Κοράνας Βασίλειος" },
    ],
  },
};

export function isStudentTestGroup(value: string): value is StudentTestGroup {
  return value === "kids" || value === "women" || value === "men";
}

export function studentTestBasePrefix(group: StudentTestGroup) {
  return `${STUDENT_TEST_ROOT}/${group}`;
}

export function getStudentTestGroup(group: StudentTestGroup) {
  return STUDENT_TEST_GROUPS[group];
}

export function getStudentTestStudent(group: StudentTestGroup, studentId: string) {
  return STUDENT_TEST_GROUPS[group].students.find((student) => student.id === studentId) ?? null;
}
