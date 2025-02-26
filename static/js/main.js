// 主页面的JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('麻将游戏主页面已加载');
    
    // 加载房间列表
    loadRoomList();
    
    // 每15秒刷新一次房间列表
    setInterval(loadRoomList, 15000);
});

// 加载房间列表
function loadRoomList() {
    fetch('/api/rooms')
        .then(response => response.json())
        .then(data => {
            const roomList = document.getElementById('roomList');
            
            // 清空现有内容
            roomList.innerHTML = '';
            console.log("当前房间为:"+data.rooms)
            if (data.rooms && data.rooms.length > 0) {
                // 显示房间列表
                data.rooms.forEach(room => {
                    const roomCard = document.createElement('div');
                    roomCard.className = 'room-card';
                    roomCard.onclick = function() {
                        joinRoom(room.id);
                    };
                    
                    const statusClass = room.gameState === 'waiting' ? 'status-waiting' : 'status-playing';
                    const statusText = room.gameState === 'waiting' ? '等待中' : '游戏中';
                    
                    roomCard.innerHTML = `
                        <div class="room-id">房间号: ${room.id}</div>
                        <div class="room-info">
                            <div class="room-players">玩家: ${room.playerCount}/4</div>
                            <div class="room-status ${statusClass}">${statusText}</div>
                        </div>
                        <div class="room-owner">房主: ${room.owner.name}</div>
                        <button class="room-join-btn">加入房间</button>
                    `;
                    
                    roomList.appendChild(roomCard);
                });
            } else {
                // 显示无房间信息
                roomList.innerHTML = '<div class="no-rooms">当前没有活跃的房间，请创建一个新房间</div>';
            }
        })
        .catch(error => {
            console.error('加载房间列表失败:', error);
            document.getElementById('roomList').innerHTML = '<div class="no-rooms">加载房间列表失败，请刷新页面重试</div>';
        });
}
 
// 加入房间
function joinRoom(roomID) {
    // 跳转到加入房间页面，并传递房间ID
    window.location.href = `/join?room=${roomID}`;
} 