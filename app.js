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
  var key_versions=null;
  var leavers=[];
  socket.on('init',function(data){
    if(key_versions)return;
    key_versions=data;
    for(var i=0;i<key_versions.length;i++){
      var gid='#'+key_versions[i][0];
      var version=key_versions[i][1];
      var group=groups[gid];
      if(!group)group=groups[gid]=new Group(gid,groups);
      leavers.push(group.join(function(data){socket.emit('data',data);},version));
    }
  });
  socket.on('disconnect',function(){
    for(var i=0;i<leavers.length;i++){
      leavers[i]();
    }
  });
});

var lastdata=0;
app.post('/',function(req,res){
  lastdata++;
  var keys=JSON.parse(req.body.keys);
  var data=JSON.parse(req.body.data);
  for(var i=0;i<keys.length;i++){
    var gid='#'+sha2(keys[i][0]);
    var version=keys[i][1];
    var group=groups[gid];
    if(!group)group=groups[gid]=new Group(gid,groups);
    group.send(data,version);
  }
  res.end();
});

process.on('uncaughtException',function(err){
  console.log('Caught exception:',err.stack);
});

Group.TIMEOUT=30*1000;
function Group(groupID,groupHash){
  this.groupID=groupID;
  this.groupHash=groupHash;
  this.listeners=[];
  this.buffer=[];
  var self=this;
  this.bufferTimeout=function(){
    self.buffer.shift();
    self.checkDestroy();
    if(self.buffer.length>0)self.setBufferTimer();
  }
}
Group.prototype.join=function(dataCallback,version){
  var self=this;
  var node={callback:dataCallback,index:this.listeners.length};
  this.listeners[node.index]=node;
  var startFrom=0;
  if(version){
    for(var i=this.buffer.length-1;i>=0;i--){
      if(this.buffer[i].version==version){
        startFrom=i+1;
        break;
      }
    }
  }
  for(var i=startFrom;i<this.buffer.length;i++){
    dataCallback(this.buffer[i].data);
  }
  var self=this;
  return function(){
    var last=self.listeners[self.listeners.length-1];
    self.listeners[node.index]=last;
    last.index=node.index;
    self.listeners.pop();
    self.checkDestroy();
  }
}
Group.prototype.checkDestroy=function(){
  if(this.listeners.length==0&&this.buffer.length==0){
    delete this.groupHash[this.groupID];
  }
}
Group.prototype.send=function(data,version){
  this.buffer.push({data:data,version:version,time:new Date()});
  for(var i=0;i<this.listeners.length;i++){
    this.listeners[i].callback(data);
  }
  if(this.buffer.length==1){
    this.setBufferTimer();
  }
}
Group.prototype.setBufferTimer=function(){
  var passed=new Date()-this.buffer[0].time;
  setTimeout(this.bufferTimeout,Group.TIMEOUT-passed);
}
