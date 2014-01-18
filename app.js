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
      leavers.push(group.join(function(data,version){socket.emit('data',{data:data,version:version});},version));
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
    console.log('key',keys[i][0])
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
  console.log('group gen',groupID)
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
  for(var i=0;i<this.buffer.length;i++){
    var obj=this.buffer[i];
    if(version&&obj.version<=version)continue;
    dataCallback(obj.data,obj.version);
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
    console.log('group destroy',this.groupID)
  }
}
Group.prototype.send=function(data,version){
  this.buffer.push({data:data,version:version,time:new Date()});
  for(var i=0;i<this.listeners.length;i++){
    this.listeners[i].callback(data,version);
  }
  if(this.buffer.length==1){
    this.setBufferTimer();
  }
}
Group.prototype.setBufferTimer=function(){
  var passed=new Date()-this.buffer[0].time;
  setTimeout(this.bufferTimeout,Group.TIMEOUT-passed);
}
