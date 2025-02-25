// 加入房间页面的JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 检查URL参数中是否有房间ID
    const urlParams = new URLSearchParams(window.location.search);
    const roomID = urlParams.get('room');
    
    if (roomID) {
        // 如果URL中有房间ID，自动填充
        document.getElementById('roomID').value = roomID;
    }
});

function joinRoom() {
    const playerName = document.getElementById('playerName').value.trim();
    const roomID = document.getElementById('roomID').value.trim();
    const password = document.getElementById('password').value;
    
    if (!playerName) {
        alert('请输入您的名字');
        return;
    }
    
    if (!roomID) {
        alert('请输入房间号');
        return;
    }
    
    // 发送加入房间请求
    fetch('/api/room/join', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            playerName: playerName,
            roomID: roomID,
            password: password
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || '加入房间失败');
            });
        }
        return response.json();
    })
    .then(data => {
        // 保存玩家ID到本地存储
        localStorage.setItem('playerID', data.playerID);
        
        // 跳转到房间页面
        window.location.href = `/room/${data.roomID}`;
    })
    .catch(error => {
        console.error('Error:', error);
        alert(error.message);
    });
} 