# Βυζαντινή Χορωδία · Portal

Next.js (TypeScript) εφαρμογή για podcasts & PDF αρχεία μελών.

## Χαρακτηριστικά
- Προστατευμένη είσοδος με κοινόχρηστο κωδικό μέλους και ξεχωριστό κωδικό διαχειριστή
- Λίστα podcasts (MP3/M4A) και PDF από S3 συμβατό storage
- Προεπισκόπηση/αναπαραγωγή μέσω presigned URLs · λήψη αρχείων
- Σελίδα ανεβάσματος για τον δάσκαλο (admin)
- Μοντέρνο UI με Tailwind CSS
- Έτοιμο για deployment στο Vercel

## Περιβάλλον
Δημιουργήστε `.env.local` με:
```
# Iron Session
IRON_SESSION_PASSWORD=αλλάξτε_με_τουλάχιστον_32_χαρακτήρες
IRON_SESSION_COOKIE_NAME=choir_session

# Κωδικοί πρόσβασης
SHARED_CODE=κωδικός_μελών
ADMIN_CODE=κωδικός_διαχειριστή

# S3 / R2 / Backblaze κ.λπ.
S3_ENDPOINT=https://<endpoint>      # π.χ. https://<accountid>.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=byzantine-choir
S3_FORCE_PATH_STYLE=1               # προαιρετικό
```

## Εγκατάσταση
```
pnpm i    # ή npm i / yarn
pnpm dev  # http://localhost:3000
```

## Σημειώσεις
- Το αίτημα ανέφερε Vite + Next.js. Επισήμως το Next.js δεν χρησιμοποιεί Vite. Αν θέλετε καθαρό SPA με Vite, μπορούμε να δώσουμε εναλλακτικό template React+Vite με τα ίδια endpoints προς ένα Backend.
- Για μεγάλο όγκο αρχείων, σκεφτείτε οργάνωση σε φακέλους/prefix ανά μάθημα/ημερομηνία.
- Μπορείτε να βάλετε το site σε συγκεκριμένη διεύθυνση (π.χ. subdomain) μέσω Vercel domain settings.
```