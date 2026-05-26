interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

interface GoogleAccounts {
  id: {
    initialize(config: GoogleIdConfig): void;
    renderButton(element: HTMLElement, options: Record<string, unknown>): void;
    prompt(): void;
    disableAutoSelect(): void;
  };
}

interface Window {
  google?: {
    accounts: GoogleAccounts;
  };
}
