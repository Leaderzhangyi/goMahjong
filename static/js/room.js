// 房间页面的JavaScript
let socket;
let myTiles = [];
let selectedTileIndex = -1;
let isMyTurn = false;
let gameState = 'waiting';
let players = []; // 存储所有玩家信息
let myInfo = null; // 存储自己的信息

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 连接WebSocket
    connectWebSocket();
    
    // 设置聊天输入框的回车事件
    document.getElementById('chatInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChat();
        }
    });
    
    // 设置开始游戏按钮事件
    document.getElementById('startGameBtn').addEventListener('click', function() {
        // 检查玩家数量
        if (players.length < 4) {
            alert('人数不足，需要4人才能开始游戏');
            return;
        }
        startGame();
    });
    
    // 设置邀请按钮事件
    document.querySelectorAll('.invite-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // 生成邀请链接
            const inviteLink = `${window.location.origin}/join?room=${roomID}`;
            
            // 复制到剪贴板
            navigator.clipboard.writeText(inviteLink).then(() => {
                alert('邀请链接已复制到剪贴板：' + inviteLink);
            }).catch(err => {
                alert('邀请链接：' + inviteLink);
            });
        });
    });


    // 监听页面关闭事件
    window.addEventListener('beforeunload', function(e) {
        e.preventDefault();
        userConfirmedLeave();
    });

  
});

function exitGame(){
    if (confirm('确定退出游戏吗？')) {
        userConfirmedLeave();
        window.location.href = '/';
    }
}

function userConfirmedLeave() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        const msg = JSON.stringify({
            type: 'leave_room',
            data: {}
        });
        socket.send(msg);
        socket.close();
    }
}

// 连接WebSocket
function connectWebSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/${roomID}?playerID=${playerID}`;
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = function() {
        console.log('WebSocket连接已建立');
        addChatMessage('系统', '已连接到游戏服务器');
    };
    // 这行代码是一个 WebSocket 客户端 的事件处理程序，用于接收来自 WebSocket 服务器发送的消息。。
    socket.onmessage = function(event) {
        const message = JSON.parse(event.data);
        handleMessage(message);
    };
    
    socket.onclose = function() {
        console.log('WebSocket连接已关闭');
        addChatMessage('系统', '与游戏服务器的连接已断开');
        
        // 尝试重新连接
        setTimeout(connectWebSocket, 3000);
    };
    
    socket.onerror = function(error) {
        console.error('WebSocket错误:', error);
        addChatMessage('系统', '连接错误，请刷新页面重试');
    };
}

// 发送消息到服务器
function sendMessage(type, data) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: type,
            data: data
        }));
    } else {
        console.error('WebSocket未连接');
        addChatMessage('系统', '连接已断开，无法发送消息');
    }
}

// 处理收到的消息
function handleMessage(message) {
    console.log('收到消息:', message);
    
    switch (message.type) {
        case 'room_info':
            handleRoomInfo(message.data);
            break;
        case 'player_joined':
            handlePlayerJoined(message.data);
            break;
        case 'player_left':
            handlePlayerLeft(message.data);
            break;
        case 'new_owner':
            handleNewOwner(message.data);
            break;
        case 'chat':
            handleChat(message.data);
            break;
        case 'game_started':
            handleGameStarted(message.data);
            break;
        case 'tile_played':
            handleTilePlayed(message.data);
            break;
        case 'new_tile':
            handleNewTile(message.data);
            break;
        case 'turn_changed':
            handleTurnChanged(message.data);
            break;
        case 'action_required':
            handleActionRequired(message.data);
            break;
        case 'game_over':
            handleGameOver(message.data);
            break;
        default:
            console.log('未知消息类型:', message.type);
    }
}

// 处理房间信息
function handleRoomInfo(data) {
    console.log('收到房间信息:', data); // 添加调试日志
    
    // 保存房间信息
    players = data.players || [];
    gameState = data.gameState || 'waiting';
    const owner = data.owner; // 获取房主信息
    
    console.log('房主信息:', owner); // 添加调试日志
    console.log('当前玩家:', playerID); // 添加调试日志
    
    // 找到自己的信息
    myInfo = players.find(p => p.id === playerID);
    
    // 更新游戏状态
    document.getElementById('gameStatus').textContent = getGameStateText(gameState);
    
    // 更新玩家列表
    updatePlayerList(players, owner);
    
    // 更新麻将桌上的玩家位置
    updateTablePlayers();
    
    // 如果是房主，显示开始游戏按钮
    if (owner && owner.id === playerID && gameState === 'waiting') {
        document.getElementById('startGameBtn').style.display = 'block';
    }
    
    // 如果游戏已经开始，显示操作按钮
    if (gameState === 'playing') {
        document.getElementById('actionButtons').style.display = 'flex';
        
        // 更新我的手牌
        if (myInfo && myInfo.tiles) {
            myTiles = myInfo.tiles;
            renderMyTiles();
        }
    }
    
    // 添加系统消息
    addChatMessage('系统', '已加入房间');
}

// 处理玩家加入
function handlePlayerJoined(data) {
    console.log("玩家加入:", data);
    const player = data.player;
    
    // 检查玩家是否已经在列表中
    const existingPlayerIndex = players.findIndex(p => p.id === player.id);
    if (existingPlayerIndex === -1) {
        // 添加新玩家
        players.push(player);
        
        // 更新玩家列表
        updatePlayerList(players, myInfo);
        
        // 更新麻将桌上的玩家位置
        updateTablePlayers();
        
        // 添加系统消息
        addChatMessage('系统', `${player.name} 加入了房间`);
    }
}

// 处理玩家离开
function handlePlayerLeft(data) {
    const playerID = data.playerID;
    
    // 找到离开的玩家
    const playerIndex = players.findIndex(p => p.id === playerID);
    if (playerIndex !== -1) {
        const playerName = players[playerIndex].name;
        
        // 移除玩家
        players.splice(playerIndex, 1);
        
        // 更新玩家列表
        updatePlayerList(players, myInfo);
        
        // 更新麻将桌上的玩家位置
        updateTablePlayers();
        
        // 添加系统消息
        addChatMessage('系统', `${playerName} 离开了房间`);
    }
}

// 处理新房主
function handleNewOwner(data) {
    const ownerID = data.ownerID;
    
    // 更新玩家的房主状态
    players.forEach(p => {
        p.isOwner = p.id === ownerID;
    });
    
    // 更新玩家列表
    updatePlayerList(players, myInfo);
    
    // 如果自己是新房主，显示开始游戏按钮
    if (ownerID === playerID && gameState === 'waiting') {
        document.getElementById('startGameBtn').style.display = 'block';
    } else {
        document.getElementById('startGameBtn').style.display = 'none';
    }
    
    // 添加系统消息
    const ownerName = players.find(p => p.id === ownerID)?.name || '未知玩家';
    addChatMessage('系统', `${ownerName} 成为了新房主`);
}

// 处理聊天消息
function handleChat(data) {
    const playerID = data.playerID;
    const playerName = data.playerName;
    const content = data.content;
    
    // 添加聊天消息
    addChatMessage(playerName, content);
}

// 添加聊天消息
function addChatMessage(sender, content) {
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    
    messageElement.className = 'chat-message';
    if (sender === '系统') {
        messageElement.className += ' system';
    } else {
        messageElement.className += ' player';
    }
    
    messageElement.innerHTML = `<strong>${sender}:</strong> ${content.replace(/\n/g, '<br>')}`;
    chatMessages.appendChild(messageElement);
    
    // 滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 发送聊天消息
function sendChat() {
    const chatInput = document.getElementById('chatInput');
    const content = chatInput.value.trim();
    
    if (content) {
        sendMessage('chat', { content: content });
        chatInput.value = '';
    }
}

// 更新玩家列表
function updatePlayerList(players, owner) {
    console.log('更新玩家列表:', players, owner); // 添加调试日志
    
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';
    
    players.forEach(player => {
        const li = document.createElement('li');
        
        // 如果是自己，只显示名字和"(我)"标识
        if (player.id === playerID) {
            li.innerHTML = `${player.name} (我) 
             ${owner && player.id === owner.id ? '<span class="owner-tag">房主</span>' : ''}`;
        } else {
            // 如果是其他玩家，且是房主，显示房主标签
            li.innerHTML = `
                ${player.name}
                ${owner && player.id === owner.id ? '<span class="owner-tag">房主</span>' : ''}
            `;
        }
        
        playerList.appendChild(li);
    });
}

// 更新麻将桌上的玩家位置
function updateTablePlayers() {
    console.log("更新麻将桌玩家，当前玩家数:", players.length);
    
    // 清空所有位置
    const positions = ['top', 'left', 'right'];
    positions.forEach(pos => {
        const element = document.getElementById(`${pos}Player`);
        const nameElement = element.querySelector('.player-name');
        const inviteBtn = element.querySelector('.invite-btn');
        const tilesElement = element.querySelector('.player-tiles');
        
        nameElement.textContent = '等待加入';
        inviteBtn.style.display = 'block';
        tilesElement.classList.add('hidden');
    });
    
    // 设置自己的位置
    const bottomElement = document.getElementById('bottomPlayer');
    const bottomNameElement = bottomElement.querySelector('.player-name');
    bottomNameElement.textContent = myInfo ? myInfo.name + ' (我)' : '我';
    
    // 获取其他玩家（不包括自己）
    const otherPlayers = players.filter(p => p.id !== playerID);
    console.log("其他玩家:", otherPlayers);
    
    // 根据其他玩家数量分配位置
    if (otherPlayers.length > 0) {
        // 第一个玩家放在上方
        const topElement = document.getElementById('topPlayer');
        const topNameElement = topElement.querySelector('.player-name');
        const topInviteBtn = topElement.querySelector('.invite-btn');
        const topTilesElement = topElement.querySelector('.player-tiles');
        
        topNameElement.textContent = otherPlayers[0].name;
        topInviteBtn.style.display = 'none';
        
        if (gameState === 'playing') {
            topTilesElement.classList.remove('hidden');
            // 显示牌的数量
            const tileCount = topTilesElement.querySelector('.tile-count');
            tileCount.innerHTML = '';
            for (let i = 0; i < (otherPlayers[0].tileCount || 13); i++) {
                const tileBack = document.createElement('div');
                tileBack.className = 'tile-back';
                tileCount.appendChild(tileBack);
            }
        }
    }
    
    if (otherPlayers.length > 1) {
        // 第二个玩家放在右方
        const rightElement = document.getElementById('rightPlayer');
        const rightNameElement = rightElement.querySelector('.player-name');
        const rightInviteBtn = rightElement.querySelector('.invite-btn');
        const rightTilesElement = rightElement.querySelector('.player-tiles');
        
        rightNameElement.textContent = otherPlayers[1].name;
        rightInviteBtn.style.display = 'none';
        
        if (gameState === 'playing') {
            rightTilesElement.classList.remove('hidden');
            // 显示牌的数量
            const tileCount = rightTilesElement.querySelector('.tile-count');
            tileCount.innerHTML = '';
            for (let i = 0; i < (otherPlayers[1].tileCount || 13); i++) {
                const tileBack = document.createElement('div');
                tileBack.className = 'tile-back';
                tileCount.appendChild(tileBack);
            }
        }
    }
    
    if (otherPlayers.length > 2) {
        // 第三个玩家放在左方
        const leftElement = document.getElementById('leftPlayer');
        const leftNameElement = leftElement.querySelector('.player-name');
        const leftInviteBtn = leftElement.querySelector('.invite-btn');
        const leftTilesElement = leftElement.querySelector('.player-tiles');
        
        leftNameElement.textContent = otherPlayers[2].name;
        leftInviteBtn.style.display = 'none';
        
        if (gameState === 'playing') {
            leftTilesElement.classList.remove('hidden');
            // 显示牌的数量
            const tileCount = leftTilesElement.querySelector('.tile-count');
            tileCount.innerHTML = '';
            for (let i = 0; i < (otherPlayers[2].tileCount || 13); i++) {
                const tileBack = document.createElement('div');
                tileBack.className = 'tile-back';
                tileCount.appendChild(tileBack);
            }
        }
    }
    
    // 标记当前回合的玩家
    if (gameState === 'playing') {
        const currentPlayer = players.find(p => p.isCurrentTurn);
        if (currentPlayer) {
            if (currentPlayer.id === playerID) {
                // 是我的回合
                bottomElement.classList.add('current-turn');
            } else {
                // 是其他玩家的回合
                const index = otherPlayers.findIndex(p => p.id === currentPlayer.id);
                if (index === 0) {
                    document.getElementById('topPlayer').classList.add('current-turn');
                } else if (index === 1) {
                    document.getElementById('rightPlayer').classList.add('current-turn');
                } else if (index === 2) {
                    document.getElementById('leftPlayer').classList.add('current-turn');
                }
            }
        }
    }
}

// 渲染我的手牌
function renderMyTiles() {
    const myTilesElement = document.getElementById('myTiles');
    myTilesElement.innerHTML = '';
    
    myTiles.forEach((tile, index) => {
        const tileElement = document.createElement('div');
        tileElement.className = 'tile';
        if (index === selectedTileIndex) {
            tileElement.className += ' selected';
        }
        tileElement.dataset.tile = tile;
        tileElement.dataset.index = index;
        tileElement.textContent = getTileText(tile);
        
        // 添加点击事件
        tileElement.addEventListener('click', function() {
            // 如果是我的回合，可以选择牌
            if (isMyTurn) {
                if (selectedTileIndex === index) {
                    // 取消选择
                    selectedTileIndex = -1;
                } else {
                    // 选择牌
                    selectedTileIndex = index;
                }
                renderMyTiles();
                
                // 更新出牌按钮状态
                document.getElementById('playTileBtn').disabled = selectedTileIndex === -1;
            }
        });
        
        myTilesElement.appendChild(tileElement);
    });
}

// 开始游戏
function startGame() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'start_game',
            data: {}
        }));
    } else {
        console.error('WebSocket未连接');
        alert('连接已断开，无法开始游戏');
    }
}

// 出牌
function playTile() {
    if (isMyTurn && selectedTileIndex !== -1) {
        const tile = myTiles[selectedTileIndex];
        sendMessage('play_tile', { tile: tile });
        
        // 从手牌中移除
        myTiles.splice(selectedTileIndex, 1);
        selectedTileIndex = -1;
        renderMyTiles();
        
        // 禁用出牌按钮
        document.getElementById('playTileBtn').disabled = true;
    }
}

// 执行操作（吃碰杠胡）
function doAction(action, tiles) {
    sendMessage('action', {
        action: action,
        tiles: tiles
    });
}

// 处理游戏开始
function handleGameStarted(data) {
    gameState = 'playing';
    document.getElementById('gameStatus').textContent = '游戏进行中';
    document.getElementById('startGameBtn').style.display = 'none';
    
    // 显示操作按钮
    document.getElementById('actionButtons').style.display = 'flex';
    
    // 设置出牌按钮事件
    document.getElementById('playTileBtn').onclick = playTile;
    
    // 设置操作按钮事件
    document.getElementById('chiBtn').onclick = function() { doAction('chi', []); };
    document.getElementById('pengBtn').onclick = function() { doAction('peng', []); };
    document.getElementById('gangBtn').onclick = function() { doAction('gang', []); };
    document.getElementById('huBtn').onclick = function() { doAction('hu', []); };
    document.getElementById('passBtn').onclick = function() { doAction('pass', []); };
    
    // 更新我的手牌
    if (data.tiles) {
        myTiles = data.tiles;
        renderMyTiles();
    }
    
    // 更新当前玩家
    if (data.currentPlayerID) {
        handleTurnChanged({
            playerID: data.currentPlayerID
        });
    }
    
    // 清空弃牌区
    document.getElementById('discardedTiles').innerHTML = '';
    
    // 更新麻将桌上的玩家位置（显示牌的数量）
    updateTablePlayers();
    
    // 添加系统消息
    addChatMessage('系统', '游戏开始了！');
}

// 处理出牌
function handleTilePlayed(data) {
    const playerID = data.playerID;
    const tile = data.tile;
    
    // 添加到弃牌区
    const discardedTiles = document.getElementById('discardedTiles');
    const tileElement = document.createElement('div');
    tileElement.className = 'tile';
    tileElement.dataset.tile = tile;
    tileElement.textContent = getTileText(tile);
    discardedTiles.appendChild(tileElement);
    
    // 添加系统消息
    const playerName = players.find(p => p.id === playerID)?.name || '玩家';
    addChatMessage('系统', `${playerName} 打出了 ${getTileText(tile)}`);
}

// 处理新抽到的牌
function handleNewTile(data) {
    const tile = data.tile;
    
    // 添加到手牌
    myTiles.push(tile);
    renderMyTiles();
    
    // 添加系统消息
    addChatMessage('系统', `你抽到了 ${getTileText(tile)}`);
}

// 处理轮到谁出牌
function handleTurnChanged(data) {
    const currentPlayerID = data.playerID;
    
    // 更新玩家的当前回合标记
    players.forEach(p => {
        p.isCurrentTurn = p.id === currentPlayerID;
    });
    
    // 更新玩家列表
    updatePlayerList(players, myInfo);
    
    // 更新是否是我的回合
    isMyTurn = currentPlayerID === playerID;
    
    // 更新出牌按钮状态
    document.getElementById('playTileBtn').disabled = !isMyTurn || selectedTileIndex === -1;
    
    // 添加系统消息
    if (isMyTurn) {
        addChatMessage('系统', '轮到你出牌了');
    } else {
        const playerName = players.find(p => p.id === currentPlayerID)?.name || '玩家';
        addChatMessage('系统', `轮到 ${playerName} 出牌`);
    }
}

// 处理需要玩家操作（吃碰杠胡）
function handleActionRequired(data) {
    const actions = data.actions;
    
    // 显示相应的操作按钮
    document.getElementById('chiBtn').style.display = actions.includes('chi') ? 'block' : 'none';
    document.getElementById('pengBtn').style.display = actions.includes('peng') ? 'block' : 'none';
    document.getElementById('gangBtn').style.display = actions.includes('gang') ? 'block' : 'none';
    document.getElementById('huBtn').style.display = actions.includes('hu') ? 'block' : 'none';
    document.getElementById('passBtn').style.display = 'block';
    
    // 添加系统消息
    addChatMessage('系统', '请选择操作');
}

// 处理游戏结束
function handleGameOver(data) {
    gameState = 'finished';
    document.getElementById('gameStatus').textContent = getGameStateText(gameState);
    
    // 隐藏操作按钮
    document.getElementById('actionButtons').style.display = 'none';
    
    // 显示结果
    const winner = data.winner;
    const scores = data.scores;
    
    let resultMessage = '游戏结束！\n';
    if (winner) {
        const winnerName = players.find(p => p.id === winner.id)?.name || '玩家';
        resultMessage += `${winnerName} 胡牌获胜！\n`;
    }
    
    resultMessage += '最终得分：\n';
    for (const playerID in scores) {
        const playerName = players.find(p => p.id === playerID)?.name || '玩家';
        resultMessage += `${playerName}: ${scores[playerID]}分\n`;
    }
    
    // 添加系统消息
    addChatMessage('系统', resultMessage);
    
    // 如果是房主，显示开始新游戏按钮
    const isOwner = players.find(p => p.id === playerID)?.isOwner;
    if (isOwner) {
        document.getElementById('startGameBtn').style.display = 'block';
        document.getElementById('startGameBtn').textContent = '开始新游戏';
    }
}

// 获取游戏状态文本
function getGameStateText(state) {
    switch (state) {
        case 'waiting':
            return '等待开始';
        case 'playing':
            return '游戏进行中';
        case 'finished':
            return '游戏结束';
        default:
            return state;
    }
}

// 获取麻将牌的显示文本
function getTileText(tile) {
    // 简化版，实际应该根据牌的编码显示对应的文字或符号
    return tile;
}

// 创建麻将牌元素
function createTileElement(tile) {
    const tileDiv = document.createElement('div');
    tileDiv.className = 'tile';
    tileDiv.style.backgroundImage = `url('/static/images/${tile}.png')`;
    tileDiv.style.backgroundSize = 'cover';
    tileDiv.setAttribute('data-tile', tile);
    return tileDiv;
} 