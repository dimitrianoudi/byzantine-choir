import FeedbackForm from '@/components/FeedbackForm';

export const metadata = {
  title: 'Ερωτηματολόγιο Ανατροφοδότησης | Φροντιστήριο Ψαλτικής',
  description: 'Ερωτηματολόγιο ανατροφοδότησης για το Φροντιστήριο Ψαλτικής 2025-2026.',
};

export default function FeedbackPage() {
  return (
    <div className="container container--flush-left section section--flush-left">
      <FeedbackForm />
    </div>
  );
}
