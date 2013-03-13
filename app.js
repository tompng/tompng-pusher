var express=require('express');
var app=express();



app.get('/',function(req,res){
  setTimeout(function(){res.send('rnd='+Math.random())},1000*req.query.time);
})

app.listen(process.env.PORT||3000);
