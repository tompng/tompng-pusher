var Pusher={};
(function(){
  function post(hash,cb){
    var http=new XMLHttpRequest();
    http.open('POST','http://'+PUSHER_ENDPOINT+'/',true);
    http.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
    var data=[];
    for(var i in hash)data.push(i+'='+encodeURIComponent(JSON.stringify(hash[i])));
    http.send(data.join('&'));
    http.onreadystatechange=function(){
      if(http.readyState==4&&cb)cb(http.responseText,http.status==200);
    }
  }
  Pusher.init=function(key){
    this.key=key;
    post({key:key},function(recvKey,success){
      if(!success){
        if(Pusher.onerror)Pusher.onerror();
        return;
      }
      var socket=io.connect('http://'+PUSHER_ENDPOINT+'/');
      socket.on('connect',function(){
        socket.emit('init',[recvKey]);
      });
      socket.on('started',function(){
        if(Pusher.onconnect)Pusher.onconnect();
      })
      socket.on('data',function(obj){
        if(Pusher.ondata)Pusher.ondata(obj.data);
      });
    });
  }
  Pusher.send=function(data){
    if(!this.key)throw 'pushr not initialized';
    post({keys:[this.key],data:data});
  }
}());
