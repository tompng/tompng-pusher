var http=require('http');
var express=require('express');
var socketio=require('socket.io');
var app=express();
var PORT = process.env.PORT || 3000;

var server=http.createServer(app).listen(PORT,function(){
  console.log("Express server listening on port " + PORT);
});

var io=socketio.listen(server);
var count=0;
var serial=0;
io.sockets.on('connection',function(socket){
  count++;
  var id=++serial;
  socket.broadcast.emit('join',{id:id,count:count});
  socket.emit('join',{id:id,count:count});
  socket.on('message',function(data){
    socket.broadcast.emit('message',{id:id,message:data});
  });
  socket.on('disconnect',function(){
    count--;
    socket.broadcast.emit('leave',{id:id,count:count});
  });
});

app.get('/',function(req,res){
  res.sendfile('index.html');
});

