const express = require('express')
const bodyParser = require('body-parser')
const knex = require('./util/myKnex')
const timeDefference = require('./util/timediffer')
const port = 8838
const app = express()
let totleTime = 0       // 总时间, 在查询单条项目的时候计算出来
let expday = ''         // 当天的时间, 在新增单条数据时存储
let recorduuid = ''     // 将账号的唯一标识暴露出来

app.use(bodyParser.urlencoded({extended: false}))       // 使用post请求时, req.body能够获取到数据

// 设置允许所有域名跨域访问这个服务器
app.all("*",function(req,res,next){
    //设置允许跨域的域名，*代表允许任意域名跨域
    res.header("Access-Control-Allow-Origin","*");
    //允许的header类型
    res.header("Access-Control-Allow-Headers","content-type");
    //跨域允许的请求方式 
    res.header("Access-Control-Allow-Methods","DELETE,PUT,POST,GET,OPTIONS");
    if (req.method.toLowerCase() == 'options')
        res.send(200);  //让options尝试请求快速结束
    else
        next();
})

// 登陆了哪个账号的账号信息通过本地存储进行获取, 这始终是不安全的做法

// 首页新增数据: 上传任务，开始计时; 新增数据时将登录账号的唯一标识uuid上传上来
app.post('/record/upload', (request, response)=>{
    
    const {taskname, taskdesc, starttime, endtime, daynum} = request.body
    // console.log(taskname, taskdesc, starttime, endtime, daynum)
    if(taskname === undefined || starttime === undefined || endtime === undefined || daynum === undefined){
        response.send({
            code: 400,
            message: '有数据为空'
        })
    }else{
        // 单个项目所用的时间
        let time = timeDefference(starttime, endtime)
        
        knex('record').insert({taskname, taskdesc, starttime, endtime, daynum, onetime: time}).then(res=>{
            if(res === undefined){      // 若新增成功, 则res为新增成功的id
                response.send({
                    code: 400,
                    message: '新增失败, 请检查网络或服务器'
                })
            }else{
                response.send({
                    code: 200, 
                    message: '新增成功'
                })
                expday = daynum     // 在这里给 总结栏的数据进行展示
            }
        })
    }

})

// 日程页展示数据: 进行数据展示, 以及数据搜索
app.get('/record/show', (request, response)=>{
    const {daynum, q} = request.query        // get请求是从req.query中获取信息的, 

    if( daynum === undefined){
        if(q !== undefined){
            // 若是需要进行搜索的话，那就全局搜索吧，不管是否有日期了
            knex('record')
            .select('id', 'taskname', 'taskdesc', 'starttime', 'endtime', 'daynum', 'onetime')
            .where({isshow: 1})
            .andWhere('taskname', 'like', `%${q}%`)
            .then( res=>{
                // res为返回展示的数据
                if( res.length === 0 ){
                    response.send({
                        code: 400,
                        message: '暂时没有数据,搜索结果为空'
                    })
                }else{
                    response.send({
                        code: 200,
                        message: '数据搜索成功并展示成功',
                        data: res
                    })
                }
            } )
        }else{
            response.send({
                code: 400,
                message: '查询数据失败,原因是日期为空'
            })
        }
        
    }else{
        if(q === undefined){
            knex('record')
            .select('id', 'taskname', 'taskdesc', 'starttime', 'endtime', 'onetime')
            .where({isshow: 1})
            .andWhere({daynum})
            .then( res=>{
                // res为返回展示的数据
                response.send({
                    code: 200,
                    message: '数据展示成功',
                    data: res
                })
                
                // 计算总时间的, 在无参数查询时计算得来
                for(let obj of res){
                    totleTime += obj.onetime
                }

            } )
        }
    }

})

// 日程页修改: 对 单条任务日程 进行修改
app.post('/record/update', (request, response)=>{
    const {id, taskname, taskdesc} = request.body
    if(id === undefined || taskname === undefined || taskdesc === undefined){
        response.send({
            code: 400,
            message: '修改失败,因为没有接收到数据'
        })
    }else{
        knex('record').update({taskname, taskdesc}).where({id}).andWhere({isshow: 1}).then(res=>{
            if( res === 1 ){
                response.send({
                    code: 200,
                    message: '修改数据成功'
                })
            }else{
                response.send({
                    code: 400,
                    message: '修改数据失败,res值为0,请检查服务器'
                })
            }
        })
    }
})

// 日程页删除: 对 单条任务日程 进行删除(软删除)
app.post('/record/del', (request, response)=>{
    const {id} = request.body

    knex('record').update({isshow: 0}).where({id}).then( res=>{
        // res 为删除成功的数量
        if(res === 0){
            response.send({
                code: 400,
                message: '删除失败，请检查网络'
            })
        }else{
            response.send({
                code: 200,
                message: '数据删除成功'
            })
        }
    } )

})

// 日程页总结栏新增: 对 日程页的总结栏 进行新增 是summary这个表
app.post('/summary/totleinsert', (request, response)=>{
    const {exptitle, expcontent} = request.body

    // 若都为空,则要开始编辑
    if(exptitle === undefined || expcontent === undefined){
        response.send({
            code: 400,
            message: '数据上传失败,总结栏数据新增失败'
        })
    }else{
        knex('summary')
        .insert({exptitle, expcontent, totletime: totleTime, expday})   // expday是从全局变量获取的
        .then(res=>{
            if( res === undefined ){
                response.send({
                    code: 400,
                    message: '总结栏数据新增失败, 没有返回的id值,请检查服务器'
                })
            }else{
                response.send({
                    code: 200,
                    message: '总结栏数据添加成功'
                })
            }
            
        })
    
    }
})

// 日程页总结栏修改: 对 日程页的总结栏 进行修改 是summary这个表(不是record这个表)
app.post('/summary/totleupdate', (request, response)=>{
    // 这是用户上传的数据  postman时post过来的
    const {id, exptitle, expcontent, totletime} = request.body

    if(id === undefined || exptitle === undefined || expcontent === undefined){
        response.send({
            code: 400,
            message: '总结栏数据修改失败, 获取的数据为空'
        })
    }else{
        knex('summary')
        .update({exptitle, expcontent, totletime})
        .where({id})
        .then(res=>{
            if( res === 1 ){
                response.send({
                    code: 200,
                    message: '修改总结栏数据成功'
                })
            }else{
                response.send({
                    code: 400,
                    message: '修改数据失败,res为0,请检查服务器!'
                })
            }
        })
    }
    
})

// 日程页总结栏查询： 
app.get('/summary/select', (request, response)=>{
    response.setHeader('Access-Control-Allow-Origin', '*')
    knex('summary').select('exptitle', 'expcontent', 'totletime').then(res=>{
        response.send({
            code: 200,
            message:'总结栏数据查询成功',
            data: res
        })
    })
})

app.listen(port, ()=>{
    console.log('服务器已开启~端口号为:', port)
})
