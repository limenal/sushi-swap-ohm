import { Address, ethereum } from '@graphprotocol/graph-ts'
import { BIG_DECIMAL_ZERO, BIG_INT_ZERO, FACTORY_ADDRESS } from '../utils/Constants'
import { Factory } from '../../generated/schema'

export function getFactory(id: Address = FACTORY_ADDRESS): Factory {
  let factory = Factory.load(id.toHex())

  if (factory === null) {
    factory = new Factory(id.toHex())
    factory.volumeETH = BIG_DECIMAL_ZERO
    factory.volumeUSD = BIG_DECIMAL_ZERO
    factory.untrackedVolumeUSD = BIG_DECIMAL_ZERO
    factory.liquidityETH = BIG_DECIMAL_ZERO
    factory.liquidityUSD = BIG_DECIMAL_ZERO
    factory.pairCount = BIG_INT_ZERO
    factory.txCount = BIG_INT_ZERO
    factory.tokenCount = BIG_INT_ZERO
    factory.save()
  }

  return factory as Factory
}

