const DEFAULT_FORM_EMAIL = 'stathisnikolaos@gmail.com';

export function getFormRecipientEmails() {
  const primary = process.env.REGISTRATION_EMAIL || DEFAULT_FORM_EMAIL;
  const secondary = process.env.FORMS_SECONDARY_EMAIL || '';

  return Array.from(
    new Set(
      [primary, secondary]
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}
