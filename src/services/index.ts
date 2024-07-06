import { ethers } from "ethers"
import ModuleProxyFactoryAbi from "../contracts/abi/ModuleProxyFactory.json";
import RolesV2Abi from "../contracts/abi/RolesV2.json";

import { Interface } from "@ethersproject/abi"

import { abi as SafeAbi } from "@safe-global/safe-deployments/dist/assets/v1.3.0/gnosis_safe_l2.json"

import {
  Contract,
  getCreate2Address,
  AbiCoder,
  solidityPackedKeccak256,
  keccak256,
} from "ethers";

type JsonRpcProvider = ethers.providers.JsonRpcProvider

const ROLES_MASTER_COPY_ADDRESS = "0x9646fDAD06d3e24444381f44362a3B0eB343D337"
const MODULE_PROXY_FACTORY_ADDRESS = "0x000000000000aDdB49795b0f9bA5BC298cDda236"

const getModuleFactoryAndMasterCopy = (
  moduleName,
  provider
) => {
   
  const moduleMastercopy = new Contract(
    ROLES_MASTER_COPY_ADDRESS,
    RolesV2Abi,
    provider
  );

  const moduleFactory = new Contract(
    MODULE_PROXY_FACTORY_ADDRESS,
    ModuleProxyFactoryAbi,
    provider
  );

  return {
    moduleFactory,
    moduleMastercopy,
  };
};

const deployAndSetUpModule = async (
  moduleName,
  setupArgs: {
    types: Array;
    values: Array;
  },
  provider: Provider,
  saltNonce: string
): Promise<{
  transaction: { data: string; to: string; value: bigint };
  expectedModuleAddress: string;
}> => {

  const { moduleFactory, moduleMastercopy } = getModuleFactoryAndMasterCopy(
    moduleName,
    provider
  );

  //https://github.com/gnosisguild/zodiac/blob/1b16aca64f97521edd68534961686277d1f531f6/sdk/factory/moduleDeployer.ts#L112
  return getDeployAndSetupTx(
    moduleFactory,
    moduleMastercopy,
    setupArgs,
    saltNonce
  );
};

export const calculateProxyAddress = async (
  moduleFactory: Contract,
  mastercopyAddress: string,
  initData: string,
  saltNonce: string
): Promise<string> => {
  const mastercopyAddressFormatted = mastercopyAddress
    .toLowerCase()
    .replace(/^0x/, "");
  const byteCode =
    "0x602d8060093d393df3363d3d373d3d3d363d73" +
    mastercopyAddressFormatted +
    "5af43d82803e903d91602b57fd5bf3";

  const salt = solidityPackedKeccak256(
    ["bytes32", "uint256"],
    [solidityPackedKeccak256(["bytes"], [initData]), saltNonce]
  );

  return getCreate2Address(
    await moduleFactory.getAddress(),
    salt,
    keccak256(byteCode)
  );
};

const getDeployAndSetupTx = async (
  moduleFactory: Contract,
  moduleMastercopy: Contract,
  setupArgs: {
    types: Array;
    values: Array;
  },
  saltNonce: string
) => {
  const encodedInitParams = AbiCoder.defaultAbiCoder().encode(
    setupArgs.types,
    setupArgs.values
  );

  const moduleSetupData = moduleMastercopy.interface.encodeFunctionData(
    "setUp",
    [encodedInitParams]
  );

  console.log("moduleSetupData", moduleSetupData)

  const expectedModuleAddress = await calculateProxyAddress(
    moduleFactory,
    await moduleMastercopy.getAddress(),
    moduleSetupData,
    saltNonce
  );



  const deployData = moduleFactory.interface.encodeFunctionData(
    "deployModule",
    [await moduleMastercopy.getAddress(), moduleSetupData, saltNonce]
  );

  console.log("deployData", deployData)

  const transaction = {
    data: deployData,
    to: await moduleFactory.getAddress(),
    value: "0",
  };

  return {
    transaction,
    expectedModuleAddress,
  };
};

export const buildTransaction = (
  iface: Interface,
  to: string,
  method: string,
  params: [],
  value?: string,
) => {
  return {
    to,
    data: iface.encodeFunctionData(method, params),
    value: value || "0",
  }
}

export function enableModule(safeAddress: string, module: string) {
  return buildTransaction(new Interface(SafeAbi), safeAddress, "enableModule", [module])
}

export async function addMember(
    provider: JsonRpcProvider,
    roleModAddress: string,
    roleKey: string,
    account: string
) {

  const rolesContract = new Contract(
    roleModAddress,
    RolesV2Abi,
    provider
  )

  return [{
    data: rolesContract.interface.encodeFunctionData("assignRoles", [account, [roleKey], [true]]),
    to: roleModAddress,
    value: "0"
  }]
}

export async function deployRolesV2Modifier(
  provider: JsonRpcProvider,
  safeAddress: string,
  args: RolesV2ModifierParams,
) {
  const { target, multisend } = args
  const { transaction: deployAndSetupTx, expectedModuleAddress: expectedRolesAddress } =
    await deployAndSetUpModule(
      "roles_v2",
      {
        types: ["address", "address", "address"],
        values: [safeAddress, safeAddress, target],
      },
      provider,
      Date.now().toString(),
  )

  const enableModuleTx = enableModule(safeAddress, expectedRolesAddress)

  const rolesContract = new Contract(
    expectedRolesAddress,
    RolesV2Abi,
    provider
  )

  const MULTISEND_SELECTOR = "0x8d80ff0a"
  const MULTISEND_UNWRAPPER = "0x93B7fCbc63ED8a3a24B59e1C3e6649D50B7427c0"

  const setUnwrapperTxs = multisend.map((address) => ({
    to: rolesContract.target,
    data: rolesContract.interface.encodeFunctionData("setTransactionUnwrapper", [
      address,
      MULTISEND_SELECTOR,
      MULTISEND_UNWRAPPER,
    ]),
    value: "0",
  }))

  return [
    {
      ...deployAndSetupTx,
      value: "0"
    },
    enableModuleTx,
    ...setUnwrapperTxs,
  ]
}

export interface RolesV2ModifierParams {
  target: string
  multisend: string[]
}

const ROLES_MOD_QUERY = `
    query RolesMod($avatar: String) {
      rolesModifiers(where:{avatar: $avatar}){
        id
      }
    }
  `

const ROLE_MOD_QUERY = `
  query RolesMod($id: String) {
    rolesModifier(id: $id) {
      address
      owner
      avatar
      target 
      roles {
        key
        members {
          member {
            address
          }
        }
        targets {
          address
          clearance
          executionOptions
          functions {
            selector
            wildcarded
            executionOptions
          }
        }
      }
      unwrapAdapters(where: {selector: "0x8d80ff0a", adapterAddress: "0x93b7fcbc63ed8a3a24b59e1c3e6649d50b7427c0"}) {
        targetAddress
      }
    }
  }
`

export const fetchRoleMod = async (roleMod) => {
  const { data } = await fetch("https://api.studio.thegraph.com/proxy/23167/zodiac-roles-arbitrum-one/v2.2.3", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: ROLE_MOD_QUERY,
      variables: { id: roleMod.toLowerCase()},
      operationName: "RolesMod",
    }),
  }).then((res) => res.json())

  return data.rolesModifier
}

export const fetchRolesMod = async (safeAddress) => {
  const { data } = await fetch("https://api.studio.thegraph.com/proxy/23167/zodiac-roles-arbitrum-one/v2.2.3", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: ROLES_MOD_QUERY,
      variables: { avatar: safeAddress},
      operationName: "RolesMod",
    }),
  }).then((res) => res.json())

  const rolesModifiers = data.rolesModifiers.map((role) => {
    return role.id
  })

  return rolesModifiers[rolesModifiers.length - 1]
}
