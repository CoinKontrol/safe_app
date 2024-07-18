import { useState, useEffect } from 'react'
import useSafeAppsSDKWithProvider from "./hooks/useSafeAppsSDKWithProvider"
import { Description, Field, Fieldset, Input, Label, Legend } from '@headlessui/react'
import clsx from 'clsx'

import MultiSelect from './MultiSelect.tsx'
import TokenListDropdown from './TokenListDropdown.tsx'
import ToggleSwitch from './ToggleSwitch.tsx'
import FeeDropDown from './FeeDropDown.tsx'

import illustration from './assets/illustration.jpg'
import { c, processPermissions, checkIntegrity } from "zodiac-roles-sdk";


import { 
    deployRolesV2Modifier, 
    addMember,
    fetchRolesMod,
    fetchRoleMod
} from "./services"

function App() {
  const { sdk, safe, connected, provider } = useSafeAppsSDKWithProvider()

  const [selectedOptions, setSelectedOptions] = useState([]);
  const [selectedCowOptions, setSelectedCowOptions] = useState([]);

  const [editRole, setEditRole] = useState(false);
  const [erc20Permissions, setErc20Permissions] = useState([]);
  const [token0, setToken0] = useState({id: 0, address: "", name: "Select Token 0"});
  const [token1, setToken1] = useState({id: 1, address: "", name: "Select Token 1"});
  const [roleMod, setRoleMod] = useState(null);
  const [roles, setRoles] = useState(null);
  const [signature, setSignature] = useState(null);
  const [member, setMember] = useState(null);
  const [preset, setPreset] = useState(null);

  const [mintFeeTier, setMintFeeTier] = useState({value: 500, name: "0.05%"});
  const [mintEnabled, setMintEnabled] = useState(true);
  const [ercApprovalEnabled, setErcApprovalEnabled] = useState(true);
  const [collectEnabled, setCollectEnabled] = useState(true);
  const [increaseLiquidityEnabled, setIncreaseLiquidityEnabled] = useState(true);
  const [decreaseLiquidityEnabled, setDecreaseLiquidityEnabled] = useState(true);
  const [swapEnabled, setSwapEnabled] = useState(true);

  const ZODIAC_ROLES_APP_PROXY = "https://cors-proxy-withered-surf-4552.fly.dev/https://roles.gnosisguild.org";
  const ZODIAC_ROLES_APP = "https://roles.gnosisguild.org";

  const GPv2VAULT_RELAYER_ADDRESS = "0xC92E8bdf79f0507f65a392b0ab4667716BFE0110";
  const COWSWAP_ORDER_SIGNER_ADDRESS = "0x23dA9AdE38E4477b23770DeD512fD37b12381FAB";
  const UNISWAP_NFT_ADDRESS = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
  const MULTISEND_141 = "0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526" // used in latest Safes
  const MULTISEND_CALLONLY_141 = "0x9641d764fc13c8B624c04430C7356C1C7C8102e2" // used in latest Safes
  const [params, setParams] = useState(null)

  useEffect(() => {
    async function goFetchRolesMod() {
      const roleMod_ = await fetchRolesMod(safe.safeAddress)

      if (roleMod_) {
        const roleMod = await fetchRoleMod(roleMod_) 

        setRoleMod(roleMod)
        setRoles(roleMod.roles)
      }
    }

    if (safe && safe.safeAddress) {
        setParams({target: safe.safeAddress, multisend: [MULTISEND_141, MULTISEND_CALLONLY_141] })
        goFetchRolesMod()
    }
  }, [safe])

  const handleCowTokenApprovePermission = (option) => {
    const erc20CowSwapPermissions = option.map((token) => {
        return {
          targetAddress: token.value as `0x${string}`,
          signature: "approve(address,uint256)",
          condition: c.calldataMatches(
            [GPv2VAULT_RELAYER_ADDRESS],
            ["address", "uint256"]
          )
        }
    })

    setCowErc20Permissions(erc20CowSwapPermissions)
  }

  const handleTokenApprovePermission = (option) => {
    const erc20Permissions = option.map((token) => {
        return {
          targetAddress: token.value as `0x${string}`,
          signature: "approve(address,uint256)",
          condition: c.calldataMatches(
            [UNISWAP_NFT_ADDRESS],
            ["address", "uint256"]
          )
        }
    })

    const erc20CowSwapPermissions = option.map((token) => {
        return {
          targetAddress: token.value as `0x${string}`,
          signature: "approve(address,uint256)",
          condition: c.calldataMatches(
            [GPv2VAULT_RELAYER_ADDRESS],
            ["address", "uint256"]
          )
        }
    })

    const permissions = [...erc20Permissions, ...erc20CowSwapPermissions]

    setErc20Permissions(permissions)
  }

  const handleAddRolesModifier = async () => {
    try {
      const txs = await deployRolesV2Modifier(provider, safe.safeAddress, params)
      await sdk.txs.send({ txs })
    } catch (error) {
      console.log(error)
    }
  }

  const handleAddMember = async (roleKey, roleMod) => {
    try {
      const txs = await addMember(provider, roleMod, roleKey, member)
      await sdk.txs.send({ txs })
    } catch (error) {
      console.log(error)
    }
  }

  const postPermissions = async (permissions) => {
    const awaitedPermissions = await Promise.all(permissions);
    const { targets, annotations } = processPermissions(awaitedPermissions);
    checkIntegrity(targets);
  
    const res = await fetch(`${ZODIAC_ROLES_APP_PROXY}/api/permissions`, {
      method: "POST",
      body: JSON.stringify({ targets, annotations }),
    })

    const json = (await res.json());
    const { hash } = json;

    if (!hash) {
      throw new Error("Failed to post permissions");
    }

    return hash;
  };

  const handlePermissions = async () => {
    const mint = {
      targetAddress: UNISWAP_NFT_ADDRESS as `0x${string}`,
      signature: "mint((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256))",
      condition: c.calldataMatches(
        [ { token0: token0.address , token1: token1.address, fee: mintFeeTier.value } ],
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
    const collect = {
      targetAddress: UNISWAP_NFT_ADDRESS as `0x${string}`,
      signature: "collect((uint256,address,uint128,uint128))",
      condition: c.calldataMatches(
        [ { recipient: c.avatar } ],
        ['tuple(uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max)']
      )
    }

    const signOrder = {
      targetAddress: COWSWAP_ORDER_SIGNER_ADDRESS as `0x${string}`,
      signature: "signOrder((address,address,address,uint256,uint256,uint32,bytes32,uint256,bytes32,bool,bytes32,bytes32),uint32,uint256)",
      condition: c.calldataMatches(
        [{ 
            receiver: c.avatar, 
            // @ts-ignore
            sellToken: c.or(token0.address, token1.address),  
            // @ts-ignore
            buyToken: c.or(token1.address, token0.address) 
        }],
        ['tuple(address sellToken, address buyToken, address receiver, uint256 sellAmount, uint256 buyAmount, uint32 validTo, bytes32 appData, uint256 feeAmount, bytes32 kind, bool partiallyFillable, bytes32 sellTokenBalance, bytes32 buyTokenBalance)']
      ),
      delegatecall: true,
    }

    let permissions = []

    if (ercApprovalEnabled) {
      permissions = [...erc20Permissions]
    }

    if (mintEnabled) {
      permissions = [...permissions, mint]
    }

    if (collectEnabled) {
      permissions = [...permissions, collect]
    }

    if (increaseLiquidityEnabled) {
      permissions = [...permissions, increaseLiquidity]
    }

    if (decreaseLiquidityEnabled) {
      permissions = [...permissions, decreaseLiquidity]
    }

    if (swapEnabled) {
      permissions = [...permissions, signOrder]
    }

    const hash = await postPermissions(permissions);

    const modArg = `arb1:${roleMod.address}`;
    const roleArg = "position_management";
    const diffUrl = `${ZODIAC_ROLES_APP}/${modArg}/roles/${roleArg}/diff/${hash}`;

    const encodedAppUrl = encodeURIComponent(diffUrl);

    const chainPrefix = "arb1";
    const owner = safe.safeAddress;
    const safeUrl = `https://app.safe.global/apps/open?safe=${chainPrefix}:${owner}&appUrl=${encodeURIComponent(diffUrl)}`;

    window.open(safeUrl);
  }

  if (!safe || !connected) {
    return (
      <div className="bg-white text-center mt-10">
          <h2 className="text-4xl tracking-tight text-gray-900 sm:text-6xl mb-8">Coin<span className="font-bold">Kontrol</span></h2>
          <p className="mb-10 text-gray-500 text-lg leading-relaxed">This is a SAFE app that does not work outside the SAFE environment. <br/> Please open it from your SAFE account.</p>
          <img src={illustration} alt="CoinKontrol" className="rounded-2xl mx-auto" width={500}/>
      </div>
    )
  }

  if (roles && roles.length > 0) {
    return (
      <div className="flex p-8 bg-white">
        <div className="w-2/3 mr-8 ml-8 mt-8">
          <h2 className="text-4xl tracking-tight text-gray-900 sm:text-6xl">Coin<span className="font-bold">Kontrol</span></h2>

            <p className="mt-3 mb-3 pl-4 text-lg leading-8 text-gray-600 bg-gray-100 p-2 rounded-xl">
              Zodiac Mod: <strong>{roleMod.address}</strong>
            </p>

            <button
                type="button"
                onClick={() => setEditRole(true)}
                className="mt-6 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
            Edit Role
            </button>

          <h3 className="mt-6 text-xl tracking-tight text-gray-900 sm:text-3xl">Roles</h3>
           
          {roles.map((role) => ( 
            <div className="mt-4 bg-gray-100 p-4 rounded-xl" key={role.key}>
              <h3 className="text-lg font-semibold">Role Key</h3>
              <h4 className="text-md font-normal">{role.key}</h4>

              <h3 className="text-lg font-semibold mt-6">Members</h3>
              <p className="text-xs">Members are EOA or smart accounts that can execute the permissions associated with the role</p>
              <input onChange={(e) => setMember(e.target.value)} type="text" className="mt-2 mr-4 rounded-md bg-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm" placeholder="0x..." />
              <button
                type="button"
                onClick={() => handleAddMember(role.key, roleMod.address)}
                className="mt-2 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >Add member</button>

              <hr className="mt-4"></hr>

              {role.members.map((member) => (
                <div className="mt-2 bg-gray-200 p-2 rounded-xl" key={member.member.address}>
                  <p className="text-xs">{member.member.address}</p>
                </div>
              ))}
            </div>
          ))}

        </div>
        <div className="mt-8">
          <img src={illustration} alt="CoinKontrol" className="rounded-2xl" width={500}/>
        </div>
      </div>
    )
  }

  if (!roleMod) {
    return (
      <div className="flex p-8 bg-white">
        <div className="w-2/3 ml-8 mr-8 mt-8">
          <h2 className="text-4xl tracking-tight text-gray-900 sm:text-6xl">Coin<span className="font-bold">Kontrol</span></h2>

          <p className="mt-3 mb-3 text-lg leading-8 text-gray-600">
            No role modifier found. The Roles Modifier is a Safe module that once installed in your Safe, it allows you to create and manage roles for your Safe.
          </p>

            <button
                type="button"
                onClick={handleAddRolesModifier}
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
            Add Roles Modifier
            </button>
        </div>
        <div className="mt-8">
          <img src={illustration} alt="CoinKontrol" className="rounded-2xl" width={500}/>
        </div>
      </div>
      )
  }

  return (
    <div className="flex p-8 bg-white">
      <div className="w-2/3 ml-8 mt-8 mr-8">
        <h2 className="text-4xl tracking-tight text-gray-900 sm:text-6xl">Coin<span className="font-bold">Kontrol</span></h2>

        <p className="mt-3 mb-3 pl-4 text-lg leading-8 text-gray-600 bg-gray-100 p-2 rounded-xl">
          Zodiac Mod: <strong>{roleMod.address}</strong>
        </p>

        <p className="mt-3 mb-3 text-lg leading-8 text-gray-600">
          The following permissions are a preset for allowing a trustless third party to interact with UniswapV3 on your behalf.
          You allow the third party to mint, collect, increase and decrease liquidity on your behalf.
          After you create the preset you will be able to designate EOA or smart accounts as members of the role. The members
          are accounts that can execute the permissions associated with the role.
        </p>
        
       
        <div 
          className="bg-gray-50 border border-gray-200 p-4 rounded-lg mb-4">
          <h3 className="font-semibold mb-2 text-xl">Collect and Compound Role</h3>
          <p className="text-xs">Members can collect fees from the pool</p>
          <p className="text-xs">Members can swap between the pool tokens to rebalance</p>
          <p className="text-xs">Members can increse liquidity</p>

          <p className="mt-4">You can customize this role by switching off the permissions you do not want.</p>
        </div>

        <Fieldset className={`relative space-y-6 rounded-xl bg-gray-100 p-6 sm:p-10 ${swapEnabled ? "" : " bg-gray-50 text-gray-300" }`}>
          <div className="absolute top-5 right-5 flex items-center justify-end">
              <ToggleSwitch enabled={swapEnabled} setEnabled={setSwapEnabled} />
          </div>
          <Legend className="text-base/7 font-semibold">ERC20 Token Approval</Legend>
          <Field>
            <Label className="text-sm/6 font-medium">Tokens</Label>
            <Description className="text-sm/6">Select two or more tokens you have in your pool</Description>
            <div className="relative">
              <MultiSelect 
                selectedOptions={selectedOptions} 
                setSelectedOptions={setSelectedOptions} 
                callback={handleTokenApprovePermission}
              />
            </div>
          </Field>
        </Fieldset>

        <Fieldset className={`relative space-y-6 rounded-xl bg-gray-100 p-6 sm:p-10 mt-4 ${ercApprovalEnabled ? "" : " bg-gray-50 text-gray-300" }`}>
          <div className="absolute top-5 right-5 flex items-center justify-end">
              <ToggleSwitch enabled={ercApprovalEnabled} setEnabled={setErcApprovalEnabled} />
          </div>
          <Legend className="text-base/7 font-semibold">CowSwap</Legend>
          <p className="text-xs">This is required to rebalance the token pair before increasing liquidity. These are the same tokens you select in the ERC 20 approval.</p>
          <div className="flex">
            {selectedOptions && selectedOptions.map((token) => (
              <div key={token.label} className="mr-4 text-xs bg-zinc-200 border border-zinc-300 p-2 rounded-lg">
                {token.label}
              </div>
            ))}
          </div>
        </Fieldset>

        <Fieldset className={`relative space-y-6 rounded-xl bg-gray-100 p-6 sm:p-10 mt-4 ${mintEnabled ? "" : " bg-gray-50 text-gray-300"}`}>
          <div className="flex items-center justify-end absolute top-5 right-5">
              <ToggleSwitch enabled={mintEnabled} setEnabled={setMintEnabled} />
          </div>
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
            <FeeDropDown selected={mintFeeTier} setSelected={setMintFeeTier} />
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

        <Fieldset className={`relative space-y-6 rounded-xl bg-gray-100 p-6 sm:p-10 mt-4 ${collectEnabled ? "" : " bg-gray-50 text-gray-300" }`}>
          <div className="flex items-center justify-end absolute top-5 right-5">
            <ToggleSwitch enabled={collectEnabled} setEnabled={setCollectEnabled} />
          </div>
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

        <Fieldset className={`relative space-y-6 rounded-xl bg-gray-100 p-6 sm:p-10 mt-4 ${increaseLiquidityEnabled ? "" : " bg-gray-50 text-gray-300" }`}>
          <div className="flex items-center justify-end absolute top-5 right-5">
            <ToggleSwitch enabled={increaseLiquidityEnabled} setEnabled={setIncreaseLiquidityEnabled} />
          </div>
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

        <Fieldset className={`relative space-y-6 rounded-xl bg-gray-100 p-6 sm:p-10 mt-4 ${decreaseLiquidityEnabled ? "" : " bg-gray-50 text-gray-300" }`}>
          <div className="flex items-center justify-end absolute top-5 right-5">
            <ToggleSwitch enabled={decreaseLiquidityEnabled} setEnabled={setDecreaseLiquidityEnabled} />
          </div>
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
      <div className="mt-8">
        <img src={illustration} alt="CoinKontrol" className="rounded-2xl" width={500}/>
      </div>
    </div>
  )
}

export default App
