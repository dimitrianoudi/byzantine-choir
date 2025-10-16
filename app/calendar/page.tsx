import CalendarView from '@/components/CalendarView';

export default function CalendarPage() {
  const events = [
    {
      id: '1',
      title: 'Μάθημα Ψαλτικής',
      startsAt: new Date().toISOString().slice(0, 10) + 'T19:00:00',
      location: 'Ναός Αγ. Αθανασίου',
    },
    {
      id: '2',
      title: 'Εγκαίνια Ναού',
      startsAt: (() => { const d = new Date(); d.setDate(d.getDate()+2); d.setHours(19,0,0,0); return d.toISOString(); })(),
      location: 'Ι.Ν. Αγ. Ιωσήφ',
    },
    {
      id: '3',
      title: 'Θεία Λειτουργία',
      startsAt: (() => { const d = new Date(); d.setDate(d.getDate()+5); d.setHours(8,30,0,0); return d.toISOString(); })(),
      location: 'Ι.Ν. Ευαγγελισμού',
    },
  ];

  return (
    <div className="container container--flush-left section section--flush-left">
      <CalendarView initialEvents={events} />
    </div>
  );
}
