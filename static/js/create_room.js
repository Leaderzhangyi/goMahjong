// 创建房间页面的JavaScript
function createRoom() {
    const playerName = document.getElementById('playerName').value.trim();
    const password = document.getElementById('password').value;
    
    if (!playerName) {
        alert('请输入您的名字');
        return;
    }
    
    // 发送创建房间请求
    fetch('/api/room/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            playerName: playerName,
            password: password
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('创建房间失败');
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
        alert('创建房间失败: ' + error.message);
    });
} 