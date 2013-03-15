var express=require('express');
var request = require('request')
var app=express();
var dataArray=[]

function setWakeup(host,interval){
  var path='/wakeup'
  app.get(path,function(req,res){console.log(req.query);res.end()});
  setInterval(function(){
    request.get({uri:'http://'+host+path+'?'+Math.random()});
  },interval)
}
setWakeup("fierce-beach-8052.herokuapp.com",10*60*1000);

setInterval(function(){
  var option={uri:'http://housedata.herokuapp.com/?'+Math.random()}
  request.get(option,onData);
},60*1000);

function onData(err,result,data){
  var match=data.match(/気温: ([0-9.]+).+湿度: ([0-9.]+)/);
  var time=new Date().getTime();
  if(match){
    dataArray.push({time:time,temp:match[1],hum:match[2]});
  }
  while(dataArray.length&&dataArray[0].time<time-24*60*60*1000)dataArray.shift();
}

app.get('/data',function(req,res){
  var time=parseInt(req.query.time)||0
  var out=[];
  var p0=0,p1=dataArray.length;
  while(p0!=p1){
    var index=Math.floor((p0+p1)/2);
    var dtime=dataArray[index].time;
    if(dtime<=time){
      p0=index+1;
    }if(time<dtime){
      p1=index;
    }
  }
  res.end(JSON.stringify(dataArray.slice(p0)))
})

app.get('/',function(req,res){
  res.sendfile('index.html')
})



app.listen(process.env.PORT||3000);
