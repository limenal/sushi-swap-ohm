
import {getNumberDayFromDate} from './DatesSecond'
import { BigDecimal, BigInt, Bytes } from '@graphprotocol/graph-ts';
import {CustomPair, PairMinute, PairHour, PairDay, PairYear, Pair} from "../../generated/schema"

const SUFFIX = 'pair'

export function SwapAdd(token:string, timeStamp:BigInt, amount0In: BigDecimal, amount1In: BigDecimal, 
    amount0Out: BigDecimal, amount1Out: BigDecimal, price0: BigDecimal, price1: BigDecimal):void {

    let number:i64 =Number.parseInt(timeStamp.toString(),10) as i64;
    number*=1000;
    const date: Date = new Date( number);

    let year = PairYear.load(token+date.getUTCFullYear().toString()+SUFFIX);
    let lastYear =  PairYear.load(token+(date.getUTCFullYear()-1).toString()+SUFFIX);
    if(year==null){
        
        year= new PairYear(token+date.getUTCFullYear().toString()+SUFFIX);
        year.volumeToken0 = amount0Out.plus(amount0In)

        year.token0PriceOpen = price0
        year.token0Price = price0
        year.token0PriceLow = price0
        year.token0PriceHigh = price0

        year.token1PriceOpen = price1
        year.token1Price = price1
        year.token1PriceLow = price1
        year.token1PriceHigh = price1

        year.volumeToken1 = amount1Out.plus(amount1In)
        year.timestamp = timeStamp
        // year.sender.push(sender);
        year.save();
        
    }else {
        year.timestamp=timeStamp;

        year.token0Price = price0
        if(price0 > year.token0PriceHigh)
        {
            year.token0PriceHigh = price0
        }
        
        if(price0 < year.token0PriceLow)
        {
            year.token0PriceLow = price0
        }

        year.token1Price = price1
        if(price0 > year.token1PriceHigh)
        {
            year.token1PriceHigh = price1
        }
        
        if(price1 < year.token1PriceLow)
        {
            year.token1PriceLow = price1
        }


        year.volumeToken0 = year.volumeToken0.plus(amount0In).plus(amount0Out)
        
        year.volumeToken1 = year.volumeToken1.plus(amount1In).plus(amount1Out)

        // year.totalDeposit = counter.id
        year.save();
    }
    
    
    let days = year.dayPair;
    
    let day=PairDay.load(token+date.getUTCFullYear().toString()+"-"+getNumberDayFromDate(date).toString()+SUFFIX);
    
    if(day==null){
        day = new PairDay(token+date.getUTCFullYear().toString()+"-"+getNumberDayFromDate(date).toString()+SUFFIX);
        day.timestamp=timeStamp;
        day.token0PriceOpen = price0
        day.token0Price = price0
        day.token0PriceLow = price0
        day.token0PriceHigh = price0

        day.token1PriceOpen = price1
        day.token1Price = price1
        day.token1PriceLow = price1
        day.token1PriceHigh = price1
        // day.stakeCount = counter.stakeCount
        // day.unstakeCount = counter.unstakeCount
        day.volumeToken0 = amount0Out.plus(amount0In)
        day.volumeToken1 = amount1Out.plus(amount1In)
            
        // day.totalDeposit = counter.id
        day.save();
        days.push(day.id)
        year.dayPair = days
        year.save()
    }else {
        day.timestamp=timeStamp;
        
        // day.stakeCount = counter.stakeCount
        // day.unstakeCount = counter.unstakeCount
        day.token0Price = price0
        if(price0 > day.token0PriceHigh)
        {
            day.token0PriceHigh = price0
        }
        
        if(price0 < day.token0PriceLow)
        {
            day.token0PriceLow = price0
        }

        day.token1Price = price1
        if(price0 > day.token1PriceHigh)
        {
            day.token1PriceHigh = price1
        }
        
        if(price1 < day.token1PriceLow)
        {
            day.token1PriceLow = price1
        }
        
        day.volumeToken0 = day.volumeToken0.plus(amount0Out).plus(amount0In)
        day.volumeToken1 = day.volumeToken1.plus(amount1Out).plus(amount1In)

        // day.totalDeposit = counter.id
        // year.sender.push(sender);
        day.save();
    }
    
    let hours = day.hourPair;
    let hour = PairHour.load(token+date.getUTCFullYear().toString()+"-"+getNumberDayFromDate(date).toString()+"-"+date.getUTCHours().toString()+SUFFIX);
    if(hour==null) {
        hour = new PairHour(token+date.getUTCFullYear().toString()+"-"+getNumberDayFromDate(date).toString()+"-"+date.getUTCHours().toString()+SUFFIX);
        hour.timestamp=timeStamp;
        
        hour.token0PriceOpen = price0
        hour.token0Price = price0
        hour.token0PriceLow = price0
        hour.token0PriceHigh = price0

        hour.token1PriceOpen = price1
        hour.token1Price = price1
        hour.token1PriceLow = price1
        hour.token1PriceHigh = price1

        // hour.stakeCount = counter.stakeCount
        // hour.unstakeCount = counter.unstakeCount
        hour.volumeToken0 = amount0Out.plus(amount0In)
        hour.volumeToken1 = amount1Out.plus(amount1In)

        // hour.totalDeposit = counter.id
        // year.sender.push(sender);
        hour.save();
        hours.push(hour.id);
        day.hourPair=hours;
        day.save();
    }else {
        
        // hour.stakeCount = counter.stakeCount
        // hour.unstakeCount = counter.unstakeCount
        hour.volumeToken0 = hour.volumeToken0.plus(amount0Out).plus(amount0In)
        hour.volumeToken1 = hour.volumeToken0.plus(amount1Out).plus(amount1In)

        hour.token0Price = price0
        if(price0 > hour.token0PriceHigh)
        {
            hour.token0PriceHigh = price0
        }
        
        if(price0 < hour.token0PriceLow)
        {
            hour.token0PriceLow = price0
        }

        hour.token1Price = price1
        if(price0 > hour.token1PriceHigh)
        {
            hour.token1PriceHigh = price1
        }
        
        if(price1 < hour.token1PriceLow)
        {
            hour.token1PriceLow = price1
        }

        hour.timestamp=timeStamp;
        // hour.totalDeposit = counter.id
        // year.sender.push(sender);
        hour.save();
    }
    
    let minutes= hour.minutePair;
    let minute =PairMinute.load(token+date.getUTCFullYear().toString()+"-"+getNumberDayFromDate(date).toString()+"-"+date.getUTCHours().toString()+"-"+date.getUTCMinutes().toString()+SUFFIX);
    if(minute==null) {
        minute = new PairMinute(token+date.getUTCFullYear().toString()+"-"+getNumberDayFromDate(date).toString()+"-"+date.getUTCHours().toString()+"-"+date.getUTCMinutes().toString()+SUFFIX);
        minute.timestamp=timeStamp;
        

        minute.token0PriceOpen = price0
        minute.token0Price = price0
        minute.token0PriceLow = price0
        minute.token0PriceHigh = price0

        minute.token1PriceOpen = price1
        minute.token1Price = price1
        minute.token1PriceLow = price1
        minute.token1PriceHigh = price1
        // minute.stakeCount = counter.stakeCount
        // minute.unstakeCount = counter.unstakeCount
        minute.volumeToken0 = amount0Out.plus(amount0In)
        minute.volumeToken1 = amount1Out.plus(amount1In)

        // minute.totalDeposit = counter.id
        minute.save();
        minutes.push(minute.id);
        hour.minutePair=minutes;
        hour.save();
    }else {
        
        minute.token0Price = price0
        if(price0 > minute.token0PriceHigh)
        {
            minute.token0PriceHigh = price0
        }
        
        if(price0 < minute.token0PriceLow)
        {
            minute.token0PriceLow = price0
        }

        minute.token1Price = price1
        if(price0 > minute.token1PriceHigh)
        {
            minute.token1PriceHigh = price1
        }
        
        if(price1 < minute.token1PriceLow)
        {
            minute.token1PriceLow = price1
        }
        minute.volumeToken0 = minute.volumeToken0.plus(amount0Out).plus(amount0In)
        minute.volumeToken1 = minute.volumeToken0.plus(amount1Out).plus(amount1In)
        // minute.profit=minute!=null?minute.profit!=null?profit.plus(minute.profit):toDecimal(BigInt.zero(),0):toDecimal(BigInt.zero(),0);
        minute.timestamp=timeStamp;
        // minute.totalDeposit = counter.id
        minute.save();
    }

    // let seconds = minute.secondPair;
    // let second = CustomPair.load(token+date.getUTCFullYear().toString()+"-"+getNumberDayFromDate(date).toString()+"-"+date.getUTCHours().toString()+"-"+date.getUTCMinutes().toString()+"-"+date.getUTCSeconds().toString()+SUFFIX);//getUTCSeconds
    // if(second==null) {
        
    //     // second.stakeCount = counter.stakeCount
    //     // second.unstakeCount = counter.unstakeCount

    //     second.volumeToken0 = amount0Out.plus(amount0In)
    //     second.volumeToken1 = amount1Out.plus(amount1In)

    //     second.timestamp=timeStamp;
    //     // second.totalDeposit = counter.id
    //     second.save();
    //     seconds.push(second.id);
    //     minute.secondPair=seconds;
    //     minute.save();
    // }
    // else
    // {
        
    //     // second.stakeCount = counter.stakeCount
    //     // second.unstakeCount = counter.unstakeCount
    //     second.volumeToken0 = second.volumeToken0.plus(amount0Out).plus(amount0In)
    //     second.volumeToken1 = second.volumeToken1.plus(amount1Out).plus(amount1In)
    //     second.timestamp=timeStamp;
    //     // second.totalDeposit = counter.id
    //     second.save();
    // }
    
}
