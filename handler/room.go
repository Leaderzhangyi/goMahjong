package handler

import (
	"goMahjong/model"
	"goMahjong/service"
	"net/http"

	"github.com/gin-gonic/gin"
)

// CreateRoomAPIHandler 处理创建房间API请求
func CreateRoomAPIHandler(gameManager *service.GameManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			PlayerName string `json:"playerName" binding:"required"`
			Password   string `json:"password"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
			return
		}

		room, err := gameManager.CreateRoom(req.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "创建房间失败"})
			return
		}

		player := model.NewPlayer(req.PlayerName)
		room.AddPlayer(player)
		room.SetOwner(player)

		c.JSON(http.StatusOK, gin.H{
			"roomID":   room.ID,
			"playerID": player.ID,
		})
	}
}

// JoinRoomAPIHandler 处理加入房间API请求
func JoinRoomAPIHandler(gameManager *service.GameManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			RoomID     string `json:"roomID" binding:"required"`
			PlayerName string `json:"playerName" binding:"required"`
			Password   string `json:"password"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
			return
		}

		room := gameManager.GetRoom(req.RoomID)
		if room == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "房间不存在"})
			return
		}

		if room.Password != req.Password {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "密码错误"})
			return
		}

		if len(room.Players) >= 4 {
			c.JSON(http.StatusForbidden, gin.H{"error": "房间已满"})
			return
		}

		player := model.NewPlayer(req.PlayerName)
		room.AddPlayer(player)

		c.JSON(http.StatusOK, gin.H{
			"roomID":   room.ID,
			"playerID": player.ID,
		})
	}
}

// GetRoomsHandler 获取所有房间列表
func GetRoomsHandler(gameManager *service.GameManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		rooms := gameManager.GetAllRooms()

		// 转换为前端需要的格式
		roomsData := make([]gin.H, 0, len(rooms))
		for _, room := range rooms {
			roomData := gin.H{
				"id":          room.ID,
				"playerCount": len(room.Players),
				"gameState":   room.GameState,
				"hasPassword": room.Password != "",
			}

			// 添加房主信息
			if room.Owner != nil {
				roomData["owner"] = gin.H{
					"id":   room.Owner.ID,
					"name": room.Owner.Name,
				}
			}

			roomsData = append(roomsData, roomData)
		}

		c.JSON(http.StatusOK, gin.H{
			"rooms": roomsData,
		})
	}
}
