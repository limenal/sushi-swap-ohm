
const oneDay:number = 1000 * 60 * 60 * 24;


export function getNumberDayFromDate(date:Date): i64 {
    let supported=new Date(0);
    supported.setUTCFullYear(date.getUTCFullYear());
    return  Math.floor( Number.parseInt((date.getTime() -  supported.getTime()).toString()) /( oneDay )) as i64;
}