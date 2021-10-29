import { ADDRESS_ZERO, BIG_DECIMAL_ZERO, MASTER_CHEF_ADDRESS, MINIMUM_USD_THRESHOLD_NEW_PAIRS, WHITELIST } from './utils/Constants'
import { Address, BigDecimal, BigInt, Bytes, dataSource, log, store } from '@graphprotocol/graph-ts'
import { Burn, Mint, Pair, Swap, Token, Transaction } from '../generated/schema'
import {
  Swap as SwapEvent,
  Sync as SyncEvent,
  Transfer as TransferEvent,
  Mint as MintEvent,
  Burn as BurnEvent
} from '../generated/templates/Pair/Pair'
import {
  getBundle,
  getFactory,
  getPair,
  getToken,
} from './entities/index'

import {SwapAdd} from "./utils/YearSwaps"
import {getEthPrice, findEthPerToken} from "./utils/Pricing"


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
  const bundle = getBundle()
  // Pass the block so we can get accurate price data before migration
  if(bundle !== null)
  {
    bundle.ethPrice = getEthPrice(event.block)
  }
  bundle.save()  

  if(token0 !== null && token1 !== null)
  {
    token0.derivedETH = findEthPerToken(token0 as Token)
    token1.derivedETH = findEthPerToken(token1 as Token)
    token0.save()
    token1.save()

  }
  // get tracked liquidity - will be 0 if neither is in whitelist
  let trackedLiquidityETH: BigDecimal
  if(bundle !== null && pair !== null)
  {
    if (bundle.ethPrice.notEqual(BIG_DECIMAL_ZERO)) {
      trackedLiquidityETH = getTrackedLiquidityUSD(pair.reserve0, token0 as Token, pair.reserve1, token1 as Token).div(
        bundle.ethPrice
      )
    } else {
      trackedLiquidityETH = BIG_DECIMAL_ZERO
    }
  }
  

  // use derived amounts within pair
  if(pair !== null && token1 !== null && token0 !== null && bundle !== null)
  {
    pair.trackedReserveETH = trackedLiquidityETH
    pair.reserveETH = pair.reserve0
      .times(token0.derivedETH as BigDecimal)
      .plus(pair.reserve1.times(token1.derivedETH as BigDecimal))
    pair.reserveUSD = pair.reserveETH.times(bundle.ethPrice)  
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
    let swap = new Swap(transaction.id)
    swap.token0 = token0.symbol
    swap.token1 = token1.symbol
    swap.amount0In = amount0In
    swap.amount1In = amount1In
    swap.price = token1Price
    swap.timestamp = transaction.timestamp
    swap.save()
    SwapAdd(token0.symbol + '-' + token1.symbol, transaction.timestamp, amount0In, amount1In, amount0Out, amount1Out, token0Price, token1Price)

  }
  
}

export function onTransfer(event: TransferEvent): void {
}

export function onBurn(event: BurnEvent): void {
}

export function onMint(event: MintEvent): void {
}