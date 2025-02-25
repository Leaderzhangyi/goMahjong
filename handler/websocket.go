package handler

import (
	"encoding/json"
	"goMahjong/config"
	"goMahjong/model"
	"goMahjong/service"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // 允许所有跨域请求
	},
}

// HandleWebSocket 处理WebSocket连接
func HandleWebSocket(c *gin.Context, gameManager *service.GameManager) {
	logger := config.GetZapLogger()
	roomID := c.Param("roomID")
	playerID := c.Query("playerID")

	if roomID == "" || playerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少必要参数"})
		return
	}

	room := gameManager.GetRoom(roomID)
	if room == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "房间不存在"})
		return
	}

	player := room.GetPlayer(playerID)
	if player == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "玩家不存在"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		logger.Error("WebSocket升级失败: " + err.Error())
		return
	}

	// 将连接保存到玩家对象
	player.Conn = conn
	logger.Info("玩家 " + player.Name + " 已连接到房间 " + roomID)

	// 发送房间信息给新连接的玩家
	roomInfo := room.GetRoomInfo()
	player.SendMessage(model.Message{
		Type: "room_info",
		Data: roomInfo,
	})

	// 通知房间其他玩家有新玩家加入
	room.BroadcastExcept(model.Message{
		Type: "player_joined",
		Data: map[string]interface{}{
			"player": player.GetPublicInfo(),
		},
	}, player.ID)

	// 处理来自客户端的消息
	go handlePlayerMessages(player, room, gameManager)
}

// 处理来自玩家的消息
func handlePlayerMessages(player *model.Player, room *model.Room, gameManager *service.GameManager) {
	logger := config.GetZapLogger()
	defer func() {
		if r := recover(); r != nil {
			logger.Error("处理玩家消息时发生错误")
		}
	}()

	for {
		_, msg, err := player.Conn.ReadMessage()
		if err != nil {
			logger.Info("玩家断开连接: " + player.Name)
			room.RemovePlayer(player.ID)
			room.BroadcastAll(model.Message{
				Type: "player_left",
				Data: map[string]interface{}{
					"playerID": player.ID,
				},
			})

			// 如果房间没有玩家了，删除房间
			if len(room.Players) == 0 {
				gameManager.RemoveRoom(room.ID)
			} else if room.Owner.ID == player.ID && len(room.Players) > 0 {
				// 如果房主离开，选择新房主
				newOwner := room.Players[0]
				room.SetOwner(newOwner)
				room.BroadcastAll(model.Message{
					Type: "new_owner",
					Data: map[string]interface{}{
						"ownerID": newOwner.ID,
					},
				})
			}
			break
		}

		var message model.Message
		if err := json.Unmarshal(msg, &message); err != nil {
			logger.Error("解析消息失败: " + err.Error())
			continue
		}

		// 根据消息类型处理不同的游戏逻辑
		switch message.Type {
		case "chat":
			// 处理聊天消息
			if content, ok := message.Data.(map[string]interface{})["content"].(string); ok {
				room.BroadcastAll(model.Message{
					Type: "chat",
					Data: map[string]interface{}{
						"playerID":   player.ID,
						"playerName": player.Name,
						"content":    content,
					},
				})
			}
		case "game_start":
			// 只有房主可以开始游戏
			if player.ID == room.Owner.ID {
				if room.GameState == model.GameStateWaiting && len(room.Players) >= 2 {
					room.StartGame()
					room.BroadcastAll(model.Message{
						Type: "game_started",
						Data: room.GetGameState(),
					})
				}
			}
		case "play_tile":
			// 处理出牌
			if data, ok := message.Data.(map[string]interface{}); ok {
				if tileStr, ok := data["tile"].(string); ok {
					room.HandlePlayTile(player.ID, tileStr)
				}
			}
		case "action":
			// 处理玩家动作（吃、碰、杠、胡）
			if data, ok := message.Data.(map[string]interface{}); ok {
				actionType, _ := data["action"].(string)
				tiles, _ := data["tiles"].([]interface{})
				room.HandlePlayerAction(player.ID, actionType, tiles)
			}
		}
	}
}
