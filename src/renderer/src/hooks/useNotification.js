import { useNotificationStore } from '../stores/useNotificationStore';

export function useNotification() {
  const { addNotification } = useNotificationStore();

  const getTypeFromMessage = (message) => {
    const msg = String(message).toLowerCase();
    if (msg.includes('✅') || msg.includes('successo') || msg.includes('aggiunto') || msg.includes('salvato') || msg.includes('eliminato') || msg.includes('aggiornato') || msg.includes('rinominato') || msg.includes('creato') || msg.includes('applicato')) {
      return 'success';
    }
    if (msg.includes('❌') || msg.includes('errore') || msg.includes('non valido') || msg.includes('scaduto') || msg.includes('negativa') || msg.includes('fallito')) {
      return 'error';
    }
    if (msg.includes('⚠')) {
      return 'warning';
    }
    return 'info';
  };

  const notify = (message, duration = 3000) => {
    const type = getTypeFromMessage(message);
    return addNotification(message, type, duration);
  };

  return { notify, addNotification };
}
