import {getNotificationManager} from '../components/Notifications';

class NotificationService {
  private manager = getNotificationManager();

  showSuccess(message: string, duration: number = 5000) {
    this.manager.showSuccess(message, true, duration);
  }

  showError(message: string, duration: number = 5000) {
    this.manager.showError(message, true, duration);
  }

  showErrorWithAction(message: string, actionLabel: string, actionCallback: () => void) {
    this.manager.showErrorWithAction(message, actionLabel, actionCallback, false);
  }
}

export const notificationService = new NotificationService();
