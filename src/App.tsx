import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'

import { useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk';

import { Description, Field, Fieldset, Input, Label, Legend, Select, Textarea } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import clsx from 'clsx'

import MultiSelect from './MultiSelect.tsx'
import TokenListDropdown from './TokenListDropdown.tsx'

import { 
    c, 
    processPermissions, 
    checkIntegrity,
    fetchRolesMod
} from "zodiac-roles-sdk";

function App() {
  const [count, setCount] = useState(0)
  const { sdk, connected, safe } = useSafeAppsSDK();
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [erc20Permissions, setErc20Permissions] = useState([]);
  const [token0, setToken0] = useState({id: 0, address: "", name: "Select Token 0"});
  const [token1, setToken1] = useState({id: 1, address: "", name: "Select Token 1"});
  const [roleMod, setRoleMod] = useState(null);

  const ZODIAC_ROLES_APP_PROXY = "https://cors-proxy-dawn-grass-8811.fly.dev/https://roles.gnosisguild.org";
  const ZODIAC_ROLES_APP = "https://roles.gnosisguild.org";
  const UNISWAP_NFT_ADDRESS = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"


  const QUERY = `
    query RolesMod($avatar: String) {
      rolesModifiers(where:{avatar: $avatar}){
        id
      }
    }
  `

  console.log(roleMod)

  useEffect(() => {
    async function fetchRolesMod() {
        const res = await fetch("https://api.studio.thegraph.com/proxy/23167/zodiac-roles-arbitrum-one/v2.2.3", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: QUERY,
            variables: { avatar: safe.safeAddress},
            operationName: "RolesMod",
          }),
        })

      const { data, error, errors } = await res.json()

      const rolesModifiers = data.rolesModifiers.map((role) => {
        return role.id
      })

      if (rolesModifiers.length > 0) {
        setRoleMod(rolesModifiers[rolesModifiers.length - 1])
      }
    }

    if (safe && safe.safeAddress) {
        fetchRolesMod()
    }
  }, [safe])

  const handleTokenApprovePermission = (option) => {
    const erc20Permissions = option.map((token) => {
        return {
          targetAddress: token.address as `0x${string}`,
          signature: "approve(address,uint256)",
          condition: c.calldataMatches(
            [UNISWAP_NFT_ADDRESS],
            ["address", "uint256"]
          )
        }
    })

    setErc20Permissions(erc20Permissions)
  }

  const postPermissions = async (permissions) => {
    const awaitedPermissions = await Promise.all(permissions);
    const { targets, annotations } = processPermissions(awaitedPermissions);

    checkIntegrity(targets);
  
    const res = await fetch(`${ZODIAC_ROLES_APP_PROXY}/api/permissions`, {
      method: "POST",
      body: JSON.stringify({ targets, annotations }),
    })

    const json = (await res.json()) as any;
    const { hash } = json;

    if (!hash) {
      console.error(json);
      throw new Error("Failed to post permissions");
    }

    return hash;
  };

  const handlePermissions = async () => {
    const mint = {
      targetAddress: UNISWAP_NFT_ADDRESS as `0x${string}`,
      signature: "mint((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256))",
      condition: c.calldataMatches(
        [ { token0: token0.address , token1: token1.address, fee: 500 } ],
        ['tuple(address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)']
      )
    }
    const increaseLiquidity = {
      targetAddress: UNISWAP_NFT_ADDRESS as `0x${string}`,
      signature: "increaseLiquidity((uint256,uint256,uint256,uint256,uint256,uint256))",
      condition: c.calldataMatches(
        [ { tokenId: c.avatarIsOwnerOfErc721 } ],
        ['tuple(uint256 tokenId, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, uint256 deadline)'] 
      ),
      send: true,
    }

    const decreaseLiquidity = {
      targetAddress: UNISWAP_NFT_ADDRESS as `0x${string}`,
      signature: "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256))",
      condition: c.calldataMatches(
        [ { tokenId: c.avatarIsOwnerOfErc721 } ],
        ['tuple(uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline)']
      )
    }
    const collect ={
      targetAddress: UNISWAP_NFT_ADDRESS as `0x${string}`,
      signature: "collect((uint256,address,uint128,uint128))",
      condition: c.calldataMatches(
        [ { recipient: c.avatar } ],
        ['tuple(uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max)']
      )
    }

    const permissions = [...erc20Permissions, collect, decreaseLiquidity, mint, increaseLiquidity]

    const hash = await postPermissions(permissions);

    const modArg = `arb1:${roleMod}`;
    const roleArg = "position_management";
    const diffUrl = `${ZODIAC_ROLES_APP}/${modArg}/roles/${roleArg}/diff/${hash}`;
    const chainPrefix = "arb1";
    const owner = safe.safeAddress;
    const safeUrl = `https://app.safe.global/apps/open?safe=${chainPrefix}:${owner}&appUrl=${encodeURIComponent(diffUrl)}`;

    window.open(safeUrl);
  }



  return (
    <div className="w-full p-8 bg-white">
      <div className="max-w-lg">
        <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">CoinControl</h2>

        <p className="mt-3 mb-3 text-lg leading-8 text-gray-600">
          Anim aute id magna aliqua ad ad non deserunt sunt. Qui irure qui lorem cupidatat commodo. Elit sunt amet
          fugiat veniam occaecat fugiat aliqua.
        </p>

        <h3 className="text-lg mb-4 font-bold">UniswapV3 Role</h3>

        <Fieldset className="space-y-6 rounded-xl bg-gray-100 p-6 sm:p-10">
          <Legend className="text-base/7 font-semibold">ERC20 Token Approval</Legend>
          <Field>
            <Label className="text-sm/6 font-medium">Tokens</Label>
            <Description className="text-sm/6">Select the tokens you want to add to LP</Description>
            <div className="relative">
              <MultiSelect 
                selectedOptions={selectedOptions} 
                setSelectedOptions={setSelectedOptions} 
                callback={handleTokenApprovePermission}
              />
            </div>
          </Field>
        </Fieldset>

        <Fieldset className="space-y-6 rounded-xl bg-gray-100 p-6 sm:p-10 mt-4">
          <Legend className="text-base/7 font-semibold">mint</Legend>

          {selectedOptions && selectedOptions.length > 0 &&<Field>
            <TokenListDropdown 
                items={selectedOptions} 
                label_text="Token 0" 
                selected={token0}
                setSelected={setToken0}
            />
          </Field>}

          {selectedOptions && selectedOptions.length > 0 &&<Field>
            <TokenListDropdown 
                items={selectedOptions} 
                label_text="Token 1" 
                selected={token1}
                setSelected={setToken1}
            />
          </Field>}

          <Field>
            <Label className="text-sm/6 font-medium">Fee</Label>
            <Input
              className={clsx(
                'mt-3 block w-full rounded-lg border-none bg-white py-1.5 px-3 text-sm/6',
                'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
              )}
            />
          </Field>

          <Field>
            <Label className="text-sm/6 font-medium">Recipient</Label>
            <Input
              defaultValue={safe.safeAddress}
              className={clsx(
                'mt-3 block w-full rounded-lg border-none bg-white py-1.5 px-3 text-sm/6',
                'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
              )}
            />
          </Field>
        </Fieldset>

        <Fieldset className="space-y-6 rounded-xl bg-gray-100 p-6 sm:p-10 mt-4">
          <Legend className="text-base/7 font-semibold">collect</Legend>

          <Field>
            <Label className="text-sm/6 font-medium">Recipient</Label>
            <Input
              defaultValue={safe.safeAddress}
              className={clsx(
                'mt-3 block w-full rounded-lg border-none bg-white py-1.5 px-3 text-sm/6',
                'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
              )}
            />
          </Field>
        </Fieldset>

        <Fieldset className="space-y-6 rounded-xl bg-gray-100 p-6 sm:p-10 mt-4">
          <Legend className="text-base/7 font-semibold">increaseLiquidity</Legend>

          <Field>
            <Label className="text-sm/6 font-medium">NFT ID</Label>
            <Input
              defaultValue={`only tokenId owned by SAFE`}
              className={clsx(
                'mt-3 block w-full rounded-lg border-none bg-white py-1.5 px-3 text-sm/6',
                'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
              )}
            />
          </Field>
        </Fieldset>

        <Fieldset className="space-y-6 rounded-xl bg-gray-100 p-6 sm:p-10 mt-4">
          <Legend className="text-base/7 font-semibold">decreaseLiquidity</Legend>

          <Field>
            <Label className="text-sm/6 font-medium">NFT ID</Label>
            <Input
              defaultValue={`only tokenId owned by SAFE`}
              className={clsx(
                'mt-3 block w-full rounded-lg border-none bg-white py-1.5 px-3 text-sm/6',
                'focus:outline-none data-[focus]:outline-2 data-[focus]:-outline-offset-2 data-[focus]:outline-white/25'
              )}
            />
          </Field>
        </Fieldset>

        <div className="mt-8 text-right">
            <button
                type="button"
                onClick={handlePermissions}
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
            Apply Role
            </button>
        </div>

      </div>
    </div>
  )
}

export default App
