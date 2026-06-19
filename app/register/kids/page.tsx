import RegistrationForm from '@/components/RegistrationForm';

export const metadata = {
  title: 'Εγγραφή παιδιού | Φροντιστήριο Ψαλτικής',
  description: 'Φόρμα δήλωσης ενδιαφέροντος για το παιδικό Φροντιστήριο Ψαλτικής.',
};

export default function KidsRegisterPage() {
  return (
    <div className="container container--flush-left section section--flush-left">
      <RegistrationForm kind="kids" />
    </div>
  );
}
