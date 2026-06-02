export type StudentTestGroup = "kids" | "women" | "men";

export type StudentTestStudent = {
  id: string;
  name: string;
  emails?: string[];
};

export type StudentTestAccess = {
  group: StudentTestGroup;
  student: StudentTestStudent;
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
    courseLabel: "Παιδικής Φωνής",
    students: [
      { id: "amprazi-nina", name: "Αμπράζη Νίνα", emails: ["asterios.am@gmail.com"] },
      { id: "mechteridis-loukas", name: "Μεχτερίδης Λουκάς", emails: ["mexteioannis@yahoo.gr"] },
    ],
  },
  women: {
    label: "Γυναικείας Φωνής",
    courseLabel: "Γυναικείας Φωνής",
    students: [
      { id: "karaoglou-panagiota", name: "Καράογλου Παναγιώτα", emails: ["yiotakaraoglou@gmail.com"] },
      { id: "karasaridou-varvara", name: "Καρασαρίδου Βαρβάρα", emails: ["barbarakaras@yahoo.gr"] },
      { id: "chasapi-despoina", name: "Χασάπη Δέσποινα", emails: ["depi.jim@gmail.com"] },
      { id: "vourtsela-anastasia", name: "Βουρτσέλα Αναστασία", emails: ["vourtsela@gmail.com"] },
      { id: "samolada-glykeria", name: "Σαμολαδά Γλυκερία", emails: ["invivo1@gmail.com"] },
      { id: "tereziou-athanasia", name: "Τερεζίου Αθανασία", emails: ["athanasiatereziu@gmail.com"] },
      { id: "tsiadiou-sotiria", name: "Τσιαδήμου Σωτηρία", emails: ["sotidimos@gmail.com"] },
      { id: "katzouri-maria", name: "Κατζούρη Μαρία", emails: ["katzoumaroulita@gmail.com"] },
      { id: "efraimidou-panagiota", name: "Εφραιμίδου Παναγιώτα", emails: ["giotefrem@gmail.com"] },
    ],
  },
  men: {
    label: "Ανδρικής Φωνής",
    courseLabel: "Ανδρικής Φωνής",
    students: [
      { id: "tzontas-konstantinos", name: "Τζόντας Κωνσταντίνος" },
      { id: "tzontas-athanasios", name: "Τζόντας Αθανάσιος", emails: ["thano6tzo@gmail.com"] },
      { id: "katzigkas-stylianos", name: "Κατζιγκάς Στυλιανός", emails: ["stylianos.katz@gmail.com"] },
      { id: "rados-thomas", name: "Ράδος Θωμάς", emails: ["tomrados03@gmail.com"] },
      { id: "seferidis-pantelis", name: "Σεφερίδης Παντελής", emails: ["seferidisp@gmail.com"] },
      { id: "psathas-odysseas", name: "Ψαθάς Οδυσσέας", emails: ["odysseas040418@gmail.com"] },
      { id: "tyritidis-georgios", name: "Τυριτίδης Γεώργιος", emails: ["gtiritidis@gmail.com"] },
      { id: "katharopoulos-themistoklis", name: "Καθαρόπουλος Θεμιστοκλής", emails: ["themis.katha@gmail.com"] },
      { id: "rountos-konstantinos", name: "Ρούντος Κωνσταντίνος", emails: ["rountosk94@gmail.com"] },
      { id: "nimvroglou-nikolaos", name: "Νιμβρόγλου Νικόλαος", emails: ["niknimv@gmail.com"] },
      { id: "raptidis-kyriakos", name: "Ραπτίδης Κυριάκος", emails: ["kyriakosraptidis@gmail.com"] },
      { id: "patridis-athanasios", name: "Πατρίδης Αθανάσιος", emails: ["sakissalonika@hotmail.com"] },
      { id: "apostolou-georgios", name: "Αποστόλου Γεώργιος" },
      { id: "christodoulidis-theodoros-1", name: "Χριστοδουλίδης Θεόδωρος", emails: ["tchristodoulidis@gmail.com"] },
      { id: "konstantinou-panagiotis", name: "Κωνσταντίνου Παναγιώτης", emails: ["panagiotis.konstantinou@gmail.com"] },
      { id: "amprazis-asterios", name: "Αμπράζης Αστέριος", emails: ["asterios.am@gmail.com"] },
      { id: "saravakos-georgios", name: "Σαραβάκος Γεώργιος", emails: ["wargame685@gmail.com"] },
      { id: "anoudis-dimitrios", name: "Ανούδης Δημήτριος", emails: ["dimitrianoudi@gmail.com"] },
      { id: "moschos-fistas", name: "Μόσχος Φίστας", emails: ["mphistat@gmail.com"] },
      { id: "tsiridis-georgios", name: "Τσιρίδης Γεώργιος" },
      { id: "klitsinikos-dionysios", name: "Κλιτσινίκος Διονύσιος", emails: ["dionysisklitsinikos@gmail.com"] },
      { id: "giagkou-athanasios", name: "Γιάγκου Αθανάσιος", emails: ["thanosgiagkou@gmail.com"] },
      { id: "angistalis-georgios", name: "Αγγιστάλης Γεώργιος", emails: ["georgios.angistalis@gmail.com"] },
      { id: "samios-evangelos", name: "Σάμιος Ευάγγελος", emails: ["samiosco@yahoo.gr"] },
      { id: "malioufas-georgios", name: "Μαλιούφας Γεώργιος", emails: ["gmalioufas@yahoo.gr"] },
      { id: "avramidis-dionysis", name: "Αβραμίδης Διονύσης", emails: ["abramidi@yahoo.gr"] },
      { id: "itsios-georgios", name: "Ίτσιος Γεώργιος", emails: ["giorgositsios2@gmail.com"] },
      { id: "koranas-vasileios", name: "Κοράνας Βασίλειος", emails: ["koranas.v@gmail.com"] },
      { id: "jim-anoudis", name: "Δημήτρης Ανούδης Τέστ", emails: ["jimanoudis@gmail.com"] },

    ],
  },
};

export function isStudentTestGroup(value: string): value is StudentTestGroup {
  return value === "kids" || value === "women" || value === "men";
}

export function studentTestBasePrefix(group: StudentTestGroup) {
  return `${STUDENT_TEST_ROOT}/${group}`;
}

function sortStudentsBySurname(students: StudentTestStudent[]) {
  return [...students].sort((a, b) =>
    a.name.localeCompare(b.name, "el", { sensitivity: "base" })
  );
}

export function getStudentTestGroup(group: StudentTestGroup) {
  const config = STUDENT_TEST_GROUPS[group];
  return {
    ...config,
    students: sortStudentsBySurname(config.students),
  };
}

export function getStudentTestStudent(group: StudentTestGroup, studentId: string) {
  return STUDENT_TEST_GROUPS[group].students.find((student) => student.id === studentId) ?? null;
}

export function normalizeStudentEmail(email?: string | null) {
  const normalized = (email || "").trim().toLowerCase();
  const [localPart, domain] = normalized.split("@");

  if (!localPart || !domain) return normalized;

  if (domain === "gmail.com" || domain === "googlemail.com") {
    const canonicalLocal = localPart.split("+")[0].replace(/\./g, "");
    return `${canonicalLocal}@gmail.com`;
  }

  return normalized;
}

export function studentMatchesEmail(student: StudentTestStudent, email?: string | null) {
  const normalized = normalizeStudentEmail(email);
  if (!normalized) return false;
  return (student.emails || []).some((studentEmail) => normalizeStudentEmail(studentEmail) === normalized);
}

export function canAccessStudentTest(
  role: "member" | "admin" | undefined,
  email: string | undefined,
  group: StudentTestGroup,
  studentId: string
) {
  if (isStudentTestsAdmin(role, email)) return true;
  const student = getStudentTestStudent(group, studentId);
  return !!student && studentMatchesEmail(student, email);
}

const STUDENT_TEST_ADMIN_EMAILS = [
  "stathisnikolaos@gmail.com",
  "dimitrianoudi@gmail.com",
];

export function isStudentTestsAdmin(_role: "member" | "admin" | undefined, email?: string | null) {
  const normalized = normalizeStudentEmail(email);
  if (!normalized) return false;

  return STUDENT_TEST_ADMIN_EMAILS.includes(normalized);
}

export function getStudentTestAccessForEmail(email?: string | null): StudentTestAccess[] {
  const access: StudentTestAccess[] = [];

  for (const group of Object.keys(STUDENT_TEST_GROUPS) as StudentTestGroup[]) {
    for (const student of getStudentTestGroup(group).students) {
      if (studentMatchesEmail(student, email)) {
        access.push({ group, student });
      }
    }
  }

  return access;
}
