var pander = function() {   
}

pander.prototype._addCheckString = function(key,URI,checkString) {
    if (!checkString) return URI
    var prefix = '?'
    if (URI.indexOf('?')!= -1) prefix = '&'
    return URI + prefix + key + '=' + checkString
}

pander.prototype._addCallback =function(URI,callback){
    if (!callback) return URI
    return URI.replace('%CALLBACK%',callback)
}

pander.prototype._getCheckString = function(key) {
    var value = localStorage.getItem(key)
    value = JSON.parse(value)
    if (!value || !value['checkString']) return null
    return value['checkString']
}

pander.prototype._getResource = function (key, URI,checkString, callback){
    if (!URI) return this._addCheckString(key, URI, checkString);
    URI = this._addCallback(URI,callback)
    return this._addCheckString(key, URI.replace('%KEY%',key), checkString);
}

pander.prototype._localGet = function(key) {
    var value = localStorage.getItem(key)
    if (typeof(value)=='string') return JSON.parse(value)['data']
    if (value) return value['data']
    return null
}

pander.prototype._localSet = function (key, URI, responseText) {
    var value = JSON.parse(responseText)[key]
    var data = value['data']
    var checkString = value['checkString']
    var toSave = {URI:URI,data:data, key:key, type:'xhr'}
    if (checkString) toSave['checkString']=checkString
    localStorage.setItem(key,JSON.stringify(toSave))
}

pander.prototype._localSetApi = function(key, URI,responseText){
    var value=JSON.stringify({'key':key,'URI':URI,'data':responseText, type:'api'})
    localStorage.setItem(key, value)
}

pander.prototype._remoteGet = function(key, URI, callback, failback,checkString) {
    var resource = this._getResource(key,URI,checkString)
    var xhr = new XMLHttpRequest()
    xhr.open('GET',resource,true)
    xhr.send()
    var that = this
    xhr.onreadystatechange=function(){
        if (xhr.readyState==4){
            if(xhr.status=='304' && checkString) {
                //donothing
            }else if (xhr.status=='200' || xhr.status=='304') {
                that._localSet(key, URI, xhr.responseText)
                if (callback) callback(that._localGet(key))
            } else if (failback) failback(xhr.responseText)
        }
    }
}

pander.prototype._apiGet = function(key,URI,callback) {
    var cbName = key
    var resource = this._getResource(key,URI,null,'pander.'+cbName)
    var that=this
    pander[cbName] = function(obj) {
        that._localSetApi(key, resource, obj)
        callback(obj)
        delete pander[cbName]
    }
    document.write('<script async src="' + resource + '"><\/script>') //OMG!! document.write()!!
}

pander.prototype.get = function(key, URI, callback, failback) {
    var localValue = this._localGet(key) //predefine to prevent race conditions
    if (localValue) {
        setTimeout(function(){callback(localValue)},15) //pretend to be Async
    } else {
        this._remoteGet(key,URI,callback,failback)
    }
}

pander.prototype.invalidate = function(key) {
    if (typeof(key)=='string') {
        localStorage.removeItem(key)
    } else {
        for (var i=0; i<key.length;i++){
            localStorage.removeItem(key[i])
        }
    } 
}

pander.prototype._getType = function(key) {
    var value = localStorage.getItem(key)
    if (!value) return null
    value = JSON.parse(value)
    return value['type']
}

pander.prototype._xhrUpdate = function(key,URI,callback,failback){
    var checkString = this._getCheckString(key)
    if (checkString){
        this._remoteGet(key,URI,callback,failback,checkString)
    } else {
        this._remoteGet(key,URI,callback,failback)
    }
}

pander.prototype._apiUpdate = function (key, URI, callback) {
    var cbName = key
    var resource = this._getResource(key,URI,null,'pander.'+cbName)
    var that=this
    pander[cbName] = function(obj) {
        if (that._localGet(key) == obj) return;
        that._localSetApi(key, resource, obj)
        callback(obj)
        delete pander[cbName]
    }
    document.write('<script async src="' + resource + '"><\/script>') //bad I know
}

pander.prototype.update = function(key, URI, callback, failback){
    var type = this._getType(key)
    if (type=='api'){
        this._apiUpdate(key,URI,callback)
    } else {this._xhrUpdate(key,URI,callback,failback)}
        
}

pander.prototype.getLocal = function(key){
    return this._localGet(key)
}

pander.prototype.getLocalKeys = function() {
    var keys = []
    var length = localStorage.length
    for (var i=0; i<length; i++){
        keys.push(localStorage.key(i))
    }
    return keys
}

pander.prototype.api = function(key, URI, callback) {
    var localValue = this._localGet(key)
    if (localValue) {
        setTimeout(function(){callback(localValue)},15) //pretend to be Async
    } else {
        this._apiGet(key,URI,callback)
    }
}