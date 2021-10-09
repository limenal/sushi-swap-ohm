import { ADDRESS_ZERO, BIG_DECIMAL_ZERO, MASTER_CHEF_ADDRESS, MINIMUM_USD_THRESHOLD_NEW_PAIRS, WHITELIST } from './utils/Constants'
import { Address, BigDecimal, BigInt, Bytes, dataSource, log, store } from '@graphprotocol/graph-ts'
import { Burn, Mint, Pair, Swap, Token, Transaction } from '../generated/schema'
import {
  Burn as BurnEvent,
  Mint as MintEvent,
  Pair as PairContract,
  Swap as SwapEvent,
  Sync as SyncEvent,
  Transfer as TransferEvent,
} from '../generated/templates/Pair/Pair'
import {
  createLiquidityPosition,
  createLiquidityPositionSnapshot,
  getBundle,
  getFactory,
  getPair,
  getToken,
  getUser,
  updateDayData,
  updatePairDayData,
  updatePairHourData,
  updateTokenDayData,
} from './entities/index'
// import { findEthPerToken, getEthPrice } from '../pricing'

import {SwapAdd} from "./utils/YearSwaps"


const BLACKLIST_EXCHANGE_VOLUME: string[] = [
  '0x9ea3b5b4ec044b70375236a281986106457b20ef', // DELTA
]

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD.
 * If both are, return average of two amounts
 * If neither is, return 0
 */
export function getTrackedVolumeUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token,
  pair: Pair
): BigDecimal {
  const bundle = getBundle()
  const price0 = token0.derivedETH.times(bundle.ethPrice)
  const price1 = token1.derivedETH.times(bundle.ethPrice)

  const network = dataSource.network()

  // if less than 5 LPs, require high minimum reserve amount amount or return 0
  if (pair.liquidityProviderCount.lt(BigInt.fromI32(5))) {
    const reserve0USD = pair.reserve0.times(price0)
    const reserve1USD = pair.reserve1.times(price1)
    if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
      if (reserve0USD.plus(reserve1USD).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return BIG_DECIMAL_ZERO
      }
    }
    if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
      if (reserve0USD.times(BigDecimal.fromString('2')).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return BIG_DECIMAL_ZERO
      }
    }
    if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
      if (reserve1USD.times(BigDecimal.fromString('2')).lt(MINIMUM_USD_THRESHOLD_NEW_PAIRS)) {
        return BIG_DECIMAL_ZERO
      }
    }
  }

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1)).div(BigDecimal.fromString('2'))
  }

  // take full value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0)
  }

  // take full value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1)
  }

  // neither token is on white list, tracked volume is 0
  return BIG_DECIMAL_ZERO
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedLiquidityUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  const bundle = getBundle()
  const price0 = token0.derivedETH.times(bundle.ethPrice)
  const price1 = token1.derivedETH.times(bundle.ethPrice)

  const network = dataSource.network()

  // both are whitelist tokens, take average of both amounts
  if (WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).plus(tokenAmount1.times(price1))
  }

  // take double value of the whitelisted token amount
  if (WHITELIST.includes(token0.id) && !WHITELIST.includes(token1.id)) {
    return tokenAmount0.times(price0).times(BigDecimal.fromString('2'))
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST.includes(token0.id) && WHITELIST.includes(token1.id)) {
    return tokenAmount1.times(price1).times(BigDecimal.fromString('2'))
  }

  // neither token is on white list, tracked volume is 0
  return BIG_DECIMAL_ZERO
}

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString('1')
  for (let i = BigInt.fromI32(0); i.lt(decimals as BigInt); i = i.plus(BigInt.fromI32(1))) {
    bd = bd.times(BigDecimal.fromString('10'))
  }
  return bd
}

export function convertTokenToDecimal(tokenAmount: BigInt, exchangeDecimals: BigInt): BigDecimal {
  if (exchangeDecimals == BigInt.fromI32(0)) {
    return tokenAmount.toBigDecimal()
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(exchangeDecimals))
}

function isCompleteMint(mintId: string): boolean {
  return Mint.load(mintId).sender !== null // sufficient checks
}

export function onTransfer(event: TransferEvent): void {
//   // ignore initial transfers for first adds
//   if (event.params.to == ADDRESS_ZERO && event.params.value.equals(BigInt.fromI32(1000))) {
//     return
//   }

//   const factory = getFactory()
//   const transactionHash = event.transaction.hash.toHex()

//   // Force creation of users if not already known will be lazily created
//   getUser(event.params.from)
//   getUser(event.params.to)

//   const pair = Pair.load(event.address.toHex())

//   // liquidity token amount being transfered
//   const value = event.params.value.divDecimal(BigDecimal.fromString('1e18'))

//   let transaction = Transaction.load(transactionHash)

//   if (transaction === null) {
//     transaction = new Transaction(transactionHash)
//     transaction.blockNumber = event.block.number
//     transaction.timestamp = event.block.timestamp
//     transaction.mints = new Array<string>()
//     transaction.burns = new Array<string>()
//     transaction.swaps = new Array<string>()
//   }

//   const mints = transaction.mints
//   const burns = transaction.burns

//   // 3 cases, mints, send first on ETH withdrawls, and burns

//   if (event.params.from == ADDRESS_ZERO) {
//     // mints

//     // update total supply
//     pair.totalSupply = pair.totalSupply.plus(value)
//     pair.save()

//     // If transaction has no mints or last mint is complete
//     if (transaction.mints.length == 0 || isCompleteMint(mints[mints.length - 1])) {
//       // log.warning('1-1: NO MINTS OR LAST MINT IS COMPLETE', [])
//       const mint = new Mint(event.transaction.hash.toHex().concat('-').concat(BigInt.fromI32(mints.length).toString()))
//       mint.pair = pair.id
//       mint.to = event.params.to
//       mint.liquidity = value
//       mint.timestamp = transaction.timestamp
//       mint.transaction = transaction.id
//       mint.save()

//       transaction.mints = mints.concat([mint.id])

//       // save entities
//       transaction.save()
//       factory.save()
//     }
//   } else if (event.params.to.toHex() == pair.id) {
//     // case where direct send first on ETH withdrawls
//     const burn = new Burn(
//       event.transaction.hash.toHex().concat('-').concat(BigInt.fromI32(transaction.burns.length).toString())
//     )
//     burn.pair = pair.id
//     burn.liquidity = value
//     burn.timestamp = transaction.timestamp
//     burn.to = event.params.to
//     burn.sender = event.params.from
//     burn.complete = false
//     burn.transaction = transaction.id
//     burn.save()

//     transaction.burns = transaction.burns.concat([burn.id])

//     transaction.save()
//   } else if (event.params.to == ADDRESS_ZERO && event.params.from.toHex() == pair.id) {
//     // burns
//     pair.totalSupply = pair.totalSupply.minus(value)
//     pair.save()

//     let burn: Burn | null = null

//     // If transaction has burns
//     if (transaction.burns.length) {
//       burn = Burn.load(burns[burns.length - 1])
//     }

//     // If no burn or burn complete, create new burn
//     if (burn === null || burn.complete) {
//       burn = new Burn(event.transaction.hash.toHex().concat('-').concat(BigInt.fromI32(burns.length).toString()))
//       burn.complete = true
//       burn.pair = pair.id
//       burn.liquidity = value
//       burn.transaction = transaction.id
//       burn.timestamp = transaction.timestamp
//     }

//     // if this logical burn included a fee mint, account for this
//     if (mints.length != 0 && !isCompleteMint(mints[mints.length - 1])) {
//       const mint = Mint.load(mints[mints.length - 1])

//       burn.feeTo = mint.to
//       burn.feeLiquidity = mint.liquidity

//       // remove the logical mint
//       store.remove('Mint', mints[mints.length - 1])

//       // update the transaction
//       transaction.mints = mints.slice(0, -1)
//       transaction.save()
//     }

//     burn.save()

//     if (!burn.complete) {
//       // Burn is not complete, replace previous tail
//       transaction.burns = burns.slice(0, -1).concat([burn.id])
//     } else {
//       // Burn is complete, concat to transactions
//       transaction.burns = burns.concat([burn.id])
//     }

//     transaction.save()
//   }

//   // BURN
//   if (event.params.from != ADDRESS_ZERO && event.params.from.toHex() != pair.id) {
//     const fromUserLiquidityPosition = createLiquidityPosition(event.params.from, event.address, event.block)

//     fromUserLiquidityPosition.liquidityTokenBalance = fromUserLiquidityPosition.liquidityTokenBalance.minus(value)

//     fromUserLiquidityPosition.save()

//     createLiquidityPositionSnapshot(fromUserLiquidityPosition, event.block)
//   }

//   // MINT
//   if (event.params.to != ADDRESS_ZERO && event.params.to.toHex() != pair.id) {
//     const toUserLiquidityPosition = createLiquidityPosition(event.params.to, event.address, event.block)

//     toUserLiquidityPosition.liquidityTokenBalance = toUserLiquidityPosition.liquidityTokenBalance.plus(value)

//     toUserLiquidityPosition.save()

//     createLiquidityPositionSnapshot(toUserLiquidityPosition, event.block)
//   }

//   transaction.save()
}

export function onSync(event: SyncEvent): void {
  const pair = getPair(event.address, event.block, null, null)

  if(pair != null)
  {
    var token0 = getToken(Address.fromString(pair.token0))
    var token1 = getToken(Address.fromString(pair.token1))
  
  }

  const factory = getFactory()

  // reset factory liquidity by subtracting only tracked liquidity
  if(pair != null)
  {
    if(token0 !== null && token1 !== null)
    {
      pair.reserve0 = convertTokenToDecimal(event.params.reserve0, token0.decimals)
      pair.reserve1 = convertTokenToDecimal(event.params.reserve1, token1.decimals)

    }
  }

  if (pair!==null) {
    if(pair.reserve1.notEqual(BIG_DECIMAL_ZERO))
    {
        pair.token0Price = pair.reserve0.div(pair.reserve1)
    }
  }

  if (pair !== null) {
    if(pair.reserve0.notEqual(BIG_DECIMAL_ZERO))
    {
        pair.token1Price = pair.reserve1.div(pair.reserve0)
    }
  }
  if(pair !== null)
  {
    pair.save()

  }

  // update ETH price now that reserves could have changed
 
//   token0.derivedETH = findEthPerToken(token0 as Token)
//   token1.derivedETH = findEthPerToken(token1 as Token)
  if(token0 !== null && token1 !== null)
  {
    token0.save()
    token1.save()
  
  }


  // use derived amounts within pair
  // now correctly set liquidity amounts for each token
  if(token0 !== null && token1 !== null && pair !== null)
  {
    token0.liquidity = token0.liquidity.plus(pair.reserve0)
    token1.liquidity = token1.liquidity.plus(pair.reserve1)
  
  }
  // save entities
  if(pair !== null)
  {
    pair.save()

  }
  if(factory !== null)
  {
    factory.save()

  }
  if(token0 !== null)
  {
    token0.save()

  }
  if(token1 !== null)
  {
    token1.save()

  }
}

export function onMint(event: MintEvent): void {
//   const transaction = Transaction.load(event.transaction.hash.toHex())

//   const mints = transaction.mints

//   const mint = Mint.load(mints[mints.length - 1])

//   const pair = getPair(event.address)

//   const factory = getFactory()

//   const token0 = getToken(Address.fromString(pair.token0))
//   const token1 = getToken(Address.fromString(pair.token1))

//   // update exchange info (except balances, sync will cover that)
//   const token0Amount = convertTokenToDecimal(event.params.amount0, token0.decimals)
//   const token1Amount = convertTokenToDecimal(event.params.amount1, token1.decimals)

//   // update tx counts
//   token0.txCount = token0.txCount.plus(BigInt.fromI32(1))
//   token1.txCount = token1.txCount.plus(BigInt.fromI32(1))

//   // get new amounts of USD and ETH for tracking
//   const bundle = getBundle()
//   const amountTotalUSD = token1.derivedETH
//     .times(token1Amount)
//     .plus(token0.derivedETH.times(token0Amount))
//     .times(bundle.ethPrice)

//   // update txn counts
//   pair.txCount = pair.txCount.plus(BigInt.fromI32(1))

//   factory.txCount = factory.txCount.plus(BigInt.fromI32(1))

//   // save entities
//   token0.save()
//   token1.save()
//   pair.save()
//   factory.save()

//   mint.sender = event.params.sender
//   mint.amount0 = token0Amount as BigDecimal
//   mint.amount1 = token1Amount as BigDecimal
//   mint.logIndex = event.logIndex
//   mint.amountUSD = amountTotalUSD as BigDecimal
//   mint.save()

//   // create liquidity position
//   const liquidityPosition = createLiquidityPosition(mint.to as Address, event.address, event.block)

//   // create liquidity position snapshot
//   createLiquidityPositionSnapshot(liquidityPosition, event.block)

//   // update day data
//   updateDayData(event)

//   // update pair day data
//   updatePairDayData(event)

//   // update pair hour data
//   updatePairHourData(event)

//   // update token0 day data
//   updateTokenDayData(token0 as Token, event)

//   // update token1 day data
//   updateTokenDayData(token1 as Token, event)
}

export function onBurn(event: BurnEvent): void {
//   const transactionHash = event.transaction.hash.toHex()
//   let transaction = Transaction.load(transactionHash)
//   const pair = getPair(event.address)

//   if (transaction === null) {
//     transaction = new Transaction(transactionHash)
//     transaction.blockNumber = event.block.number
//     transaction.timestamp = event.block.timestamp
//     transaction.mints = new Array<string>()
//     transaction.burns = new Array<string>()
//     transaction.swaps = new Array<string>()
//     transaction.save()
//   }

//   const burns = transaction.burns
//   let burn: Burn | null = null

//   // If transaction has burns
//   if (transaction.burns.length) {
//     burn = Burn.load(burns[burns.length - 1])
//   }

//   // If no burn or burn complete, create new burn
//   if (burn === null || burn.complete) {
//     burn = new Burn(event.transaction.hash.toHex().concat('-').concat(BigInt.fromI32(burns.length).toString()))
//     burn.complete = true
//     burn.pair = pair.id
//     burn.liquidity = BIG_DECIMAL_ZERO
//     burn.transaction = transaction.id
//     burn.timestamp = transaction.timestamp
//   }

//   const factory = getFactory()

//   //update token info
//   const token0 = getToken(Address.fromString(pair.token0))
//   const token1 = getToken(Address.fromString(pair.token1))

//   const token0Amount = convertTokenToDecimal(event.params.amount0, token0.decimals)
//   const token1Amount = convertTokenToDecimal(event.params.amount1, token1.decimals)

//   // update txn counts
//   token0.txCount = token0.txCount.plus(BigInt.fromI32(1))
//   token1.txCount = token1.txCount.plus(BigInt.fromI32(1))

//   // get new amounts of USD and ETH for tracking
//   const bundle = getBundle()
//   const amountTotalUSD = token1.derivedETH
//     .times(token1Amount)
//     .plus(token0.derivedETH.times(token0Amount))
//     .times(bundle.ethPrice)

//   // update txn counts
//   factory.txCount = factory.txCount.plus(BigInt.fromI32(1))
//   pair.txCount = pair.txCount.plus(BigInt.fromI32(1))

//   // update global counter and save
//   token0.save()
//   token1.save()
//   pair.save()
//   factory.save()

//   // update burn
//   // burn.sender = event.params.sender
//   burn.amount0 = token0Amount as BigDecimal
//   burn.amount1 = token1Amount as BigDecimal
//   // burn.to = event.params.to
//   burn.logIndex = event.logIndex

//   burn.amountUSD = amountTotalUSD as BigDecimal
//   burn.save()

}

export function onSwap(event: SwapEvent): void {
  log.info('onSwap', [])
  const pair = getPair(event.address, event.block, null, null)
  if(pair != null)
  {
    var token0 : Token | null = getToken(Address.fromString(pair.token0))
    var token1 : Token | null = getToken(Address.fromString(pair.token1))
  }
  if(token0 != null && token1 != null)
  {
    var amount0In = convertTokenToDecimal(event.params.amount0In, token0.decimals)
    var amount1In = convertTokenToDecimal(event.params.amount1In, token1.decimals)
    var amount0Out = convertTokenToDecimal(event.params.amount0Out, token0.decimals)
    var amount1Out = convertTokenToDecimal(event.params.amount1Out, token1.decimals)
  }

  // totals for volume updates
  const amount0Total = amount0Out.plus(amount0In)
  const amount1Total = amount1Out.plus(amount1In)

    let token0Price: BigDecimal = BIG_DECIMAL_ZERO
    let token1Price: BigDecimal = BIG_DECIMAL_ZERO

  if (pair!=null) {
    if(pair.reserve1.notEqual(BIG_DECIMAL_ZERO))
    {
        token0Price = pair.reserve0.div(pair.reserve1)
    }
  }

  if (pair != null) {
    if(pair.reserve0.notEqual(BIG_DECIMAL_ZERO))
    {
        token1Price = pair.reserve1.div(pair.reserve0)
    }
  }
  
  let transaction = Transaction.load(event.transaction.hash.toHex())

  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHex())
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.mints = []
    transaction.swaps = []
    transaction.burns = []
  }
  if(token0 !== null && token1 !== null)
  {
    
    SwapAdd(token0.symbol + '-' + token1.symbol, transaction.timestamp, amount0In, amount1In, amount0Out, amount1Out, token0Price, token1Price)

  }
  
}