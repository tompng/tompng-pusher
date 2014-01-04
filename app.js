var http=require('http');
var express=require('express');
var socketio=require('socket.io');
var crypto=require('crypto');
var app=express();
var PORT = process.env.PORT || 4545;

function sha2(str){
  return crypto.createHash('sha256').update(str).digest('hex');
}
app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));
var server=http.createServer(app).listen(PORT);

var io=socketio.listen(server);
var groups={};
io.sockets.on('connection',function(socket){
  var keys=null;
  socket.on('init',function(data){
    if(keys)return;
    keys=data;
    for(var i=0;i<keys.length;i++){
      var key='#'+keys[i];
      if(!groups[key])groups[key]=[];
      groups[key].push(socket);
    }
  });
  socket.on('disconnect',function(){
    for(var i=0;i<keys.length;i++){
      var key='#'+keys[i];
      var clients=groups[key];
      var idx=clients.indexOf(socket);
      if(idx>=0)clients.splice(idx,1);
    }
  });
});

app.get('/',function(req,res){
  res.sendfile('index.html');
});
var lastdata=0;
app.post('/',function(req,res){
  lastdata++;
  var keys=JSON.parse(req.body.keys);
  var data=JSON.parse(req.body.data);
  for(var i=0;i<keys.length;i++){
    var clients=groups['#'+sha2(keys[i])];
    if(!clients)continue;
    for(var j=0;j<clients.length;j++){
      var client=clients[j];
      if(client.lastdata==lastdata)continue;
      client.emit('data',data);
      client.lastdata=lastdata;
    }
  }
  console.log(req.body)
  res.end();
});

process.on('uncaughtException',function(err){
  console.log('Caught exception:',err);
});
