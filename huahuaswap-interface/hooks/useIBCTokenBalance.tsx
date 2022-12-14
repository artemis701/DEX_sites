import { SigningStargateClient } from '@cosmjs/stargate'
import { useQuery } from 'react-query'
import { useRecoilValue } from 'recoil'
import { convertMicroDenomToDenom } from 'util/conversion'
import { getOfflineSigner } from '@cosmostation/cosmos-client'
import { walletState } from '../state/atoms/walletAtoms'
import { DEFAULT_TOKEN_BALANCE_REFETCH_INTERVAL } from '../util/constants'
import { useIBCAssetInfo } from './useIBCAssetInfo'
import { useLocalStorage } from '@rehooks/local-storage'

export const useIBCTokenBalance = (tokenSymbol) => {
  const { address: nativeWalletAddress } = useRecoilValue(walletState)
  const ibcAsset = useIBCAssetInfo(tokenSymbol)
  const [selectedWalletType] = useLocalStorage('selectedWalletType')

  const { data: balance = 0, isLoading } = useQuery(
    [`ibcTokenBalance/${tokenSymbol}`, nativeWalletAddress],
    async () => {
      const { denom, decimals, chain_id, rpc, id } = ibcAsset;
      let amount: number = 0;

      if (selectedWalletType == 'keplr') {
        await window.keplr.enable(chain_id)
        const offlineSigner = await window.getOfflineSigner(chain_id)

        const wasmChainClient = await SigningStargateClient.connectWithSigner(
          rpc,
          offlineSigner
        )

        const [{ address }] = await offlineSigner.getAccounts()
        const coin = await wasmChainClient.getBalance(address, denom)
        amount = coin ? Number(coin.amount) : 0;
      } else if (selectedWalletType == 'ibc_wallet') {
        const offlineSigner = await getOfflineSigner(chain_id)
        const wasmChainClient = await SigningStargateClient.connectWithSigner(
          rpc,
          offlineSigner
        )

        const accout = await window.cosmostation.cosmos.request({
          method: 'cos_requestAccount',
          params: { chainName: id },
        })

        const coin = await wasmChainClient.getBalance(accout.address, denom)
        amount = coin ? Number(coin.amount) : 0;
      }


      return convertMicroDenomToDenom(amount, decimals)
    },
    {
      enabled: Boolean(nativeWalletAddress && ibcAsset),
      refetchOnMount: 'always',
      refetchInterval: DEFAULT_TOKEN_BALANCE_REFETCH_INTERVAL,
      refetchIntervalInBackground: true,
    }
  )

  return { balance, isLoading: isLoading }
}
