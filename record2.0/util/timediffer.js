// 给总结栏模块计算总时间的
module.exports = function timeDefference(start, end){
    let one = end.split(':')
    let two = start.split(':')

    let num1 = one[0] - two[0]
    let num2 = one[1] - two[1]

    return num1*60 + num2
}

// module.exports = timeDefference

/* const DifferMinuteTime = function(startDate, endDate) { // 一分钟等于60000毫秒
	return Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / 60000)
}
let times = DifferMinuteTime(start, end)
console.log(times) */

