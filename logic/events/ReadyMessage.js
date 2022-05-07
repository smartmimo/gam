module.exports = function ReadyMessage(payload){
    const {socket, data} = payload;
    socket.player = data;
    socket.sendMessage("MapDataRequestMessage", {id: data.mapId})
}