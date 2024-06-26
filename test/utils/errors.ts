export const ERRORS = {
  initialized: 'Initializable: contract is already initialized',
  zeroBridgeImplementation: 'BR_ASST_IMPL: zero address',
  ownerZeroAddress: 'Owner: zero address',
  accessControl: (account: string, role: string) =>
    `AccessControl: account ${account.toLowerCase()} is missing role ${role.toLowerCase()}`,
  arrayLengthExceedsLimit: 'Array length exceeds limit',
  zeroLengthArray: 'Zero length array',
  bridgeZeroAddressAtIndex: (index: number) => `Bridge zero address at index: ${index}`,
  bridgeDuplicateAtIndex: (index: number) =>
    `Bridge duplicate at index: ${index}`,
  tokenZeroAddressAtIndex: (index: number) => `Token zero address at index: ${index}`,
  bridgeNotFoundAtIndex: (index: number) => `Bridge not found at index: ${index}`,
  zeroLimit: 'Limit: zero',
  tokenZeroAddress: 'Token: zero address',
  invalidIndex: 'Invalid index',
  invalidOffsetLimit: 'Invalid offset-limit'
}
