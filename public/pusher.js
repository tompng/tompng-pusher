(function(){
  if(!window.io){
    setTimeout(arguments.callee,100);
    return;
  }
  var socket=io.connect('http://'+PUSHER_ENDPOINT+'/');
  socket.on('connect',function(){
    socket.emit('init',PUSHER_GROUPS);
  });
  socket.on('data',function(obj){
    if(window.onpusherdata)onpusherdata(obj.data,obj.version);
  });
}())