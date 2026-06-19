import RegistrationForm from '@/components/RegistrationForm';

export const metadata = {
  title: 'Εγγραφή ενηλίκου | Φροντιστήριο Ψαλτικής',
  description: 'Φόρμα δήλωσης ενδιαφέροντος για ενήλικες στο Φροντιστήριο Ψαλτικής.',
};

export default function AdultsRegisterPage() {
  return (
    <div className="container container--flush-left section section--flush-left">
      <RegistrationForm kind="adults" />
    </div>
  );
}
