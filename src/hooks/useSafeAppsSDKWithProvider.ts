import { useMemo } from "react"
import { SafeAppProvider } from '@safe-global/safe-apps-provider';
import { useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk';
import { ethers } from "ethers"

const useSafeAppsSDKWithProvider = () => {
  const { sdk, safe, eth, connected } = useSafeAppsSDK()
  const provider = useMemo(() => new ethers.BrowserProvider(new SafeAppProvider(safe, sdk)), [sdk, safe]);
  return { sdk, safe, provider, eth, connected }
}

export default useSafeAppsSDKWithProvider
