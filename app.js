var createError = require('http-errors');
var https = require('https');
var qs = require('qs');
var fs = require('fs');

var express = require('express');
var bodyParser = require("body-parser");
var formidable = require('formidable');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static('public'));

app.use('/', indexRouter);
app.use('/users', usersRouter);

//接口
app.listen(3030,()=>console.log('service start! localhost:3030'));

var access_token = '';

const param = qs.stringify({
    'grant_type': 'client_credentials',
    'client_id': 'uNGGUVkvZWYxa82ejLTLyBEI', 
    'client_secret': 'Dg9flDY8B5grd6VrD8yUn1SWjeGtHnQV' 
});

var base64 = function(imgName){
    //这是要对比的图片，百度api里png的图片和jpg的图片不能对比，需要统一格式
    var bitmap = fs.readFileSync(imgName)
    //图片转为 base64格式
    var base64str1 = new Buffer(bitmap).toString('base64')

    return base64str1
}

//请求access_token，一般有效时间29天
app.get('/token', function (req, res){
	https.get(
        {
            hostname: 'aip.baidubce.com',
            path: '/oauth/2.0/token?' + param,
            agent: false
        },
        function (res) {
            res.setEncoding('utf8')
            res.on('data',function (data) {
            //取得access_token
                access_token = JSON.parse(data).access_token;
                console.log(access_token)
            })
        }
    ).on('error', (e) => {
	  console.error(e);
	});
});

// app.get('/test/', function(req, res){
//     res.send('success!')
//     console.log('test request')
// })

//人脸检测
app.post('/detect', function (req, res) {
    var baiduRequest = function(imgStr){ 
        let  options = {
            host: 'aip.baidubce.com',
            path: '/rest/2.0/face/v3/detect?access_token="24.00217be20399123a0209d0f532c8c0d6.2592000.1575766938.282335-17617661"',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        }

        let contents = JSON.stringify(
            {
                image: imgStr.replace(/^data:image\/\w+\Wbase64,/, "").replace(/\s/g, "+"),
                image_type: "BASE64",
                face_field: 'age,beauty,gender'
            }
        )

        let req_baidu = https.request(options, function(res_baidu) {
            res_baidu.setEncoding('utf8')
            res_baidu.on('data', function (data) {
                console.log(data.replace(/[\r\n]/g,""))
                var str = JSON.parse(data.replace(/[\r\n]/g,""))
                res.json(str)
            }).on('error', function(err){
                res.send(err)
            })
        });

        req_baidu.write(contents)
        req_baidu.end()
    }

    var form = new formidable.IncomingForm();

    //form配置
    form.uploadDir = "./public/images";

    form.parse(req, function(err, fields, files){
        var imgStr = base64(files.file.path)

        baiduRequest(imgStr)
    })
});


//人脸对比    
app.post('/match', function (req, res) {
    var baiduRequest = function(imgStr0, imgStr1){ 
        let  options = {
            host: 'aip.baidubce.com',
            path: '/rest/2.0/face/v3/match?access_token="24.00217be20399123a0209d0f532c8c0d6.2592000.1575766938.282335-17617661"',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        }

        let contents = JSON.stringify([
            {
                image: imgStr0.replace(/^data:image\/\w+\Wbase64,/, "").replace(/\s/g, "+"),
                image_type: "BASE64"
            },{
                image: imgStr1.replace(/^data:image\/\w+\Wbase64,/, "").replace(/\s/g, "+"),
                image_type: "BASE64"
            }]
        )

        let req_baidu = https.request(options, function(res_baidu) {
            res_baidu.setEncoding('utf8')
            res_baidu.on('data', function (data) {
                console.log(data.replace(/[\r\n]/g,""))
                var str = JSON.parse(data.replace(/[\r\n]/g,""))
                res.json(str)
            })  
        });

        req_baidu.write(contents)
        req_baidu.end()
    }

    var form = new formidable.IncomingForm();

    //form配置
    form.uploadDir = "./public/images";

    form.parse(req, function(err, fields, files){
        var imgStr0 = base64(files.file0.path)
        var imgStr1 = base64(files.file1.path)
        console.log(imgStr1.substr(0,100))

        baiduRequest(imgStr0, imgStr1)
    })

});


//人脸搜索
app.post('/search', function (req, res) {
    var baiduRequest = function(imgStr){ 
        let  options = {
            host: 'aip.baidubce.com',
            path: '/rest/2.0/face/v3/multi-search?access_token="24.00217be20399123a0209d0f532c8c0d6.2592000.1575766938.282335-17617661"',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        }

        let contents = JSON.stringify(
            {
                image: imgStr.replace(/^data:image\/\w+\Wbase64,/, "").replace(/\s/g, "+"),
                image_type: "BASE64",
                group_id_list: 'a',
                match_threshold: 40,
                max_face_num: 5
            }
        )

        var send = function(data){
            res.send(data)
        }

        let req_baidu = https.request(options, function(res_baidu) {
            res_baidu.setEncoding('utf8')
            res_baidu.on('data', function (data) {
                console.log(data)
                send(data)
            })
        });

        req_baidu.write(contents)
        req_baidu.end()
    }

    var form = new formidable.IncomingForm();

    //form配置
    form.uploadDir = "./public/images";

    form.parse(req, function(err, fields, files){
        var imgStr = base64(files.file.path)

        baiduRequest(imgStr)
    })
});


var faceset = function(mode, image, group_id, user_id){
	let  options = {
        host: 'aip.baidubce.com',
        path: '/rest/2.0/face/v3/faceset/user/'+ mode + '?access_token="24.00217be20399123a0209d0f532c8c0d6.2592000.1575766938.282335-17617661"',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        }
    }

    let contents = JSON.stringify({
    	image: image,
    	image_type: 'BASE64',
    	group_id: group_id,
    	user_id: user_id
    })

    let req_baidu = https.request(options, function(req_baidu){
    	res_baidu.setEncoding('utf8')
        res_baidu.on('data', function (data) {
            //百度返回来的数据，有得分，直接发给html，在html中处理
            res.send(data)
        })
    }).on('error', function(err){
	  console.error(err);
	});
}

// //添加人脸用户
// faceset('add', image, 'a', 'a1')

// //更新人脸用户
// faceset('update', image, 'a', 'a1')

// //删除人脸用户
// faceset('delete', image, 'a', 'a1')


module.exports = app;
