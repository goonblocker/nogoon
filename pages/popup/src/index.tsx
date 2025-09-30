import { createRoot } from 'react-dom/client';
import '@src/index.css';
import Popup from '@src/Popup';
import { PrivyProvider } from '@privy-io/react-auth';

function init() {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);

  root.render(
    <PrivyProvider
      appId={(import.meta as any).env?.VITE_PRIVY_APP_ID || 'cmg74h4sm0035le0c1k99b1gz'}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}>
      <Popup />
    </PrivyProvider>,
  );
}

init();
