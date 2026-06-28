import FeedbackForm from '@/components/FeedbackForm';
import { getSession } from '@/lib/session';

export const metadata = {
  title: 'Ερωτηματολόγιο Ανατροφοδότησης | Φροντιστήριο Ψαλτικής',
  description: 'Ερωτηματολόγιο ανατροφοδότησης για το Φροντιστήριο Ψαλτικής 2025-2026.',
};

export default async function FeedbackPage() {
  const session = await getSession();

  return (
    <div className="container container--flush-left section section--flush-left">
      <FeedbackForm initialEmail={session.user?.email || ''} />
    </div>
  );
}
