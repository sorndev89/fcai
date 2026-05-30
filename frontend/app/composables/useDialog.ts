export type AppDialogType = 'success' | 'warning' | 'info' | 'error';

export interface AppDialogAction {
  label: string;
  value?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface AppDialogOptions {
  type?: AppDialogType;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  actions?: AppDialogAction[];
  persistent?: boolean;
}

interface AppDialogState extends Required<Omit<AppDialogOptions, 'actions' | 'message'>> {
  id: number;
  open: boolean;
  message: string;
  actions: AppDialogAction[];
}

type DialogResolver = (value: boolean) => void;

const defaultActions: Record<AppDialogType, AppDialogAction[]> = {
  success: [{ label: 'ຕົກລົງ', value: true, variant: 'primary' }],
  info: [{ label: 'ຕົກລົງ', value: true, variant: 'primary' }],
  error: [{ label: 'ປິດ', value: false, variant: 'danger' }],
  warning: [
    { label: 'ຍົກເລີກ', value: false, variant: 'secondary' },
    { label: 'ຢືນຢັນ', value: true, variant: 'danger' },
  ],
};

function createDialogState(options: AppDialogOptions): AppDialogState {
  const type = options.type || 'info';
  const actions = options.actions || [
    ...(options.cancelLabel ? [{ label: options.cancelLabel, value: false, variant: 'secondary' as const }] : []),
    { label: options.confirmLabel || defaultActions[type][defaultActions[type].length - 1].label, value: true, variant: type === 'warning' || type === 'error' ? 'danger' : 'primary' },
  ];

  return {
    id: Date.now(),
    open: true,
    type,
    title: options.title,
    message: options.message || '',
    actions: actions.length ? actions : defaultActions[type],
    confirmLabel: options.confirmLabel || 'ຕົກລົງ',
    cancelLabel: options.cancelLabel || 'ຍົກເລີກ',
    persistent: options.persistent || false,
  };
}

export function useDialog() {
  const dialog = useState<AppDialogState | null>('app-dialog-state', () => null);
  const resolver = useState<DialogResolver | null>('app-dialog-resolver', () => null);

  function open(options: AppDialogOptions) {
    dialog.value = createDialogState(options);

    return new Promise<boolean>((resolve) => {
      resolver.value = resolve;
    });
  }

  function close(value = false) {
    if (resolver.value) {
      resolver.value(value);
    }
    resolver.value = null;
    if (dialog.value) {
      dialog.value.open = false;
    }
    setTimeout(() => {
      dialog.value = null;
    }, 150);
  }

  function success(title: string, message?: string) {
    return open({ type: 'success', title, message });
  }

  function info(title: string, message?: string) {
    return open({ type: 'info', title, message });
  }

  function error(title: string, message?: string) {
    return open({ type: 'error', title, message });
  }

  function warning(options: Omit<AppDialogOptions, 'type'>) {
    return open({ ...options, type: 'warning' });
  }

  return {
    dialog,
    open,
    close,
    success,
    info,
    error,
    warning,
  };
}
